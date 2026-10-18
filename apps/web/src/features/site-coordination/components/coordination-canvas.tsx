import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useRef, useState } from "react";
import { Circle, Group, Image as CanvasImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type { CoordinationContractor, CoordinationData, CoordinationInput, CoordinationItem, CoordinationPoint } from "@sts/shared";
import { COORDINATION_MAX, COORDINATION_MIN, coordinationGeometryError } from "@sts/shared";
import { MachineIcon } from "./machine-icon.js";
import type { MapDisplay } from "./map-filters.js";
import AddOutlined from "@mui/icons-material/AddOutlined";
import AddRoadOutlined from "@mui/icons-material/AddRoadOutlined";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import DragIndicatorOutlined from "@mui/icons-material/DragIndicatorOutlined";
import PentagonOutlined from "@mui/icons-material/PentagonOutlined";
import RemoveOutlined from "@mui/icons-material/RemoveOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import UndoOutlined from "@mui/icons-material/UndoOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Popper from "@mui/material/Popper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Konva from "konva";
import { clamp } from "../utils/canvas-geometry.js";
import { nearestBoundaryPoint } from "../utils/canvas-geometry.js";
import { areaDelta } from "../utils/canvas-geometry.js";
import { shiftPoints } from "../utils/canvas-geometry.js";
import { scanContent } from "../utils/canvas-geometry.js";
import { areaCentroid } from "../utils/canvas-geometry.js";
import { routeMidpoint } from "../utils/canvas-geometry.js";
import { RouteMarks } from "./route-marks.js";
import { REPORT_ROOM } from "../utils/canvas-report.js";
import { reportBounds } from "../utils/canvas-report.js";
import { TEXT_LINE_HEIGHT } from "../utils/canvas-text.js";
import { CAPTION_FONT } from "../utils/canvas-text.js";
import { CAPTION_MAX_WIDTH } from "../utils/canvas-text.js";
import { CAPTION_LINE_HEIGHT } from "../utils/canvas-text.js";
import { CAPTION_MAX_LINES } from "../utils/canvas-text.js";
import { NOTE_FONT } from "../utils/canvas-text.js";
import { NOTE_LINE_HEIGHT } from "../utils/canvas-text.js";
import { layoutTextTitle } from "../utils/canvas-text.js";

export type MapTool = "move" | "polygon" | "route";

interface Props {
  map: CoordinationData["map"]; contractors: CoordinationContractor[]; items: CoordinationItem[];
  selectedId: string | null; draft: CoordinationInput | null; draftId?: string; tool: MapTool; compact?: boolean;
  onSelect: (id: string) => void; onChange: (patch: Partial<CoordinationInput>) => void; onFinish: () => void;
  onDeselect: () => void; textEditing: boolean; onEditText: () => void;
  /** Layers the viewer switched off; the selected/edited job always shows everything. */
  display?: Pick<MapDisplay, "areas" | "labels" | "notes" | "links" | "chips">;
  /** Printed report: no grey margin, hints, zoom buttons or dragging; the view frames every job. */
  readOnly?: boolean;
  /** Stage height in px (the report sheet); default follows compact/width. */
  fixedHeight?: number;
  /** Called once the artwork is drawn with the framed stage (null when the image failed). Read-only only. */
  onReady?: (stage: Konva.Stage | null) => void;
  /** Road routes that cross or run along another contractor's route that day (id → other contractor ids). */
  clashes?: ReadonlyMap<string, string[]>;
  /** Road requests of the day (Daily Request): arrows under the jobs, red outline on a clash. */
  /** `arrows`: false for a road picked from the register (no direction), true for a drawn route. */
  roads?: { id: string; points: CoordinationPoint[]; color: string; label: string; alert: boolean; arrows?: boolean }[];
}

const NO_CLASHES: ReadonlyMap<string, string[]> = new Map();

const SHOW_ALL = { areas: true, labels: true, notes: true, links: true, chips: true };

export function CoordinationCanvas({ map, contractors, items, selectedId, draft, draftId, tool, compact, onSelect, onChange, onFinish, onDeselect, textEditing, onEditText, display = SHOW_ALL, readOnly = false, fixedHeight, onReady, clashes = NO_CLASHES, roads = [] }: Props) {
  const theme = useTheme();
  // Point-by-point drawing: a free-shape area (closed) or a road route (open line).
  const drawingTool = tool === "polygon" || tool === "route";
  const drawType = tool === "route" ? "polyline" : "polygon";
  const minPoints = tool === "route" ? 2 : 3;
  const container = useRef<HTMLDivElement>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const stage = useRef<Konva.Stage>(null);
  const rectangle = useRef<Konva.Rect>(null);
  const transformer = useRef<Konva.Transformer>(null);
  const [width, setWidth] = useState(800);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [areaDrag, setAreaDrag] = useState<{ id: string; x: number; y: number; source: "line" | "chip" } | null>(null);
  const pointerMoved = useRef(false);
  const areaDragStart = useRef<CoordinationPoint[] | null>(null);
  const areaDragNodeStart = useRef<{ x: number; y: number } | null>(null);
  const textDrag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [hover, setHover] = useState<CoordinationPoint | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageError, setImageError] = useState(false);
  const height = fixedHeight ?? (compact ? 390 : width < 600 ? 430 : 620);
  const fit = Math.min(width / map.width, height / map.height);
  const scale = fit * zoom;
  const offset = { x: (width - map.width * fit) / 2 + pan.x, y: (height - map.height * fit) / 2 + pan.y };
  const contentBounds = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  // Default view = the drawing content (plus a small padding), not the whole
  // artwork with its empty margins. Also used by the "พอดีผัง" reset button.
  const frameContent = () => {
    const w = container.current?.clientWidth ?? width;
    const h = fixedHeight ?? (compact ? 390 : w < 600 ? 430 : 620);
    const fitNow = Math.min(w / map.width, h / map.height);
    const bounds = readOnly ? reportBounds(contentBounds.current, items, map) : contentBounds.current;
    if (!bounds) { setZoom(1); setPan({ x: 0, y: 0 }); return; }
    const padding = 0.04;
    const desired = Math.min(w / (bounds.w * (1 + padding * 2)), h / (bounds.h * (1 + padding * 2)));
    // Report: the room around the drawing is in screen px (labels do not scale with the zoom).
    const reportZoom = Math.min((w - REPORT_ROOM.left - REPORT_ROOM.right) / (bounds.w * fitNow), (h - REPORT_ROOM.top - REPORT_ROOM.bottom) / (bounds.h * fitNow));
    const nextZoom = readOnly ? Math.max(0.05, Math.min(6, reportZoom)) : Math.max(1, Math.min(6, desired / fitNow));
    const nextScale = fitNow * nextZoom;
    // The room is uneven, so the drawing is centred inside it rather than inside the frame.
    const centreX = readOnly ? w / 2 + (REPORT_ROOM.left - REPORT_ROOM.right) / 2 : w / 2;
    const centreY = readOnly ? h / 2 + (REPORT_ROOM.top - REPORT_ROOM.bottom) / 2 : h / 2;
    setZoom(nextZoom);
    setPan({
      x: centreX - (bounds.x + bounds.w / 2) * nextScale - (w - map.width * fitNow) / 2,
      y: centreY - (bounds.y + bounds.h / 2) * nextScale - (h - map.height * fitNow) / 2,
    });
  };
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    setWidth(el.clientWidth); observer.observe(el); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false;
    setImage(null); setImageError(false); setPan({ x: 0, y: 0 }); setZoom(1);
    const source = new window.Image();
    source.onload = () => {
      if (cancelled) return;
      contentBounds.current = scanContent(source);
      setImage(source);
      frameContent();
    };
    source.onerror = () => { if (!cancelled) setImageError(true); };
    source.src = map.imagePath;
    return () => { cancelled = true; };
  }, [map.imagePath]);
  // Report: hand the framed stage over once the artwork is drawn (the page snapshots it for printing).
  const reported = useRef(false);
  useEffect(() => {
    if (!readOnly || reported.current || (!image && !imageError)) return;
    reported.current = true;
    onReady?.(imageError ? null : stage.current);
  }, [readOnly, image, imageError]);
  useEffect(() => {
    if (transformer.current && rectangle.current) transformer.current.nodes([rectangle.current]);
  }, [draft?.areaKind, draft?.geometry, tool]);
  useEffect(() => {
    if (!drawingTool || !draft) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA"].includes(t.tagName)) return;
      const pts = draft.geometry.points;
      if (e.key === "Enter" && pts.length >= minPoints && !coordinationGeometryError(draft.geometry)) { e.preventDefault(); onFinish(); }
      else if (e.key === "Backspace" && pts.length) { e.preventDefault(); onChange({ geometry: { type: drawType, points: pts.slice(0, -1) } }); }
      else if (e.key === "Escape") { e.preventDefault(); onFinish(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, draft, onChange, onFinish]);
  useEffect(() => { if (!drawingTool) setHover(null); }, [drawingTool]);
  const point = (allowClamp = false) => {
    const node = stage.current, pointer = node?.getPointerPosition();
    if (!node || !pointer) return null;
    const p = node.getAbsoluteTransform().copy().invert().point(pointer);
    if (!allowClamp && (p.x < COORDINATION_MIN * map.width || p.y < COORDINATION_MIN * map.height || p.x > COORDINATION_MAX * map.width || p.y > COORDINATION_MAX * map.height)) return null;
    return { x: clamp(p.x / map.width), y: clamp(p.y / map.height) };
  };
  const click = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (pointerMoved.current) return;
    // While drawing, a tap on top of another job (e.g. a route already on that road) still places a
    // point; only the draft's own vertices stop the tap (they cancel bubbling).
    if (!drawingTool && e.target !== stage.current) return;
    if (tool === "polygon") {
      const p = point(); if (!draft || !p) return;
      onChange({ areaKind: "polygon", geometry: { type: "polygon", points: [...draft.geometry.points, p] } });
      return;
    }
    if (tool === "route") {
      const p = point(); if (!draft || !p) return;
      onChange({ areaKind: "route", geometry: { type: "polyline", points: [...draft.geometry.points, p] } });
      return;
    }
    if (tool === "move") onDeselect();
  };
  const rectangleChange = () => {
    const node = rectangle.current; if (!node || !draft) return;
    const transform = node.getTransform().copy();
    const corners = [{ x: 0, y: 0 }, { x: node.width(), y: 0 }, { x: node.width(), y: node.height() }, { x: 0, y: node.height() }];
    const points = corners.map((p) => { const v = transform.point(p); return { x: v.x / map.width, y: v.y / map.height }; });
    node.scale({ x: 1, y: 1 });
    onChange({ geometry: { type: "polygon", points } });
  };
  const changeZoom = (factor: number, pivot = { x: width / 2, y: height / 2 }) => {
    const next = Math.max(1, Math.min(6, zoom * factor));
    const ratio = next / zoom;
    setPan({ x: pivot.x - (pivot.x - offset.x) * ratio - (width - map.width * fit) / 2, y: pivot.y - (pivot.y - offset.y) * ratio - (height - map.height * fit) / 2 });
    setZoom(next);
  };
  const displayed = items.filter((item) => item.id !== draftId).map((item) => ({ item, id: item.id, editing: false }));
  if (draft) displayed.push({ item: { ...draft, id: draftId ?? "draft", mapId: map.id, projectId: map.projectId, revision: 0, createdAt: "", updatedAt: "" }, id: draftId ?? "draft", editing: true });
  displayed.sort((a, b) => Number(a.id === selectedId || a.editing) - Number(b.id === selectedId || b.editing));
  // Floating actions / on-map editors for the working item (hidden while dragging).
  const overlay = draft && !dragging ? (() => {
    const left = offset.x + draft.x * map.width * scale;
    const top = offset.y + draft.y * map.height * scale;
    const color = contractors.find((c) => c.id === draft.contractorId)?.color ?? theme.palette.primary.main;
    return { left, top, color, text: layoutTextTitle(draft.title), caption: layoutTextTitle(draft.title, { font: CAPTION_FONT, maxWidth: CAPTION_MAX_WIDTH, lineHeight: CAPTION_LINE_HEIGHT, maxLines: CAPTION_MAX_LINES, minWidth: 64 }) };
  })() : null;
  return <Box ref={container} sx={{ width: "100%", minWidth: 0 }}>
    {!readOnly && (drawingTool && draft ? (() => {
      const n = draft.geometry.points.length;
      const step = tool === "route"
        ? n === 0 ? "แตะจุดเริ่มต้นบนถนน — ลูกศรจะชี้ตามลำดับที่แตะ" : n < 2 ? "แตะจุดถัดไปตามถนน" : `วางแล้ว ${n} จุด — แตะต่อตามถนน หรือกด Done / Enter`
        : n === 0 ? "คลิกบนผังเพื่อวางจุดมุมแรกของพื้นที่" : n < 3 ? `วางจุดมุมแล้ว ${n} จุด — วางต่ออีกอย่างน้อย ${3 - n} จุด` : `วางแล้ว ${n} จุด — คลิกจุดแรก (วงใหญ่) หรือกด Enter เพื่อปิดรูป`;
      return <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 1.5, py: 0.75, borderBottom: "1px solid", borderColor: "divider", bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
        {tool === "route" ? <AddRoadOutlined fontSize="small" color="primary" /> : <PentagonOutlined fontSize="small" color="primary" />}
        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, flex: { xs: "1 1 calc(100% - 32px)", sm: "1 1 0" }, overflowWrap: "anywhere" }}>{step}</Typography>
        <Button size="small" startIcon={<UndoOutlined fontSize="small" />} disabled={!n} onClick={() => onChange({ geometry: { type: drawType, points: draft.geometry.points.slice(0, -1) } })} sx={{ whiteSpace: "nowrap" }}>Undo point</Button>
        <Button size="small" color="inherit" disabled={!n} onClick={() => onChange({ geometry: { type: drawType, points: [] } })} sx={{ whiteSpace: "nowrap", display: { xs: "none", sm: "inline-flex" } }}>Redraw</Button>
        <Button size="small" variant="contained" disableElevation startIcon={<CheckOutlined fontSize="small" />} disabled={n < minPoints || Boolean(coordinationGeometryError(draft.geometry))} onClick={onFinish} sx={{ whiteSpace: "nowrap" }}>Done</Button>
      </Stack>;
    })() : <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1.5, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
      {draft ? "ลากไอคอนไปจุดทำงาน · ลากพื้นที่เพื่อย้าย · มุมสี่เหลี่ยมปรับขนาด/หมุน · ดับเบิลคลิกเพื่อแก้ชื่อ · ตั้งค่าอื่นที่แผงด้านข้าง" : "คลิกงานเพื่อดูและแก้ไข · ลากผังว่างเพื่อเลื่อน · ล้อเมาส์เพื่อซูม"}
    </Typography>)}
    {imageError ? <Alert severity="error" sx={{ m: 1.5 }}>โหลดภาพผังไม่สำเร็จ กรุณาตรวจภาพพื้นหลังแล้วลองใหม่</Alert> : <Box ref={stageBox} role="img" aria-label="Daily plan. Select an item from the side list to see details." sx={{ position: "relative", bgcolor: "background.paper", touchAction: "none", cursor: drawingTool ? "crosshair" : undefined }}>
      <Stage ref={stage} width={width} height={height} scaleX={scale} scaleY={scale} x={offset.x} y={offset.y}         draggable={tool === "move" && !readOnly}
        onDragStart={() => setDragging(true)}
        onDragEnd={(e) => {
          setDragging(false);
          // A click fires right after a pan/drag; skip the deselect for that click only.
          pointerMoved.current = true; window.setTimeout(() => { pointerMoved.current = false; }, 0);
          if (e.target === stage.current) setPan({ x: e.target.x() - (width - map.width * fit) / 2, y: e.target.y() - (height - map.height * fit) / 2 });
        }}
        onMouseMove={() => { if (drawingTool) setHover(point()); }} onMouseLeave={() => setHover(null)}
        onClick={click} onTap={click} onWheel={readOnly ? undefined : (e) => { e.evt.preventDefault(); changeZoom(e.evt.deltaY < 0 ? 1.15 : 1 / 1.15, stage.current?.getPointerPosition() ?? undefined); }}>
        <Layer listening={false}>{image && <CanvasImage image={image} width={map.width} height={map.height} />}</Layer>
        {!readOnly && <Layer listening={false}>
          {/* Grey zones beyond the draggable margin: items cannot be moved or drawn there. */}
          {(() => {
            const minX = COORDINATION_MIN * map.width, minY = COORDINATION_MIN * map.height;
            const maxX = COORDINATION_MAX * map.width, maxY = COORDINATION_MAX * map.height;
            const big = Math.max(map.width, map.height) * 4;
            const fill = theme.palette.grey[300];
            return <>
              <Rect x={minX - big} y={minY - big} width={big} height={maxY - minY + big * 2} fill={fill} />
              <Rect x={maxX} y={minY - big} width={big} height={maxY - minY + big * 2} fill={fill} />
              <Rect x={minX - big} y={minY - big} width={maxX - minX + big * 2} height={big} fill={fill} />
              <Rect x={minX - big} y={maxY} width={maxX - minX + big * 2} height={big} fill={fill} />
              <Rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} stroke={theme.palette.grey[400]} strokeWidth={1.5 / scale} dash={[8 / scale, 6 / scale]} />
            </>;
          })()}
        </Layer>}
        <Layer listening={false}>
          {roads.map((road, index) => {
            const pts = road.points.flatMap((p) => [p.x * map.width, p.y * map.height]);
            // Labels sit under each route's midpoint; when an earlier label is close on screen, go one line lower.
            const mid = routeMidpoint(road.points, map.width, map.height);
            const below = roads.slice(0, index).filter((o) => {
              const m = routeMidpoint(o.points, map.width, map.height);
              return Math.hypot(m.x - mid.x, m.y - mid.y) * scale < 90;
            }).length;
            return <Group key={road.id}>
              <Line points={pts} stroke={road.alert ? theme.palette.error.main : theme.palette.background.paper} strokeWidth={(road.alert ? 15 : 11) / scale} lineCap="round" lineJoin="round" opacity={0.95} />
              <Line points={pts} stroke={road.color} strokeWidth={7 / scale} lineCap="round" lineJoin="round" />
              <RouteMarks points={road.points.map((p) => ({ x: p.x * map.width, y: p.y * map.height }))} dx={0} dy={0} color={road.color}
                paper={theme.palette.background.paper} scale={scale} title={road.label} textColor={theme.palette.text.primary} labelDy={14 + below * 17} arrowsHidden={road.arrows === false} />
            </Group>;
          })}
        </Layer>
        <Layer>
          {displayed.map(({ item, id, editing }) => {
            const company = contractors.find((c) => c.id === item.contractorId);
            const color = company?.color ?? theme.palette.primary.main;
            const selected = id === selectedId || editing;
            const editable = editing && tool === "move";
            const select = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => { if (!draft || (tool === "move" && !editing)) { e.cancelBubble = true; onSelect(id); } };
            const area = item.geometry.points;
            const isRectangle = editing && item.areaKind === "rectangle" && area.length === 4 && tool === "move";
            const textLayout = item.icon === "text" ? layoutTextTitle(item.title) : null;
            // Live drag offset, scoped to the item actually being dragged. When the
            // chip is dragged the area itself also follows (Konva only moves the
            // dragged node, so the shape is shifted through its points).
            const dragOffset = areaDrag?.id === id ? areaDrag : null;
            const drawnArea = dragOffset?.source === "chip" ? shiftPoints(area, dragOffset.x / map.width, dragOffset.y / map.height) : area;
            const points = drawnArea.flatMap((p) => [p.x * map.width, p.y * map.height]);
            // Machinery label: the item title is always shown under the icon as halo
            // text (no box) so it stays readable over the drawing without cluttering.
            const captionLayout = item.icon !== "text" && item.title.trim()
              ? layoutTextTitle(item.title, { font: CAPTION_FONT, maxWidth: CAPTION_MAX_WIDTH, lineHeight: CAPTION_LINE_HEIGHT, maxLines: CAPTION_MAX_LINES, minWidth: 64 }) : null;
            const noteText = item.note?.replace(/\s+/g, " ").trim();
            const noteLayout = noteText && (display.notes || selected) && !(textEditing && editing)
              ? layoutTextTitle(noteText, { font: NOTE_FONT, maxWidth: CAPTION_MAX_WIDTH, lineHeight: NOTE_LINE_HEIGHT, maxLines: 2, minWidth: 64 }) : null;
            const captionShown = Boolean(captionLayout && (display.labels || selected) && !(textEditing && editing));
            // Icon markers: under the caption (or straight under the icon); text markers: under the pill.
            const noteY = item.icon === "text"
              ? (textLayout?.height ?? 0) / 2 + 4
              : 28 + (captionShown && captionLayout ? captionLayout.lines.length * CAPTION_LINE_HEIGHT + 2 : 0);
            const route = item.areaKind === "route";
            const clash = route ? clashes.get(id) : undefined;
            const center = route ? routeMidpoint(area, map.width, map.height) : areaCentroid(area, map.width, map.height);
            const a = drawnArea[0], b = drawnArea[1], d = drawnArea[3];
            return <Group key={id}
              onDblClick={(e) => { if (tool !== "move") return; e.cancelBubble = true; onSelect(id); onEditText(); }}
              onDblTap={(e) => { if (tool !== "move") return; e.cancelBubble = true; onSelect(id); onEditText(); }}>
              {!route && area[0] && item.linkArea !== false && (display.links || selected) && (display.areas || selected) && (() => {
                const dragArea = dragOffset ? shiftPoints(area, dragOffset.x / map.width, dragOffset.y / map.height) : area;
                const anchor = nearestBoundaryPoint(dragArea, item.x * map.width, item.y * map.height, map.width, map.height, !route);
                return <Line points={[item.x * map.width, item.y * map.height, anchor.x, anchor.y]} stroke={color} strokeWidth={1.5 / scale} dash={[5 / scale, 4 / scale]} opacity={selected ? 1 : 0.55} listening={false} />;
              })()}
              {isRectangle && a && b && d ? <Rect ref={rectangle} x={a.x * map.width} y={a.y * map.height}
                width={Math.hypot((b.x - a.x) * map.width, (b.y - a.y) * map.height)} height={Math.hypot((d.x - a.x) * map.width, (d.y - a.y) * map.height)}
                rotation={Math.atan2((b.y - a.y) * map.height, (b.x - a.x) * map.width) * 180 / Math.PI} scaleX={1} scaleY={1}
                fill={`${color}26`} stroke={color} strokeWidth={3 / scale} draggable onDragMove={rectangleChange} onDragEnd={rectangleChange} onTransformEnd={rectangleChange} />
                : (display.areas || selected) && <>
                  {/* A road route: thick open line on a light casing; the casing turns red on a clash. */}
                  {route && area.length >= 2 && <Line points={points} x={dragOffset?.source === "line" ? dragOffset.x : 0} y={dragOffset?.source === "line" ? dragOffset.y : 0}
                    stroke={clash ? theme.palette.error.main : theme.palette.background.paper} strokeWidth={((selected ? 8 : 6) + (clash ? 8 : 4)) / scale}
                    lineCap="round" lineJoin="round" opacity={selectedId || draft ? selected ? 1 : 0.6 : 0.95} listening={false} />}
                  <Line points={points} closed={!route} fill={route ? undefined : `${color}${selected ? "3D" : "26"}`} fillEnabled={!route && area.length >= 3} opacity={selectedId || draft ? selected ? 1 : 0.45 : 1}
                  stroke={color} strokeWidth={(route ? (selected ? 8 : 6) : (selected ? 3 : 2)) / scale} lineCap="round" lineJoin="round" hitStrokeWidth={route ? 24 / scale : undefined} onClick={select} onTap={select}
                  draggable={editable}
                  onDragStart={(e) => { areaDragStart.current = area; areaDragNodeStart.current = { x: e.target.x(), y: e.target.y() }; }}
                  onDragMove={(e) => { const s = areaDragNodeStart.current; if (s) setAreaDrag({ id, x: e.target.x() - s.x, y: e.target.y() - s.y, source: "line" }); }}
                  onDragEnd={(e) => {
                    const base = areaDragStart.current ?? area, s = areaDragNodeStart.current;
                    areaDragStart.current = null; areaDragNodeStart.current = null; setAreaDrag(null);
                    if (!s) return;
                    const { dx, dy } = areaDelta(e, s, base, map.width, map.height);
                    e.target.position({ x: 0, y: 0 });
                    onChange({ geometry: { type: item.geometry.type, points: shiftPoints(base, dx, dy) } });
                  }} /></>}
              {route && area.length >= 2 && (display.areas || selected) && <RouteMarks
                points={drawnArea.map((p) => ({ x: p.x * map.width, y: p.y * map.height }))}
                dx={dragOffset?.source === "line" ? dragOffset.x : 0} dy={dragOffset?.source === "line" ? dragOffset.y : 0}
                color={color} paper={theme.palette.background.paper} scale={scale}
                title={(display.labels || selected) && !(textEditing && editing) ? item.title : ""} textColor={theme.palette.text.primary} twoWay={item.twoWay === true} />}
              {isRectangle && <Transformer ref={transformer} flipEnabled={false} borderStroke={color} anchorStroke={color} anchorFill={theme.palette.background.paper} anchorSize={10} rotateEnabled />}
              {editing && (item.areaKind === "polygon" || route || drawingTool) && area.map((p, index) => <Circle key={index} x={p.x * map.width + (dragOffset?.x ?? 0)} y={p.y * map.height + (dragOffset?.y ?? 0)} radius={(index === 0 && tool === "polygon" && area.length >= 3 ? 11 : 6) / scale} fill={index === 0 && tool === "polygon" && area.length >= 3 ? color : theme.palette.background.paper} stroke={color} strokeWidth={2 / scale}
                draggable onDragMove={(e) => onChange({ geometry: { type: item.geometry.type, points: area.map((v, i) => i === index ? { x: clamp(e.target.x() / map.width), y: clamp(e.target.y() / map.height) } : v) } })}
                onClick={(e) => { e.cancelBubble = true; if (index === 0 && area.length >= 3 && tool === "polygon") onFinish(); }}
                onTap={(e) => { e.cancelBubble = true; if (index === 0 && area.length >= 3 && tool === "polygon") onFinish(); }} />)}
              {(display.chips || selected) && <Group x={center.x + (dragOffset?.x ?? 0)} y={center.y + (dragOffset?.y ?? 0)} scaleX={1 / scale} scaleY={1 / scale} draggable={editable}
                onClick={select} onTap={select}
                onDragStart={(e) => { areaDragStart.current = area; areaDragNodeStart.current = { x: e.target.x(), y: e.target.y() }; }}
                onDragMove={(e) => {
                  const base = areaDragStart.current, s = areaDragNodeStart.current;
                  if (!base || !s) return;
                  const { dx, dy } = areaDelta(e, s, base, map.width, map.height);
                  e.target.position({ x: s.x + dx * map.width, y: s.y + dy * map.height });
                  setAreaDrag({ id, x: dx * map.width, y: dy * map.height, source: "chip" });
                }}
                onDragEnd={(e) => {
                  const base = areaDragStart.current ?? area, s = areaDragNodeStart.current;
                  areaDragStart.current = null; areaDragNodeStart.current = null; setAreaDrag(null);
                  if (!s) return;
                  const { dx, dy } = areaDelta(e, s, base, map.width, map.height);
                  onChange({ geometry: { type: item.geometry.type, points: shiftPoints(base, dx, dy) } });
                }}>
                <Rect x={-34} y={-11} width={68} height={22} fill={clash ? theme.palette.error.main : theme.palette.background.paper} opacity={0.94} stroke={clash ? theme.palette.error.main : color} strokeWidth={1.5} cornerRadius={4} />
                <Text x={-34} y={-7} width={68} text={company?.code ?? "—"} fontFamily="Inter" fontSize={12} fontStyle="bold" align="center" fill={clash ? theme.palette.error.contrastText : theme.palette.text.primary} listening={false} />
              </Group>}
              {!route && <Group x={item.x * map.width} y={item.y * map.height} scaleX={1 / scale} scaleY={1 / scale} draggable={editable}
                onClick={select} onTap={select}
                onDragMove={(e) => {
                  const x = clamp(e.target.x() / map.width), y = clamp(e.target.y() / map.height);
                  e.target.position({ x: x * map.width, y: y * map.height });
                  onChange({ x, y });
                }}
                onDragEnd={(e) => onChange({ x: clamp(e.target.x() / map.width), y: clamp(e.target.y() / map.height) })}>
                {item.icon === "text" ? (textEditing && editing && !dragging ? null : <>
                  {/* Plain-text marker: the work title auto-sizes the pill and wraps
                      (max 3 lines + ellipsis). Double-click enters text editing, which
                      swaps this spot for an HTML textarea typed directly on the map. */}
                  <Rect x={-textLayout!.width / 2} y={-textLayout!.height / 2} width={textLayout!.width} height={textLayout!.height} fill={theme.palette.background.paper} opacity={0.94} stroke={color} strokeWidth={selected ? 3 : 1.5} cornerRadius={Math.min(16, textLayout!.height / 2)} />
                  <Text x={-textLayout!.width / 2 + 12} y={-textLayout!.height / 2 + 7} width={textLayout!.width - 24} text={textLayout!.lines.join("\n")} fontFamily="Inter" fontSize={13} fontStyle="bold" lineHeight={TEXT_LINE_HEIGHT / 13} align="center" fill={theme.palette.text.primary} listening={false} />
                </>) : <>
                  <Circle radius={24} fill={theme.palette.background.paper} opacity={0.94} stroke={color} strokeWidth={selected ? 3 : 1.5} />
                  <MachineIcon icon={item.icon} color={color} rotation={item.rotation} />
                  {captionShown && captionLayout && <Text x={-captionLayout.width / 2} y={28} width={captionLayout.width} text={captionLayout.lines.join("\n")} fontFamily="Inter" fontSize={12} fontStyle="600" lineHeight={CAPTION_LINE_HEIGHT / 12} align="center" fill={theme.palette.text.primary} stroke={theme.palette.background.paper} strokeWidth={3} fillAfterStrokeEnabled listening={false} />}
                </>}
                {noteLayout && <Text x={-noteLayout.width / 2} y={noteY} width={noteLayout.width} text={noteLayout.lines.join("\n")} fontFamily="Inter" fontSize={11} lineHeight={NOTE_LINE_HEIGHT / 11} align="center" fill={theme.palette.text.secondary} stroke={theme.palette.background.paper} strokeWidth={3} fillAfterStrokeEnabled listening={false} />}
              </Group>}
            </Group>;
          })}
        </Layer>
      </Stage>
      {drawingTool && draft && hover && draft.geometry.points.length > 0 && (() => {
        const pts = draft.geometry.points;
        const last = pts[pts.length - 1]!, first = pts[0]!;
        const px = (p: CoordinationPoint) => ({ x: offset.x + p.x * map.width * scale, y: offset.y + p.y * map.height * scale });
        const a = px(last), h = px(hover), f = px(first);
        const color = contractors.find((c) => c.id === draft.contractorId)?.color ?? theme.palette.primary.main;
        return <Box component="svg" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <line x1={a.x} y1={a.y} x2={h.x} y2={h.y} stroke={color} strokeWidth={2} strokeDasharray="6 4" />
          {tool === "polygon" && pts.length >= 2 && <line x1={h.x} y1={h.y} x2={f.x} y2={f.y} stroke={color} strokeWidth={1.25} strokeDasharray="3 5" opacity={0.6} />}
          <circle cx={h.x} cy={h.y} r={4} fill={color} />
        </Box>;
      })()}
      {overlay && draft && textEditing && tool === "move" && (draft.icon === "text" ? (
        // Multiline textarea mirrors the final pill (same wrap width, same
        // line height) so what you type is what the marker will look like.
        <InputBase autoFocus multiline rows={overlay.text.lines.length} value={draft.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="พิมพ์ข้อความ…" inputProps={{ "aria-label": "ข้อความบนผัง" }}
          sx={{ position: "absolute", left: overlay.left, top: overlay.top, transform: "translate(-50%, -50%)", width: Math.max(168, overlay.text.width), px: 1.5, py: "7px", borderRadius: 2, bgcolor: "background.paper", border: "2px solid", borderColor: overlay.color, fontSize: 13, fontWeight: 700, lineHeight: `${TEXT_LINE_HEIGHT}px`, "& textarea": { textAlign: "center", resize: "none", overflow: "hidden" } }} />
      ) : (
        // Icon caption editor: typed in place of the halo caption under the marker.
        <InputBase autoFocus multiline rows={overlay.caption.lines.length} value={draft.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="ชื่อเครื่องจักร…" inputProps={{ "aria-label": "ชื่อเครื่องจักรบนผัง" }}
          sx={{ position: "absolute", left: overlay.left, top: overlay.top + 28, transform: "translateX(-50%)", width: Math.max(168, overlay.caption.width), px: 1, py: "4px", borderRadius: 1, bgcolor: "background.paper", border: "2px solid", borderColor: overlay.color, fontSize: 12, fontWeight: 600, lineHeight: `${CAPTION_LINE_HEIGHT}px`, "& textarea": { textAlign: "center", resize: "none", overflow: "hidden" } }} />
      ))}
    {overlay && draft && draft.icon === "text" && textEditing && (() => {
      // While a text marker is being typed the HTML editor covers it, so this grip moves it.
      const anchor = {
        getBoundingClientRect: () => {
          const rect = stageBox.current?.getBoundingClientRect();
          const x = (rect?.left ?? 0) + overlay.left, y = (rect?.top ?? 0) + overlay.top;
          return { x, y, top: y, left: x, right: x, bottom: y, width: 0, height: 0, toJSON: () => ({}) } as DOMRect;
        },
      };
      return <Popper open placement="top" anchorEl={anchor} modifiers={[{ name: "offset", options: { offset: [0, 40] } }]} sx={{ zIndex: 1200 }}>
        <Stack direction="row" sx={{ px: 0.5, py: 0.25, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: 2 }}>
              <Tooltip title="Drag to move text">
                <Box
                  role="button"
                  aria-label="Drag to move text"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    textDrag.current = { px: e.clientX, py: e.clientY, x: draft.x, y: draft.y };
                  }}
                  onPointerMove={(e) => {
                    const start = textDrag.current;
                    if (!start) return;
                    onChange({
                      x: clamp(start.x + (e.clientX - start.px) / (map.width * scale)),
                      y: clamp(start.y + (e.clientY - start.py) / (map.height * scale)),
                    });
                  }}
                  onPointerUp={() => { textDrag.current = null; }}
                  onPointerCancel={() => { textDrag.current = null; }}
                  sx={{ display: "flex", alignItems: "center", px: 0.5, cursor: "grab", color: "text.disabled", "&:active": { cursor: "grabbing" } }}
                >
                  <DragIndicatorOutlined sx={{ fontSize: 18 }} />
                </Box>
              </Tooltip>
        </Stack>
      </Popper>;
    })()}
      {!readOnly && <Stack direction="column" spacing={0.5} sx={{ position: "absolute", bottom: 14, right: 14, zIndex: 30, bgcolor: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", p: 0.5, borderRadius: 2, border: "1px solid rgba(0,0,0,0.12)", boxShadow: 2 }}>
        <IconButton size="small" aria-label="Zoom in" disabled={zoom >= 6} onClick={() => changeZoom(1.25)}><AddOutlined fontSize="small" /></IconButton>
        <Typography variant="caption" sx={{ textAlign: "center", fontSize: 10, fontWeight: 700 }}>{Math.round(zoom * 100)}%</Typography>
        <IconButton size="small" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => changeZoom(1 / 1.25)}><RemoveOutlined fontSize="small" /></IconButton>
        <IconButton size="small" aria-label="Fit map" onClick={frameContent}><RestartAltOutlined fontSize="small" /></IconButton>
      </Stack>}
    </Box>}
    {!image && !imageError && <Typography role="status" variant="caption" color="text.secondary">กำลังโหลดภาพผัง…</Typography>}
  </Box>;
}
