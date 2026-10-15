import AddOutlined from "@mui/icons-material/AddOutlined";
import RemoveOutlined from "@mui/icons-material/RemoveOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import { COORDINATION_MAX, COORDINATION_MIN, type CoordinationData, type CoordinationPoint } from "@sts/shared";
import type Konva from "konva";
import { Fragment, useEffect, useRef, useState } from "react";
import { Circle, Image as CanvasImage, Layer, Line, Stage } from "react-konva";
import { RouteMarks } from "./coordination-canvas.js";

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
}

const clamp = (n: number) => Math.max(COORDINATION_MIN, Math.min(COORDINATION_MAX, n));

// Map with road lines on top: used by the EPS road register and the road-request picker.
// Taps on empty map report a point; taps on a line report its id; vertices of the edited line drag.
export function RoadMapStage({
  map,
  lines,
  selectedId,
  draft,
  editPoints,
  height = 520,
  onTapMap,
  onTapLine,
  onMovePoint,
}: {
  map: CoordinationData["map"];
  lines: RoadLine[];
  selectedId?: string | null;
  /** Line being drawn (open), shown with its points. */
  draft?: CoordinationPoint[] | null;
  /** Points of the selected line that can be dragged. */
  editPoints?: CoordinationPoint[] | null;
  height?: number;
  onTapMap?: (p: CoordinationPoint) => void;
  onTapLine?: (id: string) => void;
  onMovePoint?: (index: number, p: CoordinationPoint) => void;
}) {
  const theme = useTheme();
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<Konva.Stage>(null);
  const [width, setWidth] = useState(600);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const moved = useRef(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ob = new ResizeObserver(() => setWidth(el.clientWidth));
    setWidth(el.clientWidth); ob.observe(el); return () => ob.disconnect();
  }, []);
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.src = map.imagePath;
  }, [map.imagePath]);
  const fit = Math.min(width / map.width, height / map.height);
  const scale = fit * zoom;
  const offset = { x: (width - map.width * fit) / 2 + pan.x, y: (height - map.height * fit) / 2 + pan.y };
  const px = (p: CoordinationPoint) => [p.x * map.width, p.y * map.height];
  const pointer = (): CoordinationPoint | null => {
    const s = stage.current, at = s?.getPointerPosition();
    if (!s || !at) return null;
    const p = s.getAbsoluteTransform().copy().invert().point(at);
    return { x: clamp(p.x / map.width), y: clamp(p.y / map.height) };
  };
  const zoomBy = (factor: number, pivot = { x: width / 2, y: height / 2 }) => {
    const next = Math.max(1, Math.min(8, zoom * factor));
    const r = next / zoom;
    setPan({ x: pivot.x - (pivot.x - offset.x) * r - (width - map.width * fit) / 2, y: pivot.y - (pivot.y - offset.y) * r - (height - map.height * fit) / 2 });
    setZoom(next);
  };
  const paper = theme.palette.background.paper;
  // One handler for the whole stage: a tapped road line reports the id stored on its Konva node
  // (per-line handlers went stale between renders), anything else is a tap on the map.
  const handleTap = (e: Konva.KonvaEventObject<Event>) => {
    if (moved.current) return;
    const target = e.target;
    if (onTapLine && target !== stage.current && target.name() === "road-line") { onTapLine(target.id()); return; }
    const p = pointer();
    if (p) onTapMap?.(p);
  };
  return (
    <Box ref={box} sx={{ position: "relative", width: "100%", minWidth: 0, touchAction: "none", bgcolor: "background.paper", cursor: onTapMap ? "crosshair" : undefined }}>
      <Stage
        ref={stage}
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={offset.x}
        y={offset.y}
        draggable
        onDragStart={() => { moved.current = true; }}
        onDragEnd={(e) => {
          if (e.target === stage.current) setPan({ x: e.target.x() - (width - map.width * fit) / 2, y: e.target.y() - (height - map.height * fit) / 2 });
          window.setTimeout(() => { moved.current = false; }, 0);
        }}
        onWheel={(e) => { e.evt.preventDefault(); zoomBy(e.evt.deltaY < 0 ? 1.15 : 1 / 1.15, stage.current?.getPointerPosition() ?? undefined); }}
        onClick={handleTap}
        onTap={handleTap}
      >
        <Layer listening={false}>{image && <CanvasImage image={image} width={map.width} height={map.height} />}</Layer>
        <Layer>
          {[...lines].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId)).map((line) => {
            const pts = line.points.flatMap(px);
            const on = line.id === selectedId;
            return (
              <Fragment key={line.id}>
                <Line points={pts} stroke={line.alert ? theme.palette.error.main : paper} strokeWidth={((on ? 9 : 7) + (line.alert ? 8 : 4)) / scale} lineCap="round" lineJoin="round" opacity={line.muted ? 0.5 : 0.95} listening={false} />
                <Line points={pts} stroke={line.color} strokeWidth={(on ? 9 : 7) / scale} lineCap="round" lineJoin="round" opacity={line.muted ? 0.45 : 1}
                  dash={line.dashed ? [14 / scale, 10 / scale] : undefined} hitStrokeWidth={26 / scale} id={line.id} name="road-line" />
                {(line.arrows || line.label) && line.points.length >= 2 && (
                  <RouteMarks points={line.points.map((p) => ({ x: p.x * map.width, y: p.y * map.height }))} dx={0} dy={0} color={line.color} paper={paper} scale={scale}
                    title={line.label ?? ""} textColor={theme.palette.text.primary} arrowsHidden={!line.arrows} />
                )}
              </Fragment>
            );
          })}
          {draft && draft.length > 0 && <>
            <Line points={draft.flatMap(px)} stroke={theme.palette.primary.main} strokeWidth={7 / scale} lineCap="round" lineJoin="round" dash={[12 / scale, 8 / scale]} listening={false} />
            {draft.map((p, i) => <Circle key={i} x={p.x * map.width} y={p.y * map.height} radius={6 / scale} fill={paper} stroke={theme.palette.primary.main} strokeWidth={2 / scale} listening={false} />)}
          </>}
          {editPoints && onMovePoint && editPoints.map((p, i) => (
            <Circle key={i} x={p.x * map.width} y={p.y * map.height} radius={8 / scale} fill={paper} stroke={theme.palette.primary.main} strokeWidth={2.5 / scale} draggable
              onDragMove={(e) => onMovePoint(i, { x: clamp(e.target.x() / map.width), y: clamp(e.target.y() / map.height) })}
              onClick={(e) => { e.cancelBubble = true; }} onTap={(e) => { e.cancelBubble = true; }} />
          ))}
        </Layer>
      </Stage>
      <Stack sx={{ position: "absolute", right: 8, bottom: 8, bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: 2 }}>
        <IconButton size="small" aria-label="ซูมเข้า" onClick={() => zoomBy(1.3)}><AddOutlined fontSize="small" /></IconButton>
        <IconButton size="small" aria-label="ซูมออก" onClick={() => zoomBy(1 / 1.3)}><RemoveOutlined fontSize="small" /></IconButton>
        <IconButton size="small" aria-label="พอดีผัง" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RestartAltOutlined fontSize="small" /></IconButton>
      </Stack>
    </Box>
  );
}
