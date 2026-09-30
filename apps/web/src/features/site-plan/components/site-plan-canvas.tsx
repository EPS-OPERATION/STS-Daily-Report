import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import Konva from "konva";
import { useEffect, useRef, useState } from "react";
import {
  flattenPoints,
  polygonBounds,
  polygonCenter,
  type MapPoint,
  type ResizeHandleId,
} from "../utils/coordinates.js";
import { beginVertexInteraction, shouldSelectVertexFromClick } from "../utils/konva-events.js";
import type { Viewport } from "../hooks/use-site-plan-viewport.js";

export interface CanvasArea {
  key: string;
  points: MapPoint[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  dash?: number[];
  code: string;
  statusLabel?: string;
  statusColor?: string;
  selectionUnderstroke?: string;
}

export interface CanvasVertexHandles {
  areaKey: string;
  points: MapPoint[];
  radius: number;
  hitStrokeWidth: number;
}

export interface CanvasRotateHandle {
  areaKey: string;
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  radius: number;
}

export interface CanvasResizeHandles {
  areaKey: string;
  size: number;
  handles: { id: ResizeHandleId; x: number; y: number }[];
}

// Layout-driven Konva surface. All coordinates are map-space;
// viewport transforms never leak into geometry.
export function SitePlanCanvas({
  backgroundUrl,
  mapW,
  mapH,
  areas,
  selectedKey,
  selectionPulseKey,
  editMode,
  vertexHandles,
  rotateHandle = null,
  resizeHandles = null,
  drawing,
  stageDraggable,
  viewport,
  containerRef,
  stageRef,
  size,
  onStageClick,
  onStageDrag,
  onAreaClick,
  onAreaHover,
  onShapeDragStart,
  onShapeDragEnd,
  onRotateDragMove,
  onRotateDragEnd,
  onResizeDragStart,
  onResizeDragMove,
  onResizeDragEnd,
  onVertexDrag,
  onVertexDown,
  onVertexUp,
  onVertexClick,
  onImageLoad,
  onImageError,
}: {
  backgroundUrl: string | null;
  mapW: number;
  mapH: number;
  areas: CanvasArea[];
  selectedKey: string | null;
  selectionPulseKey?: number;
  editMode: boolean;
  vertexHandles: CanvasVertexHandles | null;
  rotateHandle?: CanvasRotateHandle | null;
  resizeHandles?: CanvasResizeHandles | null;
  drawing: MapPoint[] | null;
  stageDraggable: boolean;
  viewport: Viewport;
  containerRef: React.RefCallback<HTMLDivElement>;
  stageRef: React.RefObject<Konva.Stage | null>;
  size: { w: number; h: number };
  onStageClick: () => void;
  onStageDrag: () => void;
  onAreaClick: (key: string) => void;
  onAreaHover?: (key: string | null, point?: MapPoint) => void;
  onShapeDragStart?: () => void;
  onShapeDragEnd?: (areaKey: string, dx: number, dy: number) => void;
  onRotateDragMove?: (areaKey: string, point: MapPoint) => void;
  onRotateDragEnd?: (areaKey: string, point: MapPoint) => void;
  onResizeDragStart?: (areaKey: string, handleId: ResizeHandleId) => void;
  onResizeDragMove?: (areaKey: string, handleId: ResizeHandleId, point: MapPoint) => void;
  onResizeDragEnd?: (areaKey: string, handleId: ResizeHandleId, point: MapPoint) => void;
  onVertexDrag: (areaKey: string, index: number, pt: MapPoint) => void;
  onVertexDown: () => void;
  onVertexUp: () => void;
  onVertexClick: (areaKey: string, index: number) => void;
  onImageLoad: () => void;
  onImageError: () => void;
}) {
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [shapeDragging, setShapeDragging] = useState(false);
  const dragMoved = useRef(false);
  const areaLineRefs = useRef(new Map<string, Konva.Line>());
  const selectionLineRefs = useRef(new Map<string, Konva.Line>());
  const selectionPulseLineRef = useRef<Konva.Line | null>(null);
  const selectionPulseTweenRef = useRef<Konva.Tween | null>(null);

  const updateAreaLineDuringDrag = (areaKey: string, index: number, point: MapPoint) => {
    const area = areas.find((item) => item.key === areaKey);
    const line = areaLineRefs.current.get(areaKey);
    if (!area || !line) return;
    const points = area.points.map((current, currentIndex) => (currentIndex === index ? point : current));
    const flatPoints = flattenPoints(points);
    line.points(flatPoints);
    selectionLineRefs.current.get(areaKey)?.points(flatPoints);
    line.getLayer()?.batchDraw();
  };

  useEffect(() => {
    if (!backgroundUrl) {
      setBgImage(null);
      onImageError();
      return;
    }
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (live) {
        setBgImage(img);
        onImageLoad();
      }
    };
    img.onerror = () => {
      if (live) {
        setBgImage(null);
        onImageError();
      }
    };
    img.src = backgroundUrl;
    return () => {
      live = false;
    };
  }, [backgroundUrl, onImageError, onImageLoad]);

  useEffect(() => {
    const line = selectionPulseLineRef.current;
    if (!line || !selectionPulseKey) return;

    selectionPulseTweenRef.current?.destroy();
    const initialStrokeWidth = Math.max(4, line.strokeWidth() - 4);
    line.strokeWidth(initialStrokeWidth);
    line.opacity(0.42);
    const tween = new Konva.Tween({
      node: line,
      duration: 0.2,
      easing: Konva.Easings.EaseOut,
      opacity: 0,
      strokeWidth: initialStrokeWidth + 6,
    });
    selectionPulseTweenRef.current = tween;
    tween.play();

    return () => {
      tween.destroy();
      if (selectionPulseTweenRef.current === tween) selectionPulseTweenRef.current = null;
    };
  }, [selectedKey, selectionPulseKey]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      {size.w > 0 && (
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          x={viewport.x}
          y={viewport.y}
          draggable={stageDraggable}
          onClick={onStageClick}
          onTap={onStageClick}
          onDragMove={onStageDrag}
          onDragEnd={onStageDrag}
        >
          <Layer>
            {bgImage ? (
              <KonvaImage image={bgImage} x={0} y={0} width={mapW} height={mapH} listening={false} />
            ) : (
              <Rect x={0} y={0} width={mapW} height={mapH} fill="#EFF3F6" listening={false} />
            )}
          </Layer>
          <Layer>
            {areas.map((a) => (
              <Group key={a.key}>
                {selectionPulseKey && a.key === selectedKey ? (
                  <Line
                    ref={selectionPulseLineRef}
                    points={flattenPoints(a.points)}
                    closed
                    stroke={a.stroke}
                    strokeWidth={a.strokeWidth + 8}
                    opacity={0}
                    lineJoin="round"
                    lineCap="round"
                    strokeScaleEnabled={false}
                    listening={false}
                  />
                ) : null}
                {a.selectionUnderstroke ? (
                  <Line
                    points={flattenPoints(a.points)}
                    closed
                    stroke={a.selectionUnderstroke}
                    strokeWidth={a.strokeWidth + 3}
                    lineJoin="round"
                    lineCap="round"
                    strokeScaleEnabled={false}
                    listening={false}
                    ref={(node) => {
                      if (node) selectionLineRefs.current.set(a.key, node);
                      else selectionLineRefs.current.delete(a.key);
                    }}
                  />
                ) : null}
                <Line
                  ref={(node) => {
                    if (node) areaLineRefs.current.set(a.key, node);
                    else areaLineRefs.current.delete(a.key);
                  }}
                  points={flattenPoints(a.points)}
                  closed
                  fill={a.fill}
                  stroke={a.stroke}
                  strokeWidth={a.strokeWidth}
                  lineJoin="round"
                  lineCap="round"
                  strokeScaleEnabled={false}
                  dash={a.dash}
                  hitStrokeWidth={14 / viewport.scale}
                  draggable={editMode && a.key === selectedKey}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    onAreaClick(a.key);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    onAreaClick(a.key);
                  }}
                  onMouseEnter={(e) => {
                    const point = e.target.getStage()?.getPointerPosition();
                    if (point) onAreaHover?.(a.key, { x: point.x, y: point.y });
                  }}
                  onMouseLeave={() => onAreaHover?.(null)}
                  onDragStart={(e) => {
                    e.cancelBubble = true;
                    setShapeDragging(true);
                    onShapeDragStart?.();
                  }}
                  onDragEnd={(e) => {
                    e.cancelBubble = true;
                    const dx = e.target.x();
                    const dy = e.target.y();
                    e.target.x(0);
                    e.target.y(0);
                    setShapeDragging(false);
                    if (dx !== 0 || dy !== 0) onShapeDragEnd?.(a.key, dx, dy);
                    else onShapeDragEnd?.(a.key, 0, 0);
                  }}
                />
              </Group>
            ))}
          </Layer>
          <Layer listening={false}>
            {(() => {
              // Label de-collision: smaller zones first so a parent outline
              // never covers its children's codes; any label whose box would
              // overlap an already-placed one is skipped.
              const scale = viewport.scale;
              const candidates = areas
                .filter((a) => a.code)
                .map((a) => {
                  const c = polygonCenter(a.points);
                  const b = polygonBounds(a.points);
                  return { a, c, size: b.w * b.h };
                })
                .sort((p, q) => p.size - q.size);
              const placed: { x: number; y: number; w: number; h: number }[] = [];
              return candidates.flatMap(({ a, c }) => {
                const w = 64 / scale;
                const h = 22 / scale;
                const box = { x: c.x - w / 2, y: c.y - h / 2, w, h };
                if (
                  placed.some(
                    (p) => box.x < p.x + p.w && box.x + box.w > p.x && box.y < p.y + p.h && box.y + box.h > p.y,
                  )
                ) {
                  return [];
                }
                placed.push(box);
                const selected = a.key === selectedKey;
                return (
                  <Group key={`label-${a.key}`}>
                    <Text
                      x={c.x}
                      y={c.y - 7 / scale}
                      text={a.code}
                      fontSize={14 / scale}
                      fontStyle={selected ? "bold" : "normal"}
                      fontFamily="Inter, sans-serif"
                      fill="#18212F"
                      align="center"
                      offsetX={30 / scale}
                      width={60 / scale}
                    />
                    {a.statusLabel ? (
                      <Circle
                        x={c.x + 22 / scale}
                        y={c.y}
                        radius={3.5 / scale}
                        fill={a.statusColor ?? "#18212F"}
                        stroke="#FFFFFF"
                        strokeWidth={1.25 / scale}
                      />
                    ) : null}
                  </Group>
                );
              });
            })()}
          </Layer>
          {editMode && vertexHandles && !shapeDragging ? (
            <Layer>
              {vertexHandles.points.map((p, i) => (
                <KonvaCircleHandle
                  key={i}
                  x={p.x}
                  y={p.y}
                  radius={vertexHandles.radius}
                  hitStrokeWidth={vertexHandles.hitStrokeWidth}
                  areaKey={vertexHandles.areaKey}
                  index={i}
                  onVertexDrag={onVertexDrag}
                  onVertexDown={onVertexDown}
                  onVertexUp={onVertexUp}
                  onVertexClick={onVertexClick}
                  onVertexDragMove={updateAreaLineDuringDrag}
                  dragMoved={dragMoved}
                />
              ))}
              {rotateHandle && rotateHandle.areaKey === vertexHandles.areaKey ? (
                <KonvaRotateHandle
                  x={rotateHandle.x}
                  y={rotateHandle.y}
                  centerX={rotateHandle.centerX}
                  centerY={rotateHandle.centerY}
                  radius={rotateHandle.radius}
                  hitStrokeWidth={vertexHandles.hitStrokeWidth}
                  areaKey={rotateHandle.areaKey}
                  onRotateDragMove={onRotateDragMove ?? (() => undefined)}
                  onRotateDragEnd={onRotateDragEnd ?? (() => undefined)}
                  onRotateDown={onVertexDown}
                  onRotateUp={onVertexUp}
                />
              ) : null}
              {resizeHandles && resizeHandles.areaKey === vertexHandles.areaKey
                ? resizeHandles.handles.map((handle) => (
                    <KonvaResizeHandle
                      key={handle.id}
                      x={handle.x}
                      y={handle.y}
                      size={resizeHandles.size}
                      hitStrokeWidth={vertexHandles.hitStrokeWidth}
                      areaKey={resizeHandles.areaKey}
                      handleId={handle.id}
                      onResizeDragStart={onResizeDragStart ?? (() => undefined)}
                      onResizeDragMove={onResizeDragMove ?? (() => undefined)}
                      onResizeDragEnd={onResizeDragEnd ?? (() => undefined)}
                      onResizeDown={onVertexDown}
                      onResizeUp={onVertexUp}
                    />
                  ))
                : null}
            </Layer>
          ) : null}
          {drawing && drawing.length > 0 ? (
            <Layer listening={false}>
              <Line
                points={flattenPoints(drawing)}
                stroke="#0B4D8B"
                strokeWidth={2 / viewport.scale}
                dash={[8, 5]}
                closed={false}
              />
              {drawing.map((p, i) => (
                <KonvaCircleStatic key={i} x={p.x} y={p.y} radius={4 / viewport.scale} />
              ))}
            </Layer>
          ) : null}
        </Stage>
      )}
    </div>
  );
}

function KonvaCircleHandle({
  x,
  y,
  radius,
  hitStrokeWidth,
  areaKey,
  index,
  onVertexDrag,
  onVertexDown,
  onVertexUp,
  onVertexClick,
  onVertexDragMove,
  dragMoved,
}: {
  x: number;
  y: number;
  radius: number;
  hitStrokeWidth: number;
  areaKey: string;
  index: number;
  onVertexDrag: (areaKey: string, index: number, pt: MapPoint) => void;
  onVertexDown: () => void;
  onVertexUp: () => void;
  onVertexClick: (areaKey: string, index: number) => void;
  onVertexDragMove: (areaKey: string, index: number, pt: MapPoint) => void;
  dragMoved: React.MutableRefObject<boolean>;
}) {
  return (
    <Circle
      x={x}
      y={y}
      radius={radius}
      fill="#FFFFFF"
      stroke="#0B4D8B"
      strokeWidth={1.5}
      strokeScaleEnabled={false}
      hitStrokeWidth={hitStrokeWidth}
      draggable
      onMouseDown={(e) => {
        beginVertexInteraction(e, dragMoved);
        onVertexDown();
      }}
      onTouchStart={(e) => beginVertexInteraction(e, dragMoved)}
      onDragStart={(e) => {
        e.cancelBubble = true;
        onVertexDown();
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
        dragMoved.current = true;
        onVertexDragMove(areaKey, index, { x: e.target.x(), y: e.target.y() });
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        onVertexDrag(areaKey, index, { x: e.target.x(), y: e.target.y() });
        onVertexUp();
      }}
      onMouseUp={() => onVertexUp()}
      onClick={(e) => {
        if (shouldSelectVertexFromClick(e, dragMoved)) onVertexClick(areaKey, index);
      }}
      onTap={(e) => {
        if (shouldSelectVertexFromClick(e, dragMoved)) onVertexClick(areaKey, index);
      }}
    />
  );
}

function KonvaRotateHandle({
  x,
  y,
  centerX,
  centerY,
  radius,
  hitStrokeWidth,
  areaKey,
  onRotateDragMove,
  onRotateDragEnd,
  onRotateDown,
  onRotateUp,
}: {
  x: number;
  y: number;
  centerX: number;
  centerY: number;
  radius: number;
  hitStrokeWidth: number;
  areaKey: string;
  onRotateDragMove: (areaKey: string, point: MapPoint) => void;
  onRotateDragEnd: (areaKey: string, point: MapPoint) => void;
  onRotateDown: () => void;
  onRotateUp: () => void;
}) {
  return (
    <Group>
      <Line
        points={[centerX, centerY, x, y]}
        stroke="#0B4D8B"
        strokeWidth={1.5}
        strokeScaleEnabled={false}
        dash={[6, 4]}
        listening={false}
      />
      <Circle
        x={x}
        y={y}
        radius={radius * 1.2}
        fill="#0B4D8B"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeScaleEnabled={false}
        hitStrokeWidth={hitStrokeWidth}
        draggable
        onDragStart={(e) => {
          e.cancelBubble = true;
          onRotateDown();
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          onRotateDragMove(areaKey, { x: e.target.x(), y: e.target.y() });
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          onRotateDragEnd(areaKey, { x: e.target.x(), y: e.target.y() });
          onRotateUp();
        }}
        onMouseDown={(e) => {
          e.cancelBubble = true;
          onRotateDown();
        }}
        onMouseUp={() => onRotateUp()}
      />
      <Circle x={x} y={y} radius={radius * 0.45} fill="#FFFFFF" listening={false} />
    </Group>
  );
}

function KonvaResizeHandle({
  x,
  y,
  size,
  hitStrokeWidth,
  areaKey,
  handleId,
  onResizeDragStart,
  onResizeDragMove,
  onResizeDragEnd,
  onResizeDown,
  onResizeUp,
}: {
  x: number;
  y: number;
  size: number;
  hitStrokeWidth: number;
  areaKey: string;
  handleId: ResizeHandleId;
  onResizeDragStart: (areaKey: string, handleId: ResizeHandleId) => void;
  onResizeDragMove: (areaKey: string, handleId: ResizeHandleId, point: MapPoint) => void;
  onResizeDragEnd: (areaKey: string, handleId: ResizeHandleId, point: MapPoint) => void;
  onResizeDown: () => void;
  onResizeUp: () => void;
}) {
  const half = size / 2;
  return (
    <Rect
      x={x - half}
      y={y - half}
      width={size}
      height={size}
      cornerRadius={2}
      fill="#FFFFFF"
      stroke="#0B4D8B"
      strokeWidth={1.5}
      strokeScaleEnabled={false}
      hitStrokeWidth={hitStrokeWidth}
      draggable
      onDragStart={(e) => {
        e.cancelBubble = true;
        onResizeDown();
        onResizeDragStart(areaKey, handleId);
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
        onResizeDragMove(areaKey, handleId, { x: e.target.x() + half, y: e.target.y() + half });
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        onResizeDragEnd(areaKey, handleId, { x: e.target.x() + half, y: e.target.y() + half });
        onResizeUp();
      }}
      onMouseDown={(e) => {
        e.cancelBubble = true;
        onResizeDown();
      }}
      onMouseUp={() => onResizeUp()}
    />
  );
}

function KonvaCircleStatic({ x, y, radius }: { x: number; y: number; radius: number }) {
  return <Circle x={x} y={y} radius={radius} fill="#0B4D8B" />;
}
