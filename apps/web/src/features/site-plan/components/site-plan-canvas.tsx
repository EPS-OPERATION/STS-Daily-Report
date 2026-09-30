import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { flattenPoints, polygonCenter, type MapPoint } from "../utils/coordinates.js";
import type { Viewport } from "../hooks/use-site-plan-viewport.js";

export interface CanvasArea {
  key: string;
  points: MapPoint[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  dash?: number[];
  code: string;
}

export interface CanvasVertexHandles {
  areaKey: string;
  points: MapPoint[];
  radius: number;
}

// Layout-driven Konva surface. All coordinates are map-space;
// viewport transforms never leak into geometry.
export function SitePlanCanvas({
  backgroundUrl,
  mapW,
  mapH,
  areas,
  selectedKey,
  editMode,
  vertexHandles,
  drawing,
  stageDraggable,
  viewport,
  containerRef,
  stageRef,
  size,
  onStageClick,
  onStageDrag,
  onAreaClick,
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
  editMode: boolean;
  vertexHandles: CanvasVertexHandles | null;
  drawing: MapPoint[] | null;
  stageDraggable: boolean;
  viewport: Viewport;
  containerRef: React.RefCallback<HTMLDivElement>;
  stageRef: React.RefObject<Konva.Stage | null>;
  size: { w: number; h: number };
  onStageClick: () => void;
  onStageDrag: () => void;
  onAreaClick: (key: string) => void;
  onVertexDrag: (areaKey: string, index: number, pt: MapPoint) => void;
  onVertexDown: () => void;
  onVertexUp: () => void;
  onVertexClick: (areaKey: string, index: number) => void;
  onImageLoad: () => void;
  onImageError: () => void;
}) {
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const dragMoved = useRef(false);

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
              <Line
                key={a.key}
                points={flattenPoints(a.points)}
                closed
                fill={a.fill}
                stroke={a.stroke}
                strokeWidth={a.strokeWidth / viewport.scale}
                dash={a.dash}
                hitStrokeWidth={14 / viewport.scale}
                onClick={(e) => {
                  e.cancelBubble = true;
                  onAreaClick(a.key);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  onAreaClick(a.key);
                }}
              />
            ))}
          </Layer>
          <Layer listening={false}>
            {areas.map((a) => {
              const c = polygonCenter(a.points);
              const selected = a.key === selectedKey;
              if (!a.code) return null;
              return (
                <Group key={`label-${a.key}`}>
                  <Text
                    x={c.x}
                    y={c.y - 7 / viewport.scale}
                    text={a.code}
                    fontSize={14 / viewport.scale}
                    fontStyle={selected ? "bold" : "normal"}
                    fontFamily="Inter, sans-serif"
                    fill="#18212F"
                    align="center"
                    offsetX={30 / viewport.scale}
                    width={60 / viewport.scale}
                  />
                </Group>
              );
            })}
          </Layer>
          {editMode && vertexHandles ? (
            <Layer>
              {vertexHandles.points.map((p, i) => (
                <KonvaCircleHandle
                  key={i}
                  x={p.x}
                  y={p.y}
                  radius={vertexHandles.radius}
                  areaKey={vertexHandles.areaKey}
                  index={i}
                  onVertexDrag={onVertexDrag}
                  onVertexDown={onVertexDown}
                  onVertexUp={onVertexUp}
                  onVertexClick={onVertexClick}
                  dragMoved={dragMoved}
                />
              ))}
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
                <KonvaCircleStatic key={i} x={p.x} y={p.y} />
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
  areaKey,
  index,
  onVertexDrag,
  onVertexDown,
  onVertexUp,
  onVertexClick,
  dragMoved,
}: {
  x: number;
  y: number;
  radius: number;
  areaKey: string;
  index: number;
  onVertexDrag: (areaKey: string, index: number, pt: MapPoint) => void;
  onVertexDown: () => void;
  onVertexUp: () => void;
  onVertexClick: (areaKey: string, index: number) => void;
  dragMoved: React.MutableRefObject<boolean>;
}) {
  return (
    <Circle
      x={x}
      y={y}
      radius={radius}
      fill="#FFFFFF"
      stroke="#0B4D8B"
      strokeWidth={2}
      hitStrokeWidth={10}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
        dragMoved.current = false;
        onVertexDown();
      }}
      onDragStart={(e) => {
        e.cancelBubble = true;
        onVertexDown();
      }}
      onDragMove={(e) => {
        dragMoved.current = true;
        onVertexDrag(areaKey, index, { x: e.target.x(), y: e.target.y() });
      }}
      onDragEnd={() => onVertexUp()}
      onMouseUp={() => onVertexUp()}
      onClick={() => {
        if (!dragMoved.current) onVertexClick(areaKey, index);
        dragMoved.current = false;
      }}
    />
  );
}

function KonvaCircleStatic({ x, y }: { x: number; y: number }) {
  return <Circle x={x} y={y} radius={5} fill="#0B4D8B" />;
}
