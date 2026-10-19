import AddOutlined from "@mui/icons-material/AddOutlined";
import RemoveOutlined from "@mui/icons-material/RemoveOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import { COORDINATION_MAX, COORDINATION_MIN, type CoordinationData, type CoordinationPoint } from "@sts/shared";
import type Konva from "konva";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Circle, Image as CanvasImage, Layer, Line, Stage, Text } from "react-konva";
import { previewImagePath } from "../utils/canvas-geometry.js";
import { RouteMarks } from "./route-marks.js";

export interface RoadLine {
  id: string;
  points: CoordinationPoint[];
  color: string;
  /** Text under the middle of the line (segment name, contractor and time...). */
  label?: string;
  /** Faded: context only (e.g. register roads behind a request). */
  muted?: boolean;
  /** Red casing: this line clashes. */
  alert?: boolean;
  /** Direction arrows (start dot, small arrows, arrowhead). */
  arrows?: boolean;
  dashed?: boolean;
  /** Not tappable (e.g. a route drawn over the roads it uses, so the roads underneath stay tappable). */
  passive?: boolean;
  /** Drawn thick like the selected line (e.g. every piece of the selected road). */
  emphasis?: boolean;
}

/** A tappable place on the map (e.g. where a road route can start or stop). */
export interface MapDot {
  id: string;
  point: CoordinationPoint;
  /** Chosen: solid with its label; otherwise a light ring to tap. */
  active?: boolean;
  label?: string;
}

const clamp = (n: number) => Math.max(COORDINATION_MIN, Math.min(COORDINATION_MAX, n));
const MIN_ZOOM = 1, MAX_ZOOM = 8;

// Map with road lines on top: used by the EPS road register and the road-request picker.
// Taps on empty map report a point; taps on a line report its id; vertices of the edited line drag.
// Same feel as the coordination map: light preview image, pinch zoom, pan that cannot lose the drawing.
export function RoadMapStage({
  map,
  lines,
  selectedId,
  draft,
  draftLine = true,
  controls = true,
  dots,
  onTapDot,
  editPoints,
  height = 520,
  onTapMap,
  onTapLine,
  onMovePoint,
  onDragLine,
  snapPreview,
  focus,
  children,
}: {
  map: CoordinationData["map"];
  lines: RoadLine[];
  selectedId?: string | null;
  /** Line being drawn (open), shown with its points. */
  draft?: CoordinationPoint[] | null;
  /** false: show the draft's points only (e.g. tapped stops), without the dashed line between them. */
  draftLine?: boolean;
  /** false: a still preview (no zoom buttons). */
  controls?: boolean;
  dots?: MapDot[];
  onTapDot?: (id: string) => void;
  /** Points of the selected line that can be dragged. */
  editPoints?: CoordinationPoint[] | null;
  /** Stage height in px; "fill" takes the height of the (flex) parent. */
  height?: number | "fill";
  onTapMap?: (p: CoordinationPoint) => void;
  onTapLine?: (id: string) => void;
  onMovePoint?: (index: number, p: CoordinationPoint) => void;
  /** The selected line can be dragged whole: `move` gets the offset (0..1 map units) since the drag began. */
  onDragLine?: (phase: "start" | "move" | "end", delta: CoordinationPoint) => void;
  /** While drawing (mouse): where a tap here would land (e.g. snapped onto another road). */
  snapPreview?: (p: CoordinationPoint) => CoordinationPoint;
  /** Change `key` to zoom the map onto these points (e.g. the road picked in a list). */
  focus?: { key: string | number; points: CoordinationPoint[] } | null;
  /** Floating controls drawn over the map (positioned absolutely by the caller). */
  children?: ReactNode;
}) {
  const theme = useTheme();
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<Konva.Stage>(null);
  const [width, setWidth] = useState(600);
  const [boxHeight, setBoxHeight] = useState(0);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<{ p: CoordinationPoint; snapped: boolean } | null>(null);
  const moved = useRef(false);
  const h = height === "fill" ? boxHeight : height;
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ob = new ResizeObserver(() => { setWidth(el.clientWidth); setBoxHeight(el.clientHeight); });
    setWidth(el.clientWidth); setBoxHeight(el.clientHeight); ob.observe(el); return () => ob.disconnect();
  }, []);
  // Light preview first (the full PNG decodes to ~130 MB); the original only if there is no preview.
  useEffect(() => {
    let cancelled = false;
    const load = (src: string, onFail?: () => void) => {
      const img = new window.Image();
      img.onload = () => { if (!cancelled) setImage(img); };
      img.onerror = () => { if (!cancelled) onFail?.(); };
      img.src = src;
    };
    load(previewImagePath(map.imagePath), () => load(map.imagePath));
    return () => { cancelled = true; };
  }, [map.imagePath]);
  useEffect(() => { if (!onTapMap || !draft) setHover(null); }, [onTapMap, draft]);
  const fit = Math.min(width / map.width, (h || 1) / map.height);
  const scale = fit * zoom;
  const centre = { x: (width - map.width * fit) / 2, y: (h - map.height * fit) / 2 };
  // Pan limits: the drawing plus its margin never leaves the screen (bigger than the screen: its edges
  // stop at the screen edges; smaller: it slides only inside).
  const bound = (pos: { x: number; y: number }, s: number) => {
    const lim = (p: number, size: number, view: number) => {
      const a = view - COORDINATION_MAX * size, b = -COORDINATION_MIN * size;
      return Math.min(Math.max(p, Math.min(a, b)), Math.max(a, b));
    };
    return { x: lim(pos.x, map.width * s, width), y: lim(pos.y, map.height * s, h) };
  };
  const offset = bound({ x: centre.x + pan.x, y: centre.y + pan.y }, scale);
  const px = (p: CoordinationPoint) => [p.x * map.width, p.y * map.height];
  const pointer = (): CoordinationPoint | null => {
    const s = stage.current, at = s?.getPointerPosition();
    if (!s || !at) return null;
    const p = s.getAbsoluteTransform().copy().invert().point(at);
    return { x: clamp(p.x / map.width), y: clamp(p.y / map.height) };
  };
  const setView = (z: number, pos: { x: number; y: number }) => {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    const b = bound(pos, fit * next);
    setZoom(next); setPan({ x: b.x - centre.x, y: b.y - centre.y });
  };
  const zoomBy = (factor: number, pivot = { x: width / 2, y: h / 2 }) => {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
    const r = next / zoom;
    setView(next, { x: pivot.x - (pivot.x - offset.x) * r, y: pivot.y - (pivot.y - offset.y) * r });
  };
  // Zoom onto the focused points (a road picked from a list), leaving some room around them.
  useEffect(() => {
    if (!focus || !focus.points.length || !h) return;
    const xs = focus.points.map((p) => p.x * map.width), ys = focus.points.map((p) => p.y * map.height);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(width / ((x1 - x0) * 2.2 || 1), h / ((y1 - y0) * 2.2 || 1)) / fit));
    const s = fit * z;
    setView(z, { x: width / 2 - ((x0 + x1) / 2) * s, y: h / 2 - ((y0 + y1) / 2) * s });
  }, [focus?.key, h > 0]);
  // Two-finger pinch: zoom around the fingers and pan with them (moves the stage, committed on release).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let last: { dist: number; cx: number; cy: number } | null = null;
    const read = (t: TouchList) => {
      const r = el.getBoundingClientRect(), a = t[0]!, b = t[1]!;
      return { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), cx: (a.clientX + b.clientX) / 2 - r.left, cy: (a.clientY + b.clientY) / 2 - r.top };
    };
    const move = (e: TouchEvent) => {
      const node = stage.current;
      if (e.touches.length !== 2 || !node) { last = null; return; }
      e.preventDefault();
      if (node.isDragging()) node.stopDrag();
      const now = read(e.touches);
      if (last && last.dist > 0) {
        const old = node.scaleX(), f = view.current.fit;
        const next = Math.max(f * MIN_ZOOM, Math.min(f * MAX_ZOOM, old * (now.dist / last.dist))), r = next / old;
        node.scale({ x: next, y: next });
        node.position(view.current.bound({ x: now.cx - (last.cx - node.x()) * r, y: now.cy - (last.cy - node.y()) * r }, next));
        node.batchDraw();
        moved.current = true;
      }
      last = now;
    };
    const end = (e: TouchEvent) => {
      if (e.touches.length >= 2 || !last) return;
      last = null;
      const node = stage.current, v = view.current;
      if (node) { setZoom(node.scaleX() / v.fit); setPan({ x: node.x() - v.centre.x, y: node.y() - v.centre.y }); }
      window.setTimeout(() => { moved.current = false; }, 0);
    };
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => { el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); };
  }, []);
  const view = useRef({ fit, centre, bound });
  view.current = { fit, centre, bound };
  const paper = theme.palette.background.paper;
  // One handler for the whole stage: a tapped road line reports the id stored on its Konva node
  // (per-line handlers went stale between renders), anything else is a tap on the map.
  const handleTap = (e: Konva.KonvaEventObject<Event>) => {
    if (moved.current) return;
    const target = e.target;
    if (onTapDot && target.name() === "map-dot") { onTapDot(target.id()); return; }
    if (onTapLine && target !== stage.current && target.name() === "road-line") { onTapLine(target.id()); return; }
    const p = pointer();
    if (p) onTapMap?.(p);
  };
  const last = draft?.[draft.length - 1];
  return (
    <Box ref={box} sx={{ position: "relative", width: "100%", minWidth: 0, touchAction: "none", bgcolor: "background.paper", cursor: onTapMap && draft ? "crosshair" : undefined,
      ...(height === "fill" && { flex: 1, minHeight: 0, overflow: "hidden" }) }}>
      <Stage
        ref={stage}
        width={width}
        height={h}
        scaleX={scale}
        scaleY={scale}
        x={offset.x}
        y={offset.y}
        draggable
        dragBoundFunc={(pos) => bound(pos, stage.current?.scaleX() ?? scale)}
        onDragStart={() => { moved.current = true; }}
        onDragEnd={(e) => {
          if (e.target === stage.current) setPan({ x: e.target.x() - centre.x, y: e.target.y() - centre.y });
          window.setTimeout(() => { moved.current = false; }, 0);
        }}
        onWheel={(e) => { e.evt.preventDefault(); zoomBy(e.evt.deltaY < 0 ? 1.15 : 1 / 1.15, stage.current?.getPointerPosition() ?? undefined); }}
        onMouseMove={() => {
          if (!onTapMap || !draft) return;
          const p = pointer(); if (!p) return;
          const q = snapPreview ? snapPreview(p) : p;
          setHover({ p: q, snapped: q.x !== p.x || q.y !== p.y });
        }}
        onMouseLeave={() => setHover(null)}
        onClick={handleTap}
        onTap={handleTap}
      >
        <Layer listening={false}>{image && <CanvasImage image={image} width={map.width} height={map.height} />}</Layer>
        <Layer>
          {[...lines].sort((a, b) => Number(a.id === selectedId || Boolean(a.emphasis)) - Number(b.id === selectedId || Boolean(b.emphasis))).map((line) => {
            const pts = line.points.flatMap(px);
            const on = line.id === selectedId || line.emphasis;
            return (
              <Fragment key={line.id}>
                <Line points={pts} stroke={line.alert ? theme.palette.error.main : paper} strokeWidth={((on ? 9 : 7) + (line.alert ? 8 : 4)) / scale} lineCap="round" lineJoin="round" opacity={line.muted ? 0.5 : 0.95} listening={false} perfectDrawEnabled={false} />
                <Line points={pts} stroke={line.color} strokeWidth={(on ? 9 : 7) / scale} lineCap="round" lineJoin="round" opacity={line.muted ? 0.45 : 1} perfectDrawEnabled={false}
                  dash={line.dashed ? [14 / scale, 10 / scale] : undefined} hitStrokeWidth={26 / scale} id={line.id} name="road-line" listening={!line.passive}
                  // Whole-line drag: the node is put back each frame and the caller redraws the shifted points.
                  draggable={Boolean(onDragLine) && line.id === selectedId}
                  onMouseEnter={(e) => { if (onDragLine && line.id === selectedId) { const c = e.target.getStage()?.container(); if (c) c.style.cursor = "move"; } }}
                  onMouseLeave={(e) => { const c = e.target.getStage()?.container(); if (c) c.style.cursor = ""; }}
                  onDragStart={(e) => { e.cancelBubble = true; moved.current = true; onDragLine?.("start", { x: 0, y: 0 }); }}
                  onDragMove={(e) => { e.cancelBubble = true; const d = { x: e.target.x() / map.width, y: e.target.y() / map.height }; e.target.position({ x: 0, y: 0 }); onDragLine?.("move", d); }}
                  onDragEnd={(e) => { e.cancelBubble = true; e.target.position({ x: 0, y: 0 }); onDragLine?.("end", { x: 0, y: 0 }); window.setTimeout(() => { moved.current = false; }, 0); }} />
                {(line.arrows || line.label) && line.points.length >= 2 && (
                  <RouteMarks points={line.points.map((p) => ({ x: p.x * map.width, y: p.y * map.height }))} dx={0} dy={0} color={line.color} paper={paper} scale={scale}
                    title={line.label ?? ""} textColor={theme.palette.text.primary} arrowsHidden={!line.arrows} />
                )}
              </Fragment>
            );
          })}
          {draft && draft.length > 0 && <>
            {draftLine && <Line points={draft.flatMap(px)} stroke={theme.palette.primary.main} strokeWidth={7 / scale} lineCap="round" lineJoin="round" dash={[12 / scale, 8 / scale]} listening={false} />}
            {draft.map((p, i) => <Circle key={i} x={p.x * map.width} y={p.y * map.height} radius={6 / scale} fill={paper} stroke={theme.palette.primary.main} strokeWidth={2 / scale} listening={false} />)}
          </>}
          {/* Drawing preview (mouse): a thin line to the pointer; the ring turns green when it would snap. */}
          {hover && draft && <>
            {last && draftLine && <Line points={[...px(last), ...px(hover.p)]} stroke={theme.palette.primary.main} strokeWidth={2 / scale} dash={[6 / scale, 5 / scale]} opacity={0.8} listening={false} />}
            <Circle x={hover.p.x * map.width} y={hover.p.y * map.height} radius={(hover.snapped ? 10 : 6) / scale} stroke={hover.snapped ? theme.palette.success.main : theme.palette.primary.main}
              strokeWidth={(hover.snapped ? 3 : 2) / scale} fill={hover.snapped ? `${theme.palette.success.main}33` : undefined} listening={false} />
          </>}
          {dots?.map((d) => (
            <Fragment key={d.id}>
              <Circle id={d.id} name="map-dot" x={d.point.x * map.width} y={d.point.y * map.height} radius={(d.active ? 9 : 8) / scale}
                fill={d.active ? theme.palette.success.main : paper} stroke={d.active ? paper : theme.palette.success.main} strokeWidth={(d.active ? 3 : 2.5) / scale}
                opacity={d.active ? 1 : 0.85} hitStrokeWidth={22 / scale} shadowColor="#000" shadowOpacity={d.active ? 0.25 : 0} shadowBlur={4 / scale} />
              {d.active && d.label ? (
                <Text x={d.point.x * map.width + 12 / scale} y={d.point.y * map.height - 22 / scale} text={d.label} fontSize={12 / scale} fontStyle="700"
                  fontFamily="Inter, Sarabun, sans-serif" fill={theme.palette.success.dark} stroke={paper} strokeWidth={3 / scale} fillAfterStrokeEnabled listening={false} />
              ) : null}
            </Fragment>
          ))}
          {editPoints && onMovePoint && editPoints.map((p, i) => (
            <Circle key={i} x={p.x * map.width} y={p.y * map.height} radius={8 / scale} fill={paper} stroke={theme.palette.primary.main} strokeWidth={2.5 / scale} draggable hitStrokeWidth={14 / scale}
              onDragMove={(e) => onMovePoint(i, { x: clamp(e.target.x() / map.width), y: clamp(e.target.y() / map.height) })}
              onClick={(e) => { e.cancelBubble = true; }} onTap={(e) => { e.cancelBubble = true; }} />
          ))}
        </Layer>
      </Stage>
      {children}
      {controls && <Stack sx={{ position: "absolute", right: 12, bottom: 12, bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: 2, zIndex: 20 }}>
        <IconButton size="small" aria-label="Zoom in" onClick={() => zoomBy(1.3)}><AddOutlined fontSize="small" /></IconButton>
        <IconButton size="small" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.3)}><RemoveOutlined fontSize="small" /></IconButton>
        <IconButton size="small" aria-label="Fit map" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RestartAltOutlined fontSize="small" /></IconButton>
      </Stack>}
    </Box>
  );
}
