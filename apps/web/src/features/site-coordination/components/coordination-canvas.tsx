import { alpha, keyframes, useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Group, Image as CanvasImage, Layer, Rect, Stage, Text } from "react-konva";
import type { CoordinationContractor, CoordinationData, CoordinationInput, CoordinationItem, CoordinationPoint } from "@sts/shared";
import { COORDINATION_MAX, COORDINATION_MIN, coordinationGeometryError } from "@sts/shared";
import { CanvasItem, REDUCED_MOTION, TapRipple, type AreaDrag, type CanvasItemActions, type IconDrag } from "./canvas-item.js";
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
import Paper from "@mui/material/Paper";
import InputBase from "@mui/material/InputBase";
import Popper from "@mui/material/Popper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Konva from "konva";
import { clamp } from "../utils/canvas-geometry.js";
import { previewImagePath, scanContent } from "../utils/canvas-geometry.js";
import { routeMidpoint } from "../utils/canvas-geometry.js";
import { REPORT_ROOM } from "../utils/canvas-report.js";
import { reportBounds } from "../utils/canvas-report.js";
import { TEXT_LINE_HEIGHT } from "../utils/canvas-text.js";
import { CAPTION_FONT } from "../utils/canvas-text.js";
import { CAPTION_MAX_WIDTH } from "../utils/canvas-text.js";
import { CAPTION_LINE_HEIGHT } from "../utils/canvas-text.js";
import { MARK_SCALE } from "../utils/canvas-text.js";
import { CAPTION_MAX_LINES } from "../utils/canvas-text.js";
import { layoutTextTitle } from "../utils/canvas-text.js";

export type MapTool = "move" | "polygon" | "route";

interface Props {
  map: CoordinationData["map"]; contractors: CoordinationContractor[]; items: CoordinationItem[];
  selectedId: string | null; draft: CoordinationInput | null; draftId?: string; tool: MapTool; compact?: boolean;
  onSelect: (id: string) => void; onChange: (patch: Partial<CoordinationInput>) => void; onFinish: () => void;
  onDeselect: () => void; textEditing: boolean; onEditText: () => void;
  /** Layers the viewer switched off; the selected/edited job always shows everything. */
  display?: Pick<MapDisplay, "areas" | "labels" | "notes" | "links" | "chips" | "markSize">;
  /** Printed report: no grey margin, hints, zoom buttons or dragging; the view frames every job. */
  readOnly?: boolean;
  /** Stage height in px (the report sheet); default follows compact/width. */
  fixedHeight?: number;
  /** Phones: the stage takes the height of its (flex) parent instead of a fixed px height. */
  fill?: boolean;
  /** Add item: the next tap on the map is where the new job goes (`onPlace`); `onCancelPlace` backs out. */
  placing?: boolean;
  onPlace?: (at: CoordinationPoint) => void;
  onCancelPlace?: () => void;
  /** Called once the artwork is drawn with the framed stage (null when the image failed). Read-only only. */
  onReady?: (stage: Konva.Stage | null) => void;
  /** Road routes that cross or run along another contractor's route that day (id → other contractor ids). */
  clashes?: ReadonlyMap<string, string[]>;
  /** Register road names (no lines): one label per road, on its longest piece. */
  roadNames?: { name: string; pieces: CoordinationPoint[][] }[];
}

const NO_CLASHES: ReadonlyMap<string, string[]> = new Map();

const SELECTED_HINT = "ลากไอคอนไปจุดทำงาน · ลากพื้นที่เพื่อย้าย · มุมสี่เหลี่ยมปรับขนาด/หมุน · ดับเบิลคลิกเพื่อแก้ชื่อ · ตั้งค่าอื่นที่แผงด้านข้าง";
const IDLE_HINT = "คลิกงานเพื่อดูและแก้ไข · ลากผังว่างเพื่อเลื่อน · ล้อเมาส์เพื่อซูม";
// Visible for the first moments after a selection, then gone (the hint is a reminder, not permanent chrome).
const hintFade = keyframes`0%, 80% { opacity: 1; } 100% { opacity: 0; }`;

type DragApi = { area: (drag: AreaDrag | null) => void; icon: (drag: IconDrag | null) => void };
/** Owns the live drag offsets, so a drag frame re-renders only the jobs layer — not the Stage (whose
 *  context bridge re-wraps every app context on each render) nor the road layers. Moves are applied at
 *  most once per animation frame; a drop (null) applies at once and drops any pending move. */
function JobsLayer({ api, listening, children }: { api: RefObject<DragApi>; listening: boolean; children: (area: AreaDrag | null, icon: IconDrag | null) => ReactNode }) {
  const [area, setArea] = useState<AreaDrag | null>(null);
  const [icon, setIcon] = useState<IconDrag | null>(null);
  const pending = useRef<{ raf: number; area?: AreaDrag; icon?: IconDrag }>({ raf: 0 });
  useEffect(() => () => cancelAnimationFrame(pending.current.raf), []);
  const flush = () => {
    const p = pending.current; p.raf = 0;
    if (p.area) setArea(p.area);
    if (p.icon) setIcon(p.icon);
    p.area = undefined; p.icon = undefined;
  };
  api.current = {
    area: (drag) => { const p = pending.current; if (!drag) { p.area = undefined; setArea(null); return; } p.area = drag; if (!p.raf) p.raf = requestAnimationFrame(flush); },
    icon: (drag) => { const p = pending.current; if (!drag) { p.icon = undefined; setIcon(null); return; } p.icon = drag; if (!p.raf) p.raf = requestAnimationFrame(flush); },
  };
  return <Layer listening={listening}>{children(area, icon)}</Layer>;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
/** Phones report 2-3x screens; drawing the map at 3x costs 2.25x the pixels of 2x for little visible gain. */
const MAX_PIXEL_RATIO = 2;
/** After the wheel/pinch stops, the zoom is handed back to React (labels and line widths re-fit). */
const GESTURE_SETTLE_MS = 140;

const isCoarsePointer = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(pointer: coarse)").matches);

const SHOW_ALL = { areas: true, labels: true, notes: true, links: true, chips: true, markSize: MARK_SCALE };

export function CoordinationCanvas({ map, contractors, items, selectedId, draft, draftId, tool, compact, onSelect, onChange, onFinish, onDeselect, textEditing, onEditText, display = SHOW_ALL, readOnly = false, fixedHeight, fill = false, placing = false, onPlace, onCancelPlace, onReady, clashes = NO_CLASHES, roadNames = [] }: Props) {
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
  // Live drag offsets live in JobsLayer (below the Stage); jobs reach them through this ref.
  const dragApi = useRef<DragApi>({ area: () => {}, icon: () => {} });
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const pointerMoved = useRef(false);
  const areaDragStart = useRef<CoordinationPoint[] | null>(null);
  const areaDragNodeStart = useRef<{ x: number; y: number } | null>(null);
  const textDrag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const coarse = useMemo(isCoarsePointer, []);
  const companyById = useMemo(() => new Map(contractors.map((c) => [c.id, c])), [contractors]);
  const [hover, setHover] = useState<CoordinationPoint | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageError, setImageError] = useState(false);
  const [boxHeight, setBoxHeight] = useState(0);
  const height = fixedHeight ?? (fill ? boxHeight : compact ? 390 : width < 600 ? 430 : 620);
  const fit = Math.min(width / map.width, height / map.height);
  const scale = fit * zoom;
  // Icons, captions and line widths are sized against the fitted drawing (`fit`), not the zoom: they belong to the
  // map, so zooming in magnifies them with it and the icon-size controls are the only way to change them.
  // Read-only views (report snapshot, dashboard card) frame the jobs by zooming, so they keep a fixed screen size.
  const unit = readOnly ? scale : fit;
  const offset = { x: (width - map.width * fit) / 2 + pan.x, y: (height - map.height * fit) / 2 + pan.y };
  const contentBounds = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  // Default view = the drawing content (plus a small padding), not the whole
  // artwork with its empty margins. Also used by the "พอดีผัง" reset button.
  const frameContent = () => {
    const w = container.current?.clientWidth ?? width;
    const h = fixedHeight ?? (fill ? stageBox.current?.clientHeight ?? 0 : compact ? 390 : w < 600 ? 430 : 620);
    if (!h) return; // fill mode before the box is measured; framed once it is (below)
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
    const el = stageBox.current;
    if (!fill || !el) return;
    const observer = new ResizeObserver(() => setBoxHeight(el.clientHeight));
    setBoxHeight(el.clientHeight); observer.observe(el); return () => observer.disconnect();
  }, [fill, imageError]);
  // Fill mode: the artwork can load before the box has a height; frame it once the height is known.
  const measured = boxHeight > 0;
  useEffect(() => { if (fill && measured && image) frameContent(); }, [measured]);
  const fullImageRequested = useRef(false);
  useEffect(() => {
    let cancelled = false;
    setImage(null); setImageError(false); setPan({ x: 0, y: 0 }); setZoom(1);
    fullImageRequested.current = false;
    const load = (src: string, onFail: () => void) => {
      const source = new window.Image();
      source.decoding = "async";
      source.onload = () => {
        if (cancelled) return;
        // The scan runs in the file's own pixels; geometry lives in the full drawing's pixels.
        const found = scanContent(source);
        const sx = map.width / (source.naturalWidth || map.width), sy = map.height / (source.naturalHeight || map.height);
        contentBounds.current = found ? { x: found.x * sx, y: found.y * sy, w: found.w * sx, h: found.h * sy } : null;
        setImage(source);
        frameContent();
      };
      source.onerror = () => { if (!cancelled) onFail(); };
      source.src = src;
    };
    const loadFull = () => { fullImageRequested.current = true; load(map.imagePath, () => setImageError(true)); };
    // Live map: the light preview first (falls back to the original if no preview exists). Report: full size.
    if (readOnly) loadFull(); else load(previewImagePath(map.imagePath), loadFull);
    return () => { cancelled = true; };
  }, [map.imagePath]);
  // Desktop only: once zoomed in past what the preview can show sharply, swap in the full drawing.
  // Phones stay on the preview (the full PNG decodes to ~130 MB, too much for mid-range devices).
  useEffect(() => {
    if (readOnly || coarse || !image || fullImageRequested.current || image.naturalWidth >= map.width) return;
    if (map.width * scale * (window.devicePixelRatio || 1) < image.naturalWidth * 1.25) return;
    fullImageRequested.current = true;
    const full = new window.Image();
    full.decoding = "async";
    full.onload = () => setImage((current) => (current === image ? full : current));
    full.src = map.imagePath;
  }, [image, scale, readOnly, coarse, map.width, map.imagePath]);
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
  useEffect(() => {
    if (!placing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancelPlace?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placing, onCancelPlace]);
  const point = (allowClamp = false) => {
    const node = stage.current, pointer = node?.getPointerPosition();
    if (!node || !pointer) return null;
    const p = node.getAbsoluteTransform().copy().invert().point(pointer);
    if (!allowClamp && (p.x < COORDINATION_MIN * map.width || p.y < COORDINATION_MIN * map.height || p.x > COORDINATION_MAX * map.width || p.y > COORDINATION_MAX * map.height)) return null;
    return { x: clamp(p.x / map.width), y: clamp(p.y / map.height) };
  };
  const click = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (pointerMoved.current) return;
    // Placing a new job: anywhere inside the map counts, even on top of another job.
    if (placing) {
      const p = point();
      if (p) { setRipple({ x: p.x * map.width, y: p.y * map.height, key: Date.now() }); onPlace?.(p); }
      return;
    }
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
  // Zoom and pinch move the Konva stage directly (no React render per wheel tick / touch move); when the
  // gesture settles the view is committed to state once, which re-fits line widths and label sizes.
  const view = useRef({ fit, width, height, mapWidth: map.width, mapHeight: map.height });
  view.current = { fit, width, height, mapWidth: map.width, mapHeight: map.height };
  // Pan limits: the drawing plus its margin (where jobs may sit) can never leave the screen. When it is
  // bigger than the screen its edges stop at the screen edges; when smaller it slides only inside.
  const bound = (pos: { x: number; y: number }, s: number) => {
    const v = view.current;
    const lim = (p: number, size: number, box: number) => {
      const a = box - COORDINATION_MAX * size, b = -COORDINATION_MIN * size;
      return Math.min(Math.max(p, Math.min(a, b)), Math.max(a, b));
    };
    return { x: lim(pos.x, v.mapWidth * s, v.width), y: lim(pos.y, v.mapHeight * s, v.height) };
  };
  const settleTimer = useRef<number | null>(null);
  const gestures = useMemo(() => {
    const commit = () => {
      settleTimer.current = null;
      const node = stage.current; if (!node) return;
      const v = view.current;
      setZoom(node.scaleX() / v.fit);
      setPan({ x: node.x() - (v.width - v.mapWidth * v.fit) / 2, y: node.y() - (v.height - v.mapHeight * v.fit) / 2 });
    };
    const zoomBy = (factor: number, pivot: { x: number; y: number }) => {
      const node = stage.current; if (!node) return;
      const { fit: f } = view.current;
      const old = node.scaleX();
      const next = Math.max(f * MIN_ZOOM, Math.min(f * MAX_ZOOM, old * factor));
      const ratio = next / old;
      node.scale({ x: next, y: next });
      node.position(bound({ x: pivot.x - (pivot.x - node.x()) * ratio, y: pivot.y - (pivot.y - node.y()) * ratio }, next));
      node.batchDraw();
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(commit, GESTURE_SETTLE_MS);
    };
    return { zoomBy, commit };
  }, []);
  useEffect(() => () => { if (settleTimer.current !== null) window.clearTimeout(settleTimer.current); }, []);
  const changeZoom = (factor: number, pivot = { x: width / 2, y: height / 2 }) => gestures.zoomBy(factor, pivot);
  // Selecting a job whose area or icon (with its caption) is not fully on screen glides the view to it,
  // zooming out only when it cannot fit. A job already in view never moves the map.
  useEffect(() => {
    const node = stage.current;
    const item = draft && draftId === selectedId ? draft : items.find((i) => i.id === selectedId);
    if (readOnly || !node || !selectedId || !item) return;
    const t = node.getAbsoluteTransform();
    const pts = item.geometry.points.map((p) => t.point({ x: p.x * map.width, y: p.y * map.height }));
    if (item.areaKind !== "route") {
      const c = t.point({ x: item.x * map.width, y: item.y * map.height });
      const z = node.scaleX() / fit; // markers grow with the zoom, so their screen size does too
      const r = (24 * display.markSize * (item.iconScale ?? 1)) * z + 6;
      pts.push({ x: c.x - r, y: c.y - r }, { x: c.x + r, y: c.y + r + 30 * z }); // + caption under the ring
    }
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const pad = 24, bottom = coarse ? 120 : pad; // phones: clear the bottom sheet strip
    if (minX >= pad && minY >= pad && maxX <= width - pad && maxY <= height - bottom) return;
    const availW = width - pad * 2, availH = height - pad - bottom;
    const s0 = node.scaleX();
    const s = Math.max(fit * MIN_ZOOM, Math.min(s0, s0 * Math.min(availW / (maxX - minX || 1), availH / (maxY - minY || 1))));
    const k = s / s0, cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const to = bound({ x: pad + availW / 2 - (cx - node.x()) * k, y: pad + availH / 2 - (cy - node.y()) * k }, s);
    if (REDUCED_MOTION) { node.setAttrs({ ...to, scaleX: s, scaleY: s }); gestures.commit(); return; }
    node.to({ ...to, scaleX: s, scaleY: s, duration: 0.35, easing: Konva.Easings.StrongEaseOut, onFinish: gestures.commit });
  }, [selectedId]);
  // Two-finger pinch on phones/tablets: zoom around the fingers and pan with them.
  useEffect(() => {
    const el = stageBox.current;
    if (!el || readOnly) return;
    let last: { dist: number; cx: number; cy: number } | null = null;
    const read = (touches: TouchList) => {
      const rect = el.getBoundingClientRect(), a = touches[0]!, b = touches[1]!;
      return { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), cx: (a.clientX + b.clientX) / 2 - rect.left, cy: (a.clientY + b.clientY) / 2 - rect.top };
    };
    const move = (e: TouchEvent) => {
      if (e.touches.length !== 2) { last = null; return; }
      e.preventDefault();
      const node = stage.current; if (!node) return;
      if (node.isDragging()) node.stopDrag();
      const now = read(e.touches);
      if (last && last.dist > 0) {
        node.position({ x: node.x() + now.cx - last.cx, y: node.y() + now.cy - last.cy });
        gestures.zoomBy(now.dist / last.dist, { x: now.cx, y: now.cy });
      }
      last = now;
    };
    const end = (e: TouchEvent) => { if (e.touches.length < 2) last = null; };
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => { el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); };
  }, [readOnly, imageError, gestures]);
  // Cap the canvas resolution on 3x phones (each layer is a full-size canvas redrawn on every pan frame).
  useEffect(() => {
    const node = stage.current;
    if (!node || readOnly) return;
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    for (const layer of node.getLayers()) {
      const canvas = layer.getCanvas();
      if (canvas.getPixelRatio() !== ratio) { canvas.setPixelRatio(ratio); layer.batchDraw(); }
    }
  });
  // Stable callbacks for the (memoised) jobs; they always call the latest props.
  const latest = useRef({ onSelect, onEditText, onChange, onFinish, rectangleChange });
  latest.current = { onSelect, onEditText, onChange, onFinish, rectangleChange };
  const actions = useMemo<CanvasItemActions>(() => ({
    select: (id) => latest.current.onSelect(id),
    editText: (id) => { latest.current.onSelect(id); latest.current.onEditText(); },
    change: (patch) => latest.current.onChange(patch),
    finish: () => latest.current.onFinish(),
    rectangleChange: () => latest.current.rectangleChange(),
    setAreaDrag: (drag) => dragApi.current.area(drag),
    setIconDrag: (drag) => dragApi.current.icon(drag),
    areaDragStart, areaDragNodeStart,
  }), []);
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
  return <Box ref={container} sx={{ width: "100%", minWidth: 0, ...(fill && { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }) }}>
    {!readOnly && placing ? <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 0.75, borderBottom: "1px solid", borderColor: "divider", bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
      <AddOutlined fontSize="small" color="primary" />
      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>แตะบนผังตรงจุดที่ทำงาน</Typography>
      <Button size="small" color="inherit" onClick={onCancelPlace} sx={{ whiteSpace: "nowrap" }}>Cancel</Button>
    </Stack> : null}
    {imageError ? <Alert severity="error" sx={{ m: 1.5 }}>โหลดภาพผังไม่สำเร็จ กรุณาตรวจภาพพื้นหลังแล้วลองใหม่</Alert> : <Box ref={stageBox} role="img" aria-label="Daily plan. Select an item from the side list to see details." sx={{ position: "relative", bgcolor: "background.paper", touchAction: "none", cursor: drawingTool || placing ? "crosshair" : undefined, ...(fill && { flex: 1, minHeight: 0, overflow: "hidden" }) }}>
      <Stage ref={stage} width={width} height={height} scaleX={scale} scaleY={scale} x={offset.x} y={offset.y}         draggable={tool === "move" && !readOnly}
        dragBoundFunc={(pos) => bound(pos, stage.current?.scaleX() ?? scale)}
        onDragStart={() => setDragging(true)}
        onDragEnd={(e) => {
          setDragging(false);
          // A click fires right after a pan/drag; skip the deselect for that click only.
          pointerMoved.current = true; window.setTimeout(() => { pointerMoved.current = false; }, 0);
          if (e.target === stage.current) setPan({ x: e.target.x() - (width - map.width * fit) / 2, y: e.target.y() - (height - map.height * fit) / 2 });
        }}
        onMouseMove={() => { if (drawingTool) setHover(point()); }} onMouseLeave={() => setHover(null)}
        onClick={click} onTap={click} onWheel={readOnly ? undefined : (e) => {
          e.evt.preventDefault();
          // Proportional to the wheel distance: a mouse notch is ~15%, a trackpad pinch stays smooth.
          const delta = Math.max(-100, Math.min(100, e.evt.deltaY));
          changeZoom(Math.exp(-delta * 0.0015), stage.current?.getPointerPosition() ?? undefined);
        }}>
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
        {roadNames.length > 0 && <Layer listening={false}>
          {roadNames.map((road) => {
            const pieceLength = (pts: CoordinationPoint[]) =>
              pts.slice(1).reduce((sum, p, i) => sum + Math.hypot((p.x - pts[i]!.x) * map.width, (p.y - pts[i]!.y) * map.height), 0);
            const longest = road.pieces.reduce((a, b) => (pieceLength(b) > pieceLength(a) ? b : a), road.pieces[0] ?? []);
            if (longest.length < 2) return null;
            const mid = routeMidpoint(longest, map.width, map.height);
            return (
              <Group key={road.name} x={mid.x} y={mid.y} scaleX={display.markSize / unit} scaleY={display.markSize / unit}>
                <Text text={road.name} width={180} offsetX={90} offsetY={7} align="center" fontSize={12} fontStyle="bold"
                  fill={theme.palette.text.secondary} stroke={theme.palette.background.paper} strokeWidth={3} fillAfterStrokeEnabled />
              </Group>
            );
          })}
        </Layer>}
        {/* While placing, jobs ignore taps so a tap on top of one still places the new job. */}
        <JobsLayer api={dragApi} listening={!placing}>{(areaDrag, iconDrag) => <>
          {displayed.map(({ item, id, editing }) => {
            const company = companyById.get(item.contractorId);
            return <CanvasItem key={id} item={item} id={id} editing={editing} selected={id === selectedId || editing} hasDraft={Boolean(draft)} focus={Boolean(selectedId || draft)}
              color={company?.color ?? theme.palette.primary.main} code={company?.code} clash={item.areaKind === "route" && Boolean(clashes.get(id))}
              scale={unit} tool={tool} drawingTool={drawingTool} textEditing={textEditing} dragging={editing && dragging} display={display}
              dragOffset={areaDrag?.id === id ? areaDrag : null} iconDrag={iconDrag?.id === id ? iconDrag : null} mapWidth={map.width} mapHeight={map.height} coarse={coarse}
              actions={actions} rectangleRef={rectangle} transformerRef={transformer} />;
          })}
          {ripple && <TapRipple key={ripple.key} x={ripple.x} y={ripple.y} scale={scale} color={theme.palette.primary.main} onDone={() => setRipple(null)} />}
        </>}</JobsLayer>
      </Stage>
      {/* Selection hint: a small pill over the bottom of the map that fades out on its own. It floats (a bar above the
          map pushed the whole drawing down every time a job was selected) and never blocks a tap. */}
      {!readOnly && !drawingTool && !placing && (!fill || (draft && !coarse)) && (
        <Typography key={draftId ?? "idle"} variant="caption" color="text.secondary" noWrap
          title={draft ? SELECTED_HINT : IDLE_HINT}
          sx={{ position: "absolute", left: "50%", bottom: 14, transform: "translateX(-50%)", zIndex: 20, maxWidth: "calc(100% - 200px)", px: 1.5, py: 0.5,
            bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 999, pointerEvents: "none",
            animation: `${hintFade} 7s ease forwards`, "@media (prefers-reduced-motion: reduce)": { animation: "none" } }}>
          {draft ? SELECTED_HINT : IDLE_HINT}
        </Typography>
      )}
      {/* Drawing a road / free area (live, in the meeting): the instruction is a small pill at the top
          (never blocks taps) and the controls float at the bottom within thumb reach — Done is the one
          primary action, Undo is labelled (used often), Start over is icon-only (rare). */}
      {!readOnly && drawingTool && draft && (() => {
        const n = draft.geometry.points.length;
        const step = tool === "route"
          ? n === 0 ? "แตะจุดเริ่มต้นบนถนน" : n < 2 ? "แตะจุดถัดไปตามถนน" : "แตะต่อตามถนน หรือกด Done"
          : n === 0 ? "แตะมุมแรกของพื้นที่" : n < 3 ? `วางต่ออีก ${3 - n} มุม` : "แตะจุดแรกเพื่อปิดรูป หรือกด Done";
        const ready = n >= minPoints && !coordinationGeometryError(draft.geometry);
        const h = coarse ? 44 : 38;
        return <>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 30, maxWidth: "calc(100% - 24px)",
            px: 1.5, py: 0.75, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 999, pointerEvents: "none" }}>
            {tool === "route" ? <AddRoadOutlined fontSize="small" color="primary" /> : <PentagonOutlined fontSize="small" color="primary" />}
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{step}</Typography>
          </Stack>
          <Paper elevation={6} sx={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", zIndex: 31, p: 0.75, borderRadius: 999, display: "flex", gap: 0.75, alignItems: "center", maxWidth: "calc(100% - 24px)" }}>
            <Button variant="outlined" color="inherit" startIcon={<UndoOutlined />} disabled={!n} sx={{ height: h, borderRadius: 999, borderColor: "divider", whiteSpace: "nowrap" }}
              onClick={() => onChange({ geometry: { type: drawType, points: draft.geometry.points.slice(0, -1) } })}>Undo</Button>
            <Tooltip title="Start over"><span>
              <IconButton aria-label="Start over" disabled={!n} sx={{ width: h, height: h }} onClick={() => onChange({ geometry: { type: drawType, points: [] } })}><RestartAltOutlined /></IconButton>
            </span></Tooltip>
            <Button variant="contained" disableElevation startIcon={<CheckOutlined />} disabled={!ready} onClick={onFinish} sx={{ height: h, borderRadius: 999, px: 2.25, whiteSpace: "nowrap" }}>
              Done{n ? ` · ${n} จุด` : ""}
            </Button>
          </Paper>
        </>;
      })()}
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
          sx={{ position: "absolute", left: overlay.left, top: overlay.top, transform: `translate(-50%, -50%) scale(${zoom})`, width: Math.max(168, overlay.text.width), px: 1.5, py: "7px", borderRadius: 2, bgcolor: "background.paper", border: "2px solid", borderColor: overlay.color, fontSize: 13, fontWeight: 700, lineHeight: `${TEXT_LINE_HEIGHT}px`, "& textarea": { textAlign: "center", resize: "none", overflow: "hidden" } }} />
      ) : (
        // Icon caption editor: typed in place of the halo caption under the marker.
        <InputBase autoFocus multiline rows={overlay.caption.lines.length} value={draft.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="ชื่อเครื่องจักร…" inputProps={{ "aria-label": "ชื่อเครื่องจักรบนผัง" }}
          sx={{ position: "absolute", left: overlay.left, top: overlay.top + 28 * display.markSize * zoom, transform: `translateX(-50%) scale(${zoom})`, transformOrigin: "top center", width: Math.max(168, overlay.caption.width), px: 1, py: "4px", borderRadius: 1, bgcolor: "background.paper", border: "2px solid", borderColor: overlay.color, fontSize: 12, fontWeight: 600, lineHeight: `${CAPTION_LINE_HEIGHT}px`, "& textarea": { textAlign: "center", resize: "none", overflow: "hidden" } }} />
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
      {/* Phones: zoom sits above the floating Add item / Draw road buttons (they share the bottom edge). */}
      {!readOnly && <Stack direction="column" spacing={0.5} sx={{ position: "absolute", bottom: fill && coarse ? 72 : 14, right: 14, zIndex: 30, bgcolor: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", p: 0.5, borderRadius: 2, border: "1px solid rgba(0,0,0,0.12)", boxShadow: 2 }}>
        <IconButton size="small" aria-label="Zoom in" disabled={zoom >= 6} onClick={() => changeZoom(1.25)}><AddOutlined fontSize="small" /></IconButton>
        <Typography variant="caption" sx={{ textAlign: "center", fontSize: 10, fontWeight: 700 }}>{Math.round(zoom * 100)}%</Typography>
        <IconButton size="small" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => changeZoom(1 / 1.25)}><RemoveOutlined fontSize="small" /></IconButton>
        <IconButton size="small" aria-label="Fit map" onClick={frameContent}><RestartAltOutlined fontSize="small" /></IconButton>
      </Stack>}
    </Box>}
    {!image && !imageError && <Typography role="status" variant="caption" color="text.secondary">กำลังโหลดภาพผัง…</Typography>}
  </Box>;
}
