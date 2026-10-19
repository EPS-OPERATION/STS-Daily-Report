import { useTheme } from "@mui/material/styles";
import { memo, useEffect, useMemo, useRef, type RefObject } from "react";
import { Circle, Group, Line, Rect, Text, Transformer } from "react-konva";
import Konva from "konva";
import { COORDINATION_ICON_SCALE_MAX, COORDINATION_ICON_SCALE_MIN, type CoordinationInput, type CoordinationItem, type CoordinationPoint } from "@sts/shared";
import { MachineIcon } from "./machine-icon.js";
import type { MapDisplay } from "./map-filters.js";
import { RouteMarks } from "./route-marks.js";
import { areaCentroid, areaDelta, clamp, nearestBoundaryPoint, routeMidpoint, shiftPoints } from "../utils/canvas-geometry.js";
import { CAPTION_FONT, CAPTION_LINE_HEIGHT, CAPTION_MAX_LINES, CAPTION_MAX_WIDTH, NOTE_FONT, NOTE_LINE_HEIGHT, TEXT_LINE_HEIGHT, layoutTextTitle } from "../utils/canvas-text.js";
import type { MapTool } from "./coordination-canvas.js";

export type AreaDrag = { id: string; x: number; y: number; source: "line" | "chip" };
/** Live position (0..1) of an icon being dragged; committed to the workspace once, on drop. */
export type IconDrag = { id: string; x: number; y: number };

/** Callbacks shared by every job on the map. Kept in one stable object (read through a ref by the
 *  canvas) so a job whose own data did not change is skipped by React.memo during drags and zooms. */
export interface CanvasItemActions {
  select: (id: string) => void;
  editText: (id: string) => void;
  change: (patch: Partial<CoordinationInput>) => void;
  finish: () => void;
  rectangleChange: () => void;
  setAreaDrag: (drag: AreaDrag | null) => void;
  setIconDrag: (drag: IconDrag | null) => void;
  areaDragStart: { current: CoordinationPoint[] | null };
  areaDragNodeStart: { current: { x: number; y: number } | null };
}

interface Props {
  item: CoordinationItem; id: string; editing: boolean; selected: boolean; hasDraft: boolean;
  /** Some job is selected or being edited: the others fade back. */
  focus: boolean;
  color: string; code: string | undefined; clash: boolean;
  scale: number; tool: MapTool; drawingTool: boolean; textEditing: boolean; dragging: boolean;
  display: Pick<MapDisplay, "areas" | "labels" | "notes" | "links" | "chips" | "markSize">;
  dragOffset: AreaDrag | null; iconDrag: IconDrag | null; mapWidth: number; mapHeight: number;
  /** Touch screens: bigger invisible hit areas and handles (a finger needs ~44px). */
  coarse: boolean;
  actions: CanvasItemActions;
  rectangleRef: RefObject<Konva.Rect | null>; transformerRef: RefObject<Konva.Transformer | null>;
}

// Motion: feedback only (place, select, hover), never looping. Reduced motion = instant states.
export const REDUCED_MOTION = typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
// Markers float above the drawing: a soft offset "lift" drawn as a plain shape (canvas blur shadows
// would redraw on every pan frame on phones). Map artwork, so a literal colour is allowed here.
const LIFT = "#101828";
const LIFT_OPACITY = 0.16;
/** White or dark text, whichever reads on a company colour (`#RRGGBB`). */
function textOn(hex: string, ink: string) {
  const n = parseInt(hex.slice(1, 7), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 165 ? ink : "#FFFFFF";
}

/** Transformer handles: pills on the sides (along the edge), a round rotate button with a rotate glyph. */
function styleAnchor(anchor: Konva.Rect, coarse: boolean, ink: string) {
  const name = anchor.name();
  const size = (w: number, h: number, r: number) => { anchor.width(w); anchor.height(h); anchor.offset({ x: w / 2, y: h / 2 }); anchor.cornerRadius(r); };
  // Touch: handles stay small to look at (they would bury a small area) but keep a finger-size hit ring.
  if (coarse) anchor.hitStrokeWidth(22);
  if (name.includes("rotater")) {
    const d = coarse ? 36 : 28;
    size(d, d, d / 2);
    anchor.sceneFunc((ctx, shape) => {
      const r = d / 2;
      ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.closePath(); ctx.fillStrokeShape(shape);
      // Rotate glyph (↻): a 3/4 clockwise arc and a filled arrowhead pointing along the arc's end.
      const g = d * 0.24, start = -Math.PI / 2 + 0.5, end = start + Math.PI * 1.45;
      ctx.beginPath(); ctx.arc(r, r, g, start, end);
      ctx.strokeStyle = ink; ctx.lineWidth = 1.75; ctx.lineCap = "round"; ctx.stroke();
      const nx = Math.cos(end), ny = Math.sin(end), tx = -ny, ty = nx; // outward normal, clockwise tangent
      const ex = r + g * nx, ey = r + g * ny, a = d * 0.13;
      ctx.beginPath();
      ctx.moveTo(ex + tx * a * 1.1, ey + ty * a * 1.1);
      ctx.lineTo(ex + nx * a, ey + ny * a);
      ctx.lineTo(ex - nx * a, ey - ny * a);
      ctx.closePath(); ctx.fillStyle = ink; ctx.fill();
    });
  } else if (name.includes("middle-left") || name.includes("middle-right")) size(7, 18, 4);
  else if (name.includes("top-center") || name.includes("bottom-center")) size(18, 7, 4);
  else size(12, 12, 6);
}

/** Ripple at the spot a new job was tapped onto the map (acknowledges the tap before the save returns). */
export function TapRipple({ x, y, scale, color, onDone }: { x: number; y: number; scale: number; color: string; onDone: () => void }) {
  const ref = useRef<Konva.Circle>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || REDUCED_MOTION) { onDone(); return; }
    const tween = new Konva.Tween({ node, radius: 44 / scale, opacity: 0, duration: 0.55, easing: Konva.Easings.StrongEaseOut, onFinish: onDone });
    tween.play();
    return () => tween.destroy();
  }, []);
  return <Circle ref={ref} x={x} y={y} radius={6 / scale} stroke={color} strokeWidth={3 / scale} opacity={0.8} listening={false} perfectDrawEnabled={false} />;
}

const CAPTION_OPTIONS ={ font: CAPTION_FONT, maxWidth: CAPTION_MAX_WIDTH, lineHeight: CAPTION_LINE_HEIGHT, maxLines: CAPTION_MAX_LINES, minWidth: 64 };
const NOTE_OPTIONS = { font: NOTE_FONT, maxWidth: CAPTION_MAX_WIDTH, lineHeight: NOTE_LINE_HEIGHT, maxLines: 2, minWidth: 64 };

export const CanvasItem = memo(function CanvasItem({ item, id, editing, selected, hasDraft, focus, color, code, clash, scale, tool, drawingTool, textEditing, dragging, display, dragOffset, iconDrag, mapWidth, mapHeight, coarse, actions, rectangleRef, transformerRef }: Props) {
  const theme = useTheme();
  const paper = theme.palette.background.paper;
  const editable = editing && tool === "move";
  const select = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => { if (!hasDraft || (tool === "move" && !editing)) { e.cancelBubble = true; actions.select(id); } };
  const editText = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => { if (tool !== "move") return; e.cancelBubble = true; actions.editText(id); };
  const area = item.geometry.points;
  const ix = iconDrag?.x ?? item.x, iy = iconDrag?.y ?? item.y;
  const isRectangle = editing && item.areaKind === "rectangle" && area.length === 4 && tool === "move";
  // Resize handles: corners always; a side's middle handle only when that side is long enough on screen
  // to hold it (≥48px: two corners + the pill with a gap; same rule for mouse and touch).
  const [p0, p1, , p3] = area;
  const wideEnough = Boolean(p0 && p1 && Math.hypot((p1.x - p0.x) * mapWidth, (p1.y - p0.y) * mapHeight) * scale >= 48);
  const tallEnough = Boolean(p0 && p3 && Math.hypot((p3.x - p0.x) * mapWidth, (p3.y - p0.y) * mapHeight) * scale >= 48);
  // Same array until a side crosses the threshold (a new array would refresh the frame on every drag frame).
  const rectAnchors = useMemo(() => ["top-left", "top-right", "bottom-left", "bottom-right",
    ...(wideEnough ? ["top-center", "bottom-center"] : []), ...(tallEnough ? ["middle-left", "middle-right"] : [])], [wideEnough, tallEnough]);
  const textLayout = item.icon === "text" ? layoutTextTitle(item.title) : null;
  // Live drag offset for this job. When the chip is dragged the area follows too (Konva only moves the
  // dragged node, so the shape is shifted through its points).
  const drawnArea = dragOffset?.source === "chip" ? shiftPoints(area, dragOffset.x / mapWidth, dragOffset.y / mapHeight) : area;
  const points = drawnArea.flatMap((p) => [p.x * mapWidth, p.y * mapHeight]);
  // Machinery label: the title always sits under the icon as halo text (no box).
  const captionLayout = item.icon !== "text" && item.title.trim() ? layoutTextTitle(item.title, CAPTION_OPTIONS) : null;
  const noteText = item.note?.replace(/\s+/g, " ").trim();
  const noteLayout = noteText && (display.notes || selected) && !(textEditing && editing) ? layoutTextTitle(noteText, NOTE_OPTIONS) : null;
  const captionShown = Boolean(captionLayout && (display.labels || selected) && !(textEditing && editing));
  // Icon markers: under the caption (or straight under the icon); text markers: under the pill.
  const noteY = item.icon === "text"
    ? (textLayout?.height ?? 0) / 2 + 4
    : 28 + (captionShown && captionLayout ? captionLayout.lines.length * CAPTION_LINE_HEIGHT + 2 : 0);
  const route = item.areaKind === "route";
  const center = route ? routeMidpoint(area, mapWidth, mapHeight) : areaCentroid(area, mapWidth, mapHeight);
  const a = drawnArea[0], b = drawnArea[1], d = drawnArea[3];
  const dim = focus ? (selected ? 1 : 0.45) : 1;
  const markScale = display.markSize / scale;
  // This job's own icon size (saved per job); captions under it are counter-scaled to stay readable.
  const size = route ? 1 : item.iconScale ?? 1;
  const markerScale = markScale * size;
  const liveSize = useRef(size);
  const rectStart = useRef<{ x: number; y: number } | null>(null);
  // Stable per (touch, ink) so the Transformer is not re-styled on every render.
  const inkSecondary = theme.palette.text.secondary;
  const anchorStyle = useMemo(() => (anchor: Konva.Rect) => styleAnchor(anchor, coarse, inkSecondary), [coarse, inkSecondary]);
  const tagText = clash ? theme.palette.error.contrastText : textOn(color, theme.palette.text.primary);
  // The marker that carries this job's identity: the icon (or text pill), or the company tag for a road.
  const markerRef = useRef<Konva.Group>(null);
  const pulseRef = useRef<Konva.Circle>(null);
  // A brand-new job (it mounts already being edited) drops in where it was placed.
  useEffect(() => {
    const node = markerRef.current;
    if (!editing || !node || REDUCED_MOTION) return;
    // Animate to the prop size (not the node's current scale: a re-run effect would compound the shrink).
    node.scale({ x: markerScale * 0.35, y: markerScale * 0.35 }); node.opacity(0);
    const tween = new Konva.Tween({ node, scaleX: markerScale, scaleY: markerScale, opacity: 1, duration: 0.35, easing: Konva.Easings.StrongEaseOut });
    tween.play();
    return () => { tween.destroy(); node.scale({ x: markerScale, y: markerScale }); node.opacity(1); };
  }, []);
  // Selecting a job sends one soft ring out from its icon.
  useEffect(() => {
    const ring = pulseRef.current;
    if (!selected || !ring || REDUCED_MOTION) return;
    ring.radius(24); ring.opacity(0.6);
    ring.to({ radius: 48, opacity: 0, duration: 0.5, easing: Konva.Easings.StrongEaseOut });
  }, [selected]);
  // Mouse only: the marker lifts a little under the pointer.
  const hover = coarse || REDUCED_MOTION ? undefined : (on: boolean) => (e: Konva.KonvaEventObject<MouseEvent>) => {
    const node = e.currentTarget;
    // Not on the job being edited: a lift tween started mid-resize would land on the old size.
    if (editing) return;
    const base = !route && node === markerRef.current ? markerScale : markScale;
    node.to({ scaleX: base * (on ? 1.08 : 1), scaleY: base * (on ? 1.08 : 1), duration: on ? 0.15 : 0.12, easing: Konva.Easings.EaseOut });
    const box = node.getStage()?.container();
    if (box && tool === "move") box.style.cursor = on ? "pointer" : "";
  };
  const startAreaDrag = (e: Konva.KonvaEventObject<DragEvent>) => { actions.areaDragStart.current = area; actions.areaDragNodeStart.current = { x: e.target.x(), y: e.target.y() }; };
  const endAreaDrag = (e: Konva.KonvaEventObject<DragEvent>, resetNode: boolean) => {
    const base = actions.areaDragStart.current ?? area, s = actions.areaDragNodeStart.current;
    actions.areaDragStart.current = null; actions.areaDragNodeStart.current = null; actions.setAreaDrag(null);
    if (!s) return;
    const { dx, dy } = areaDelta(e, s, base, mapWidth, mapHeight);
    if (resetNode) e.target.position({ x: 0, y: 0 });
    actions.change({ geometry: { type: item.geometry.type, points: shiftPoints(base, dx, dy) } });
  };
  return <Group onDblClick={editText} onDblTap={editText}>
    {!route && area[0] && item.linkArea !== false && (display.links || selected) && (display.areas || selected) && (() => {
      const dragArea = dragOffset ? shiftPoints(area, dragOffset.x / mapWidth, dragOffset.y / mapHeight) : area;
      const anchor = nearestBoundaryPoint(dragArea, ix * mapWidth, iy * mapHeight, mapWidth, mapHeight, !route);
      return <Line points={[ix * mapWidth, iy * mapHeight, anchor.x, anchor.y]} stroke={color} strokeWidth={1.75 / scale} dash={[6 / scale, 5 / scale]} lineCap="round" opacity={selected ? 1 : 0.7} listening={false} perfectDrawEnabled={false} />;
    })()}
    {isRectangle && a && b && d ? <Rect ref={rectangleRef} x={a.x * mapWidth} y={a.y * mapHeight}
      width={Math.hypot((b.x - a.x) * mapWidth, (b.y - a.y) * mapHeight)} height={Math.hypot((d.x - a.x) * mapWidth, (d.y - a.y) * mapHeight)}
      rotation={Math.atan2((b.y - a.y) * mapHeight, (b.x - a.x) * mapWidth) * 180 / Math.PI} scaleX={1} scaleY={1}
      fill={`${color}33`} stroke={color} strokeWidth={2.5 / scale} draggable
      // Body drag: Konva moves the rectangle; only the canvas follows (tag + link line) until the drop saves once.
      onDragStart={(e) => { rectStart.current = { x: e.target.x(), y: e.target.y() }; }}
      onDragMove={(e) => { const s = rectStart.current; if (s) actions.setAreaDrag({ id, x: e.target.x() - s.x, y: e.target.y() - s.y, source: "line" }); }}
      onDragEnd={() => { rectStart.current = null; actions.setAreaDrag(null); actions.rectangleChange(); }}
      onTransformEnd={actions.rectangleChange} />
      : (display.areas || selected) && <>
        {/* A road route: thick open line on a light casing; the casing turns red on a clash. */}
        {route && area.length >= 2 && <Line points={points} x={dragOffset?.source === "line" ? dragOffset.x : 0} y={dragOffset?.source === "line" ? dragOffset.y : 0}
          stroke={clash ? theme.palette.error.main : paper} strokeWidth={((selected ? 8 : 6) + (clash ? 8 : 4)) / scale}
          lineCap="round" lineJoin="round" opacity={focus ? (selected ? 1 : 0.6) : 0.95} listening={false} perfectDrawEnabled={false} />}
        <Line points={points} closed={!route} fill={route ? undefined : `${color}${selected ? "33" : "1A"}`} fillEnabled={!route && area.length >= 3} opacity={dim}
          stroke={color} strokeWidth={(route ? (selected ? 8 : 6) : (selected ? 2.5 : 1.75)) / scale} lineCap="round" lineJoin="round" perfectDrawEnabled={false}
          hitStrokeWidth={route ? (coarse ? 36 : 24) / scale : undefined} onClick={select} onTap={select}
          draggable={editable}
          onDragStart={startAreaDrag}
          onDragMove={(e) => { const s = actions.areaDragNodeStart.current; if (s) actions.setAreaDrag({ id, x: e.target.x() - s.x, y: e.target.y() - s.y, source: "line" }); }}
          onDragEnd={(e) => endAreaDrag(e, true)} /></>}
    {route && area.length >= 2 && (display.areas || selected) && <RouteMarks
      points={drawnArea.map((p) => ({ x: p.x * mapWidth, y: p.y * mapHeight }))}
      dx={dragOffset?.source === "line" ? dragOffset.x : 0} dy={dragOffset?.source === "line" ? dragOffset.y : 0}
      color={color} paper={paper} scale={scale}
      title={(display.labels || selected) && !(textEditing && editing) ? item.title : ""} textColor={theme.palette.text.primary} twoWay={item.twoWay === true} markScale={display.markSize} />}
    {/* Canva-style frame: solid company-colour border, round corners, pill side handles, and a round
        rotate button under the shape. Touch: corners only (eight finger-size handles pile up). */}
    {isRectangle && <Transformer ref={transformerRef} flipEnabled={false} borderStroke={color} borderStrokeWidth={2}
      anchorStroke={theme.palette.grey[400]} anchorFill={paper} anchorStrokeWidth={1} anchorCornerRadius={99} anchorSize={12}
      rotateEnabled rotateAnchorAngle={180} rotateLineVisible={false} rotateAnchorOffset={coarse ? 44 : 36}
      enabledAnchors={rectAnchors}
      anchorStyleFunc={anchorStyle} />}
    {editing && (item.areaKind === "polygon" || route || drawingTool) && area.map((p, index) => {
      const closing = index === 0 && tool === "polygon" && area.length >= 3;
      const tap = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => { e.cancelBubble = true; if (closing) actions.finish(); };
      return <Circle key={index} x={p.x * mapWidth + (dragOffset?.x ?? 0)} y={p.y * mapHeight + (dragOffset?.y ?? 0)} radius={(closing ? 11 : 6) / scale}
        fill={closing ? color : paper} stroke={color} strokeWidth={2 / scale} hitStrokeWidth={coarse ? 30 / scale : undefined}
        draggable onDragMove={(e) => actions.change({ geometry: { type: item.geometry.type, points: area.map((v, i) => i === index ? { x: clamp(e.target.x() / mapWidth), y: clamp(e.target.y() / mapHeight) } : v) } })}
        onClick={tap} onTap={tap} />;
    })}
    {(display.chips || selected) && <Group ref={route ? markerRef : undefined} x={center.x + (dragOffset?.x ?? 0)} y={center.y + (dragOffset?.y ?? 0)} scaleX={markScale} scaleY={markScale} draggable={editable}
      onClick={select} onTap={select} onMouseEnter={hover?.(true)} onMouseLeave={hover?.(false)}
      onDragStart={startAreaDrag}
      onDragMove={(e) => {
        const base = actions.areaDragStart.current, s = actions.areaDragNodeStart.current;
        if (!base || !s) return;
        const { dx, dy } = areaDelta(e, s, base, mapWidth, mapHeight);
        e.target.position({ x: s.x + dx * mapWidth, y: s.y + dy * mapHeight });
        actions.setAreaDrag({ id, x: dx * mapWidth, y: dy * mapHeight, source: "chip" });
      }}
      onDragEnd={(e) => endAreaDrag(e, false)}>
      {/* Company tag: a pill filled with the company colour (white keyline over the drawing). */}
      <Rect x={-34} y={-9} width={68} height={22} fill={LIFT} opacity={LIFT_OPACITY} cornerRadius={11} listening={false} perfectDrawEnabled={false} />
      <Rect x={-34} y={-11} width={68} height={22} fill={clash ? theme.palette.error.main : color} stroke={paper} strokeWidth={selected ? 2.5 : 1.5} cornerRadius={11}
        hitStrokeWidth={coarse ? 20 : undefined} perfectDrawEnabled={false} />
      <Text x={-34} y={-6.5} width={68} text={code ?? "—"} fontFamily="Inter" fontSize={12} fontStyle="bold" letterSpacing={0.4} align="center" fill={tagText} listening={false} perfectDrawEnabled={false} />
    </Group>}
    {/* Icon drag frames only re-render the canvas (the link line follows); the workspace and the
        debounced auto-save get one change on drop instead of ~60 per second. */}
    {!route && <Group ref={markerRef} x={ix * mapWidth} y={iy * mapHeight} scaleX={markerScale} scaleY={markerScale} draggable={editable}
      onClick={select} onTap={select} onMouseEnter={hover?.(true)} onMouseLeave={hover?.(false)}
      onDragMove={(e) => {
        const x = clamp(e.target.x() / mapWidth), y = clamp(e.target.y() / mapHeight);
        e.target.position({ x: x * mapWidth, y: y * mapHeight });
        actions.setIconDrag({ id, x, y });
      }}
      onDragEnd={(e) => { actions.setIconDrag(null); actions.change({ x: clamp(e.target.x() / mapWidth), y: clamp(e.target.y() / mapHeight) }); }}>
      {item.icon === "text" ? (textEditing && editing && !dragging ? null : <>
        {/* Plain-text marker: the title auto-sizes the pill and wraps (max 3 lines + ellipsis).
            Double-click/tap enters text editing (an HTML textarea typed directly on the map). */}
        <Rect x={-textLayout!.width / 2} y={-textLayout!.height / 2 + 2} width={textLayout!.width} height={textLayout!.height} fill={LIFT} opacity={LIFT_OPACITY} cornerRadius={Math.min(16, textLayout!.height / 2)} listening={false} perfectDrawEnabled={false} />
        <Rect x={-textLayout!.width / 2} y={-textLayout!.height / 2} width={textLayout!.width} height={textLayout!.height} fill={paper} stroke={color} strokeWidth={selected ? 3 : 2} cornerRadius={Math.min(16, textLayout!.height / 2)}
          hitStrokeWidth={coarse ? 20 : undefined} perfectDrawEnabled={false} />
        <Text x={-textLayout!.width / 2 + 12} y={-textLayout!.height / 2 + 7} width={textLayout!.width - 24} text={textLayout!.lines.join("\n")} fontFamily="Inter" fontSize={13} fontStyle="bold" lineHeight={TEXT_LINE_HEIGHT / 13} align="center" fill={theme.palette.text.primary} listening={false} perfectDrawEnabled={false} />
      </>) : <>
        {/* On touch screens the ring's invisible hit area grows so a finger can grab the icon. */}
        {/* Select pulse (starts invisible), lift, then the white disc with a solid company-colour ring. */}
        <Circle ref={pulseRef} radius={24} stroke={color} strokeWidth={3} opacity={0} listening={false} perfectDrawEnabled={false} />
        <Circle y={2} radius={25} fill={LIFT} opacity={LIFT_OPACITY} listening={false} perfectDrawEnabled={false} />
        <Circle radius={24} fill={paper} stroke={color} strokeWidth={selected ? 4 : 3} hitStrokeWidth={coarse ? 24 : undefined} perfectDrawEnabled={false} />
        <MachineIcon icon={item.icon} color={color} rotation={item.rotation} />
      </>}
      {/* Caption + note hang under the ring/pill and grow with √size: a bigger icon gets a bigger name,
          but 250% icon → 1.6× text (not 2.5×), so labels stay in proportion with the rest of the map. */}
      <Group y={item.icon === "text" ? noteY : 28} scaleX={Math.sqrt(size) / size} scaleY={Math.sqrt(size) / size} listening={false}>
        {item.icon !== "text" && captionShown && captionLayout && <Text x={-captionLayout.width / 2} width={captionLayout.width} text={captionLayout.lines.join("\n")} fontFamily="Inter" fontSize={12} fontStyle="600" lineHeight={CAPTION_LINE_HEIGHT / 12} align="center" fill={theme.palette.text.primary} stroke={paper} strokeWidth={3} fillAfterStrokeEnabled perfectDrawEnabled={false} />}
        {noteLayout && <Text x={-noteLayout.width / 2} y={item.icon === "text" ? 0 : noteY - 28} width={noteLayout.width} text={noteLayout.lines.join("\n")} fontFamily="Inter" fontSize={11} lineHeight={NOTE_LINE_HEIGHT / 11} align="center" fill={theme.palette.text.secondary} stroke={paper} strokeWidth={3} fillAfterStrokeEnabled perfectDrawEnabled={false} />}
      </Group>
      {/* Resize handle on the ring (45°): drag out/in to size this job's icon; saved once on drop. */}
      {editable && selected && item.icon !== "text" && <Circle x={17} y={17} radius={9 / (display.markSize * size)} fill={paper} stroke={color} strokeWidth={2 / (display.markSize * size)}
        hitStrokeWidth={(coarse ? 24 : 10) / (display.markSize * size)} perfectDrawEnabled={false} draggable
        onMouseEnter={(e) => { const box = e.target.getStage()?.container(); if (box) box.style.cursor = "nwse-resize"; }}
        onMouseLeave={(e) => { const box = e.target.getStage()?.container(); if (box) box.style.cursor = ""; }}
        onDragStart={(e) => { e.cancelBubble = true; liveSize.current = size; }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          const group = markerRef.current, pointer = e.target.getStage()?.getPointerPosition();
          if (!group || !pointer) return;
          const c = group.getAbsolutePosition();
          // The ring's on-screen radius is 24 × markSize × size, so the pointer distance gives the size.
          const next = Math.min(COORDINATION_ICON_SCALE_MAX, Math.max(COORDINATION_ICON_SCALE_MIN, Math.hypot(pointer.x - c.x, pointer.y - c.y) / (24 * display.markSize)));
          liveSize.current = next;
          group.scale({ x: markScale * next, y: markScale * next });
          e.target.position({ x: 17, y: 17 });
        }}
        onDragEnd={(e) => { e.cancelBubble = true; actions.change({ iconScale: Math.round(liveSize.current * 100) / 100 }); }} />}
    </Group>}
  </Group>;
});
