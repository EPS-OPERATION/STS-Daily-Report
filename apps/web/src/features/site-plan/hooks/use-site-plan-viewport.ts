import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { polygonBounds, type Bounds, type MapPoint } from "../utils/coordinates.js";

export interface Viewport {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 5;

// Viewport-only state (scale/position). Never persisted, never geometry.
export function useSitePlanViewport(mapW: number, mapH: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<Viewport>({ scale: 1, x: 0, y: 0 });
  const [fitted, setFitted] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const animRef = useRef(0);
  const viewRef = useRef(view);
  viewRef.current = view;

  // Subtle ease-out viewport animation (~280ms). Cancels on new motion.
  // Reads the start frame once (no side effects inside setState updaters,
  // StrictMode-safe) and writes plain frames.
  const animateTo = useCallback((target: Viewport, duration = 280) => {
    cancelAnimationFrame(animRef.current);
    const from = viewRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setView({
        scale: from.scale + (target.scale - from.scale) * e,
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
      });
      if (t < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const fitAll = useCallback(() => {
    if (size.w === 0 || size.h === 0) return;
    const scale = Math.min(size.w / mapW, size.h / mapH);
    animateTo({ scale, x: (size.w - mapW * scale) / 2, y: (size.h - mapH * scale) / 2 });
    setFitted(true);
  }, [size, mapW, mapH, animateTo]);

  useEffect(() => {
    if (!fitted && size.w > 0) fitAll();
  }, [fitted, size, fitAll]);

  const fitBounds = useCallback(
    (b: Bounds, padding = 60) => {
      if (size.w === 0 || size.h === 0) return;
      const scale = Math.min(size.w / (b.w + padding * 2), size.h / (b.h + padding * 2), MAX_SCALE);
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      animateTo({ scale, x: size.w / 2 - cx * scale, y: size.h / 2 - cy * scale });
    },
    [size, animateTo],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition() ?? undefined;
      setView((v) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
        // Zoom around the pointer when available, else the viewport center.
        const cx = pointer?.x ?? size.w / 2;
        const cy = pointer?.y ?? size.h / 2;
        const mx = (cx - v.x) / v.scale;
        const my = (cy - v.y) / v.scale;
        return { scale: next, x: cx - mx * next, y: cy - my * next };
      });
    },
    [size],
  );

  const onWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      zoomBy(e.evt.deltaY > 0 ? 0.9 : 1.1);
    },
    [zoomBy],
  );

  // Pointer-centered wheel zoom for natively attached listeners.
  const onWheelNative = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      const cx = rect ? e.clientX - rect.left : size.w / 2;
      const cy = rect ? e.clientY - rect.top : size.h / 2;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setView((v) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
        const mx = (cx - v.x) / v.scale;
        const my = (cy - v.y) / v.scale;
        return { scale: next, x: cx - mx * next, y: cy - my * next };
      });
    },
    [size],
  );

  const screenToMap = useCallback((): MapPoint | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    const s = stage.scaleX();
    return { x: (pos.x - stage.x()) / s, y: (pos.y - stage.y()) / s };
  }, []);

  return {
    containerRef,
    stageRef,
    size,
    view,
    setView,
    fitAll,
    fitBounds,
    zoomBy,
    onWheel,
    onWheelNative,
    screenToMap,
    polygonBounds,
  };
}
