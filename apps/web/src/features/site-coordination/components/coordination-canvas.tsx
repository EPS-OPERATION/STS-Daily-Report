import AddOutlined from "@mui/icons-material/AddOutlined";
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
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useRef, useState } from "react";
import { Circle, Group, Image as CanvasImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import Konva from "konva";import type { CoordinationContractor, CoordinationData, CoordinationInput, CoordinationItem, CoordinationPoint } from "@sts/shared";
import { COORDINATION_MAX, COORDINATION_MIN, coordinationGeometryError } from "@sts/shared";
import { MachineIcon } from "./machine-icon.js";
import type { MapDisplay } from "./map-filters.js";

export type MapTool = "move" | "polygon";
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
}
const SHOW_ALL = { areas: true, labels: true, notes: true, links: true, chips: true };
const clamp = (n: number) => Math.max(COORDINATION_MIN, Math.min(COORDINATION_MAX, n));

// Nearest point on the polygon boundary (image-pixel space): the connector line
// attaches to the closest edge instead of a fixed corner.
function nearestBoundaryPoint(points: CoordinationPoint[], px: number, py: number, width: number, height: number) {
  let best = { x: points[0]!.x * width, y: points[0]!.y * height };
  let bestDistance = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = { x: points[i]!.x * width, y: points[i]!.y * height };
    const b = { x: points[(i + 1) % points.length]!.x * width, y: points[(i + 1) % points.length]!.y * height };
    const abx = b.x - a.x, aby = b.y - a.y;
    const lengthSquared = abx * abx + aby * aby;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * abx + (py - a.y) * aby) / lengthSquared));
    const qx = a.x + t * abx, qy = a.y + t * aby;
    const distance = (qx - px) ** 2 + (qy - py) ** 2;
    if (distance < bestDistance) { bestDistance = distance; best = { x: qx, y: qy }; }
  }
  return best;
}

// Area dragging: during the drag the node keeps Konva's free position and only a
// lightweight pixel offset is tracked (chip, connector and vertices follow via
// their own props). On drop the offset is folded into the geometry points.
function areaDelta(e: Konva.KonvaEventObject<DragEvent>, start: { x: number; y: number }, base: CoordinationPoint[], width: number, height: number) {
  const dx = Math.max(COORDINATION_MIN - Math.min(...base.map((p) => p.x)), Math.min(COORDINATION_MAX - Math.max(...base.map((p) => p.x)), (e.target.x() - start.x) / width));
  const dy = Math.max(COORDINATION_MIN - Math.min(...base.map((p) => p.y)), Math.min(COORDINATION_MAX - Math.max(...base.map((p) => p.y)), (e.target.y() - start.y) / height));
  return { dx, dy };
}
const shiftPoints = (base: CoordinationPoint[], dx: number, dy: number) => base.map((p) => ({ x: p.x + dx, y: p.y + dy }));

// Bounding box of the non-white drawing content (image pixels), scanned from a
// downscaled copy. Used to frame the initial view on the drawing itself instead
// of the artwork's empty margins.
function scanContent(image: HTMLImageElement) {
  const ratio = Math.min(1, 400 / Math.max(image.naturalWidth, image.naturalHeight));
  const w = Math.max(1, Math.round(image.naturalWidth * ratio));
  const h = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(image, 0, 0, w, h);
  const data = context.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3]! > 8 && (data[i]! + data[i + 1]! + data[i + 2]!) / 3 < 235) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: (minX / w) * image.naturalWidth, y: (minY / h) * image.naturalHeight, w: ((maxX - minX + 1) / w) * image.naturalWidth, h: ((maxY - minY + 1) / h) * image.naturalHeight };
}

// Area-weighted centroid (image pixels) where the contractor chip sits.
function areaCentroid(points: CoordinationPoint[], width: number, height: number) {
  let twiceArea = 0, cx = 0, cy = 0;
  for (let i = 0; i < points.length; i++) {
    const a = { x: points[i]!.x * width, y: points[i]!.y * height };
    const b = { x: points[(i + 1) % points.length]!.x * width, y: points[(i + 1) % points.length]!.y * height };
    const cross = a.x * b.y - b.x * a.y;
    twiceArea += cross; cx += (a.x + b.x) * cross; cy += (a.y + b.y) * cross;
  }
  if (Math.abs(twiceArea) < 1e-6) {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: (sum.x / points.length) * width, y: (sum.y / points.length) * height };
  }
  return { x: cx / (3 * twiceArea), y: cy / (3 * twiceArea) };
}

// Report room (screen px) kept clear around the drawing: job titles and notes hang below or beside their marker.
const REPORT_ROOM = { left: 130, right: 130, top: 40, bottom: 100 };

// Report framing: the drawing content plus every job (marker and area), so nothing printed is cut off.
function reportBounds(content: { x: number; y: number; w: number; h: number } | null, items: CoordinationItem[], map: { width: number; height: number }) {
  let minX = content?.x ?? 0, minY = content?.y ?? 0;
  let maxX = content ? content.x + content.w : map.width, maxY = content ? content.y + content.h : map.height;
  for (const item of items) {
    for (const p of [{ x: item.x, y: item.y }, ...item.geometry.points]) {
      const px = p.x * map.width, py = p.y * map.height;
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
  }
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

// ---- text marker sizing ------------------------------------------------------
// Long titles auto-size the pill and wrap like a Canva text box: up to 3 lines,
// then a trailing ellipsis. Thai strings have no word breaks, so over-long
// tokens are hard-split by character width. The same helper also lays out the
// caption attached under an icon marker (smaller font, max 2 lines).
const TEXT_FONT = "700 13px Inter, sans-serif";
const TEXT_MAX_WIDTH = 240;
const TEXT_LINE_HEIGHT = 17;
const TEXT_MAX_LINES = 3;
const CAPTION_FONT = "600 12px Inter, sans-serif";
const CAPTION_MAX_WIDTH = 200;
const CAPTION_LINE_HEIGHT = 15;
const CAPTION_MAX_LINES = 2;
// Note under the title: smaller, muted, two lines max (the full note is in the side panel).
const NOTE_FONT = "400 11px Inter, sans-serif";
const NOTE_LINE_HEIGHT = 14;
interface TextLayout { lines: string[]; width: number; height: number; lineHeight: number }
let measureContext: CanvasRenderingContext2D | null = null;
function measureText(text: string, font: string) {
  measureContext ??= document.createElement("canvas").getContext("2d");
  if (!measureContext) return text.length * 7;
  measureContext.font = font;
  return measureContext.measureText(text).width;
}
function layoutTextTitle(title: string, options: { font?: string; maxWidth?: number; lineHeight?: number; maxLines?: number; minWidth?: number } = {}): TextLayout {
  const font = options.font ?? TEXT_FONT;
  const maxWidth = options.maxWidth ?? TEXT_MAX_WIDTH;
  const lineHeight = options.lineHeight ?? TEXT_LINE_HEIGHT;
  const maxLines = options.maxLines ?? TEXT_MAX_LINES;
  const minWidth = options.minWidth ?? 88;
  const source = title.trim() || "ข้อความ";
  const lines: string[] = [];
  for (const token of source.split(/\s+/)) {
    let rest = token;
    while (measureText(rest, font) > maxWidth) {
      let cut = rest.length;
      while (cut > 1 && measureText(rest.slice(0, cut), font) > maxWidth) cut--;
      const head = rest.slice(0, cut);
      const prev = lines[lines.length - 1];
      if (prev && measureText(`${prev} ${head}`, font) <= maxWidth) lines[lines.length - 1] = `${prev} ${head}`;
      else lines.push(head);
      rest = rest.slice(cut);
    }
    if (!rest) continue;
    const prev = lines[lines.length - 1];
    if (prev && measureText(`${prev} ${rest}`, font) <= maxWidth) lines[lines.length - 1] = `${prev} ${rest}`;
    else lines.push(rest);
  }
  if (!lines.length) lines.push(source);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1]!;
    while (last.length > 1 && measureText(`${last}…`, font) > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  const inner = Math.max(...lines.map((line) => measureText(line, font)));
  const width = Math.max(minWidth, Math.min(maxWidth + 24, inner + 24));
  const height = lines.length * lineHeight + 14;
  return { lines, width, height, lineHeight };
}

export function CoordinationCanvas({ map, contractors, items, selectedId, draft, draftId, tool, compact, onSelect, onChange, onFinish, onDeselect, textEditing, onEditText, display = SHOW_ALL, readOnly = false, fixedHeight, onReady }: Props) {
  const theme = useTheme();
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
    if (tool !== "polygon" || !draft) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA"].includes(t.tagName)) return;
      const pts = draft.geometry.points;
      if (e.key === "Enter" && pts.length >= 3 && !coordinationGeometryError(draft.geometry)) { e.preventDefault(); onFinish(); }
      else if (e.key === "Backspace" && pts.length) { e.preventDefault(); onChange({ geometry: { type: "polygon", points: pts.slice(0, -1) } }); }
      else if (e.key === "Escape") { e.preventDefault(); onFinish(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, draft, onChange, onFinish]);
  useEffect(() => { if (tool !== "polygon") setHover(null); }, [tool]);
  const point = (allowClamp = false) => {
    const node = stage.current, pointer = node?.getPointerPosition();
    if (!node || !pointer) return null;
    const p = node.getAbsoluteTransform().copy().invert().point(pointer);
    if (!allowClamp && (p.x < COORDINATION_MIN * map.width || p.y < COORDINATION_MIN * map.height || p.x > COORDINATION_MAX * map.width || p.y > COORDINATION_MAX * map.height)) return null;
    return { x: clamp(p.x / map.width), y: clamp(p.y / map.height) };
  };
  const click = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (pointerMoved.current) return;
    if (e.target !== stage.current) return;
    if (tool === "polygon") {
      const p = point(); if (!draft || !p) return;
      onChange({ areaKind: "polygon", geometry: { type: "polygon", points: [...draft.geometry.points, p] } });
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
    {!readOnly && (tool === "polygon" && draft ? (() => {
      const n = draft.geometry.points.length;
      const step = n === 0 ? "คลิกบนผังเพื่อวางจุดมุมแรกของพื้นที่" : n < 3 ? `วางจุดมุมแล้ว ${n} จุด — วางต่ออีกอย่างน้อย ${3 - n} จุด` : `วางแล้ว ${n} จุด — คลิกจุดแรก (วงใหญ่) หรือกด Enter เพื่อปิดรูป`;
      return <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 1.5, py: 0.75, borderBottom: "1px solid", borderColor: "divider", bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
        <PentagonOutlined fontSize="small" color="primary" />
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{step}</Typography>
        <Button size="small" startIcon={<UndoOutlined fontSize="small" />} disabled={!n} onClick={() => onChange({ geometry: { type: "polygon", points: draft.geometry.points.slice(0, -1) } })} sx={{ whiteSpace: "nowrap" }}>ย้อนจุด</Button>
        <Button size="small" color="inherit" disabled={!n} onClick={() => onChange({ geometry: { type: "polygon", points: [] } })} sx={{ whiteSpace: "nowrap", display: { xs: "none", sm: "inline-flex" } }}>วาดใหม่</Button>
        <Button size="small" variant="contained" disableElevation startIcon={<CheckOutlined fontSize="small" />} disabled={n < 3 || Boolean(coordinationGeometryError(draft.geometry))} onClick={onFinish} sx={{ whiteSpace: "nowrap" }}>เสร็จ</Button>
      </Stack>;
    })() : <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1.5, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
      {draft ? "ลากไอคอนไปจุดทำงาน · ลากพื้นที่เพื่อย้าย · มุมสี่เหลี่ยมปรับขนาด/หมุน · ดับเบิลคลิกเพื่อแก้ชื่อ · ตั้งค่าอื่นที่แผงด้านข้าง" : "คลิกงานเพื่อดูและแก้ไข · ลากผังว่างเพื่อเลื่อน · ล้อเมาส์เพื่อซูม"}
    </Typography>)}
    {imageError ? <Alert severity="error" sx={{ m: 1.5 }}>โหลดภาพผังไม่สำเร็จ กรุณาตรวจภาพพื้นหลังแล้วลองใหม่</Alert> : <Box ref={stageBox} role="img" aria-label="ผังงานรายวัน เลือกรายการงานจากรายการด้านข้างเพื่อดูรายละเอียด" sx={{ position: "relative", bgcolor: "background.paper", touchAction: "none", cursor: tool === "polygon" ? "crosshair" : undefined }}>
      <Stage ref={stage} width={width} height={height} scaleX={scale} scaleY={scale} x={offset.x} y={offset.y}         draggable={tool === "move" && !readOnly}
        onDragStart={() => setDragging(true)}
        onDragEnd={(e) => {
          setDragging(false);
          // A click fires right after a pan/drag; skip the deselect for that click only.
          pointerMoved.current = true; window.setTimeout(() => { pointerMoved.current = false; }, 0);
          if (e.target === stage.current) setPan({ x: e.target.x() - (width - map.width * fit) / 2, y: e.target.y() - (height - map.height * fit) / 2 });
        }}
        onMouseMove={() => { if (tool === "polygon") setHover(point()); }} onMouseLeave={() => setHover(null)}
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
            const center = areaCentroid(area, map.width, map.height);
            const a = drawnArea[0], b = drawnArea[1], d = drawnArea[3];
            return <Group key={id}
              onDblClick={(e) => { if (tool !== "move") return; e.cancelBubble = true; onSelect(id); onEditText(); }}
              onDblTap={(e) => { if (tool !== "move") return; e.cancelBubble = true; onSelect(id); onEditText(); }}>
              {area[0] && item.linkArea !== false && (display.links || selected) && (display.areas || selected) && (() => {
                const dragArea = dragOffset ? shiftPoints(area, dragOffset.x / map.width, dragOffset.y / map.height) : area;
                const anchor = nearestBoundaryPoint(dragArea, item.x * map.width, item.y * map.height, map.width, map.height);
                return <Line points={[item.x * map.width, item.y * map.height, anchor.x, anchor.y]} stroke={color} strokeWidth={1.5 / scale} dash={[5 / scale, 4 / scale]} opacity={selected ? 1 : 0.55} listening={false} />;
              })()}
              {isRectangle && a && b && d ? <Rect ref={rectangle} x={a.x * map.width} y={a.y * map.height}
                width={Math.hypot((b.x - a.x) * map.width, (b.y - a.y) * map.height)} height={Math.hypot((d.x - a.x) * map.width, (d.y - a.y) * map.height)}
                rotation={Math.atan2((b.y - a.y) * map.height, (b.x - a.x) * map.width) * 180 / Math.PI} scaleX={1} scaleY={1}
                fill={`${color}26`} stroke={color} strokeWidth={3 / scale} draggable onDragMove={rectangleChange} onDragEnd={rectangleChange} onTransformEnd={rectangleChange} />
                : (display.areas || selected) && <Line points={points} closed fill={`${color}${selected ? "3D" : "26"}`} fillEnabled={area.length >= 3} opacity={selectedId || draft ? selected ? 1 : 0.45 : 1}
                  stroke={color} strokeWidth={(selected ? 3 : 2) / scale} onClick={select} onTap={select}
                  draggable={editable}
                  onDragStart={(e) => { areaDragStart.current = area; areaDragNodeStart.current = { x: e.target.x(), y: e.target.y() }; }}
                  onDragMove={(e) => { const s = areaDragNodeStart.current; if (s) setAreaDrag({ id, x: e.target.x() - s.x, y: e.target.y() - s.y, source: "line" }); }}
                  onDragEnd={(e) => {
                    const base = areaDragStart.current ?? area, s = areaDragNodeStart.current;
                    areaDragStart.current = null; areaDragNodeStart.current = null; setAreaDrag(null);
                    if (!s) return;
                    const { dx, dy } = areaDelta(e, s, base, map.width, map.height);
                    e.target.position({ x: 0, y: 0 });
                    onChange({ geometry: { type: "polygon", points: shiftPoints(base, dx, dy) } });
                  }} />}
              {isRectangle && <Transformer ref={transformer} flipEnabled={false} borderStroke={color} anchorStroke={color} anchorFill={theme.palette.background.paper} anchorSize={10} rotateEnabled />}
              {editing && (item.areaKind === "polygon" || tool === "polygon") && area.map((p, index) => <Circle key={index} x={p.x * map.width + (dragOffset?.x ?? 0)} y={p.y * map.height + (dragOffset?.y ?? 0)} radius={(index === 0 && tool === "polygon" && area.length >= 3 ? 11 : 6) / scale} fill={index === 0 && tool === "polygon" && area.length >= 3 ? color : theme.palette.background.paper} stroke={color} strokeWidth={2 / scale}
                draggable onDragMove={(e) => onChange({ geometry: { type: "polygon", points: area.map((v, i) => i === index ? { x: clamp(e.target.x() / map.width), y: clamp(e.target.y() / map.height) } : v) } })}
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
                  onChange({ geometry: { type: "polygon", points: shiftPoints(base, dx, dy) } });
                }}>
                <Rect x={-34} y={-11} width={68} height={22} fill={theme.palette.background.paper} opacity={0.94} stroke={color} strokeWidth={1.5} cornerRadius={4} />
                <Text x={-34} y={-7} width={68} text={company?.code ?? "—"} fontFamily="Inter" fontSize={12} fontStyle="bold" align="center" fill={theme.palette.text.primary} listening={false} />
              </Group>}
              <Group x={item.x * map.width} y={item.y * map.height} scaleX={1 / scale} scaleY={1 / scale} draggable={editable}
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
              </Group>
            </Group>;
          })}
        </Layer>
      </Stage>
      {tool === "polygon" && draft && hover && draft.geometry.points.length > 0 && (() => {
        const pts = draft.geometry.points;
        const last = pts[pts.length - 1]!, first = pts[0]!;
        const px = (p: CoordinationPoint) => ({ x: offset.x + p.x * map.width * scale, y: offset.y + p.y * map.height * scale });
        const a = px(last), h = px(hover), f = px(first);
        const color = contractors.find((c) => c.id === draft.contractorId)?.color ?? theme.palette.primary.main;
        return <Box component="svg" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <line x1={a.x} y1={a.y} x2={h.x} y2={h.y} stroke={color} strokeWidth={2} strokeDasharray="6 4" />
          {pts.length >= 2 && <line x1={h.x} y1={h.y} x2={f.x} y2={f.y} stroke={color} strokeWidth={1.25} strokeDasharray="3 5" opacity={0.6} />}
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
              <Tooltip title="ลากเพื่อย้ายข้อความ">
                <Box
                  role="button"
                  aria-label="ลากเพื่อย้ายข้อความ"
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
        <IconButton size="small" aria-label="ซูมเข้า" disabled={zoom >= 6} onClick={() => changeZoom(1.25)}><AddOutlined fontSize="small" /></IconButton>
        <Typography variant="caption" sx={{ textAlign: "center", fontSize: 10, fontWeight: 700 }}>{Math.round(zoom * 100)}%</Typography>
        <IconButton size="small" aria-label="ซูมออก" disabled={zoom <= 1} onClick={() => changeZoom(1 / 1.25)}><RemoveOutlined fontSize="small" /></IconButton>
        <IconButton size="small" aria-label="พอดีผัง" onClick={frameContent}><RestartAltOutlined fontSize="small" /></IconButton>
      </Stack>}
    </Box>}
    {!image && !imageError && <Typography role="status" variant="caption" color="text.secondary">กำลังโหลดภาพผัง…</Typography>}
  </Box>;
}
