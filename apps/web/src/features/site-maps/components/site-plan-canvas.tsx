import { Circle, Group, Image as KonvaImage, Layer, Rect, Stage, Text } from "react-konva";
import { useEffect, useMemo, useState } from "react";
import LinearProgress from "@mui/material/LinearProgress";
import ButtonBase from "@mui/material/ButtonBase";
import { alpha, useTheme } from "@mui/material/styles";
import type Konva from "konva";
import type { MapPoint } from "@/features/site-maps/helpers/coordinates.js";
import type { Viewport } from "@/features/site-maps/hooks/use-site-plan-viewport.js";

const loadedImages = new Map<string, HTMLImageElement>();

export interface CanvasMarker {
  key: string;
  x: number;
  y: number;
  label: string;
  statusColor?: string;
  activityCount?: number;
  idle?: boolean;
  ariaLabel?: string;
  selected?: boolean;
  interactive?: boolean;
  draft?: boolean;
  draggable?: boolean;
}

export function SitePlanCanvas({
  backgroundUrl,
  mapW,
  mapH,
  markers = [],
  showLabels = true,
  stageDraggable,
  viewport,
  containerRef,
  stageRef,
  size,
  onStageClick,
  onStageDrag,
  onMarkerClick,
  onMarkerDragEnd,
  onImageLoad,
  onImageError,
}: {
  backgroundUrl: string | null;
  mapW: number;
  mapH: number;
  markers?: CanvasMarker[];
  showLabels?: boolean;
  stageDraggable: boolean;
  viewport: Viewport;
  containerRef: React.RefCallback<HTMLDivElement>;
  stageRef: React.RefObject<Konva.Stage | null>;
  size: { w: number; h: number };
  onStageClick: () => void;
  onStageDrag: () => void;
  onMarkerClick?: (key: string) => void;
  onMarkerDragEnd?: (key: string, point: MapPoint) => void;
  onImageLoad: () => void;
  onImageError: () => void;
}) {
  const theme = useTheme();
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(() =>
    backgroundUrl ? (loadedImages.get(backgroundUrl) ?? null) : null,
  );
  const [loading, setLoading] = useState(() => !backgroundUrl || !loadedImages.has(backgroundUrl));
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  useEffect(() => {
    const cached = backgroundUrl ? loadedImages.get(backgroundUrl) : null;
    if (cached) {
      setBgImage(cached);
      setLoading(false);
      onImageLoad();
      return;
    }
    setBgImage(null);
    setLoading(true);
    if (!backgroundUrl) {
      setBgImage(null);
      setLoading(false);
      onImageError();
      return;
    }
    let live = true;
    const image = new Image();
    image.onload = () => {
      if (live) {
        loadedImages.set(backgroundUrl, image);
        while (loadedImages.size > 4) loadedImages.delete(loadedImages.keys().next().value!);
        setBgImage(image);
        setLoading(false);
        onImageLoad();
      }
    };
    image.onerror = () => {
      if (live) {
        setBgImage(null);
        setLoading(false);
        onImageError();
      }
    };
    image.src = backgroundUrl;
    return () => {
      live = false;
    };
  }, [backgroundUrl, onImageError, onImageLoad]);

  const labels = useMemo(() => {
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const visible = new Map<string, { dx: number; width: number }>();
    const candidates = [...markers].sort(
      (a, b) =>
        Number(Boolean(b.selected || b.key === hoveredKey)) - Number(Boolean(a.selected || a.key === hoveredKey)),
    );
    for (const marker of candidates) {
      const strong = marker.selected || marker.key === hoveredKey;
      if (!marker.label || (!showLabels && !strong)) continue;
      const x = marker.x * viewport.scale + viewport.x;
      const y = marker.y * viewport.scale + viewport.y;
      if (x < 0 || x > size.w || y < 0 || y > size.h) continue;
      const width = Math.min(176, Math.max(56, marker.label.length * 6.8 + 14));
      const dx = x + width + 14 > size.w ? -width - 14 : 14;
      const box = { x: x + dx, y: y - 13, w: width, h: 26 };
      if (
        !strong &&
        placed.some(
          (other) =>
            box.x < other.x + other.w &&
            box.x + box.w > other.x &&
            box.y < other.y + other.h &&
            box.y + box.h > other.y,
        )
      )
        continue;
      placed.push(box);
      visible.set(marker.key, { dx, width });
    }
    return visible;
  }, [markers, hoveredKey, showLabels, viewport, size]);

  const handleBackgroundClick = () => onStageClick();

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative", touchAction: "none" }}>
      {loading ? (
        <LinearProgress
          aria-label="Loading site image"
          sx={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 }}
        />
      ) : null}
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
          onClick={(event) => {
            if (event.target === event.target.getStage()) onStageClick();
          }}
          onTap={(event) => {
            if (event.target === event.target.getStage()) onStageClick();
          }}
          onDragMove={onStageDrag}
          onDragEnd={onStageDrag}
        >
          <Layer>
            {bgImage ? (
              <KonvaImage
                image={bgImage}
                x={0}
                y={0}
                width={mapW}
                height={mapH}
                onClick={handleBackgroundClick}
                onTap={handleBackgroundClick}
              />
            ) : (
              <Rect
                x={0}
                y={0}
                width={mapW}
                height={mapH}
                fill={theme.palette.background.default}
                onClick={handleBackgroundClick}
                onTap={handleBackgroundClick}
              />
            )}
          </Layer>
          <Layer>
            {markers.map((marker) => (
              <Group
                key={marker.key}
                x={marker.x}
                y={marker.y}
                draggable={marker.draggable}
                listening={marker.interactive !== false}
                onClick={(event) => {
                  event.cancelBubble = true;
                  onMarkerClick?.(marker.key);
                }}
                onTap={(event) => {
                  event.cancelBubble = true;
                  onMarkerClick?.(marker.key);
                }}
                onDragStart={(event) => {
                  event.cancelBubble = true;
                }}
                onDragEnd={(event) => {
                  event.cancelBubble = true;
                  onMarkerDragEnd?.(marker.key, { x: event.target.x(), y: event.target.y() });
                }}
                onMouseEnter={(event) => {
                  setHoveredKey(marker.key);
                  const stage = event.target.getStage();
                  if (stage) stage.container().style.cursor = marker.draggable ? "grab" : "pointer";
                }}
                onMouseLeave={(event) => {
                  setHoveredKey(null);
                  const stage = event.target.getStage();
                  if (stage) stage.container().style.cursor = "default";
                }}
              >
                <Circle radius={24 / viewport.scale} fill={alpha(theme.palette.background.paper, 0.001)} />
                {marker.selected ? (
                  <Circle
                    radius={12 / viewport.scale}
                    stroke={theme.palette.primary.main}
                    strokeWidth={3 / viewport.scale}
                    fill={theme.palette.background.paper}
                  />
                ) : null}
                <Circle
                  radius={8.5 / viewport.scale}
                  fill={theme.palette.background.paper}
                  shadowColor={theme.palette.text.primary}
                  shadowBlur={5 / viewport.scale}
                  shadowOpacity={0.25}
                  stroke={marker.draft ? theme.palette.primary.main : theme.palette.text.primary}
                  strokeWidth={1.5 / viewport.scale}
                  dash={marker.draft ? [4 / viewport.scale, 3 / viewport.scale] : undefined}
                />
                <Circle
                  radius={marker.activityCount ? 8.5 / viewport.scale : 5.5 / viewport.scale}
                  fill={
                    marker.idle ? theme.palette.background.paper : (marker.statusColor ?? theme.palette.text.secondary)
                  }
                  stroke={marker.idle ? marker.statusColor : undefined}
                  strokeWidth={marker.idle ? 1.5 / viewport.scale : undefined}
                  listening={false}
                />
                {marker.activityCount ? (
                  <Text
                    x={-8 / viewport.scale}
                    y={-4 / viewport.scale}
                    width={16 / viewport.scale}
                    height={9 / viewport.scale}
                    text={marker.activityCount > 9 ? "9+" : String(marker.activityCount)}
                    fontSize={8 / viewport.scale}
                    fontStyle="bold"
                    align="center"
                    fill={theme.palette.common.white}
                    fontFamily={theme.typography.fontFamily}
                    listening={false}
                  />
                ) : null}
                {labels.has(marker.key) ? (
                  <Group x={labels.get(marker.key)!.dx / viewport.scale} y={-13 / viewport.scale} listening={false}>
                    <Rect
                      width={labels.get(marker.key)!.width / viewport.scale}
                      height={26 / viewport.scale}
                      cornerRadius={5 / viewport.scale}
                      fill={theme.palette.background.paper}
                      opacity={0.96}
                      shadowColor={theme.palette.text.primary}
                      shadowBlur={4 / viewport.scale}
                      shadowOpacity={0.14}
                    />
                    <Text
                      x={7 / viewport.scale}
                      y={6 / viewport.scale}
                      text={marker.label}
                      width={(labels.get(marker.key)!.width - 14) / viewport.scale}
                      height={14 / viewport.scale}
                      fontSize={12 / viewport.scale}
                      fontFamily={theme.typography.fontFamily}
                      fontStyle={marker.selected ? "bold" : "normal"}
                      fill={theme.palette.text.primary}
                      ellipsis
                      listening={false}
                    />
                  </Group>
                ) : null}
              </Group>
            ))}
          </Layer>
        </Stage>
      )}
      {markers
        .filter((marker) => marker.interactive !== false && !marker.draggable)
        .map((marker) => {
          const x = marker.x * viewport.scale + viewport.x,
            y = marker.y * viewport.scale + viewport.y;
          if (x < 0 || y < 0 || x > size.w || y > size.h) return null;
          return (
            <ButtonBase
              key={marker.key}
              type="button"
              disableRipple
              aria-label={marker.ariaLabel ?? `Select ${marker.label}`}
              aria-pressed={!!marker.selected}
              onClick={() => onMarkerClick?.(marker.key)}
              onMouseEnter={() => setHoveredKey(marker.key)}
              onMouseLeave={() => setHoveredKey(null)}
              onFocus={() => setHoveredKey(marker.key)}
              onBlur={() => setHoveredKey(null)}
              sx={{
                position: "absolute",
                left: x - 24,
                top: y - 24,
                width: 48,
                height: 48,
                borderRadius: "50%",
                zIndex: marker.selected ? 2 : 1,
                "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
              }}
            />
          );
        })}
    </div>
  );
}
