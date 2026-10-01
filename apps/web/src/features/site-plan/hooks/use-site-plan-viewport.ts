import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Bounds, type MapPoint } from "../utils/coordinates.js";

export interface Viewport {
  scale: number;
  x: number;
  y: number;
}

export function observeSitePlanContainer(
  container: HTMLDivElement | null,
  onResize: (size: { w: number; h: number }) => void,
) {
  if (!container) return () => {};
  const observer = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect;
    if (rect) onResize({ w: rect.width, h: rect.height });
  });
  observer.observe(container);
  return () => observer.disconnect();
}

export function getSitePlanScaleLimits(size: { w: number; h: number }, mapW: number, mapH: number) {
  const fit = Math.min(size.w / mapW, size.h / mapH);
  return { min: fit * 0.25, max: fit * 12 };
}

type ViewMode = { kind: "all" } | { kind: "bounds"; bounds: Bounds; padding: number } | { kind: "manual" };

export function useSitePlanViewport(mapW: number, mapH: number) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((element: HTMLDivElement | null) => setContainer(element), []);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef(size);
  const [view, setView] = useState<Viewport>({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  const modeRef = useRef<ViewMode>({ kind: "all" });
  const lastLayoutRef = useRef({ w: 0, h: 0, mapW, mapH });
  sizeRef.current = size;
  viewRef.current = view;

  useEffect(() => {
    return observeSitePlanContainer(container, setSize);
  }, [container]);

  const animRef = useRef(0);
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

  const fitAllView = useCallback((): Viewport => {
    const { w, h } = sizeRef.current;
    const scale = Math.min(w / mapW, h / mapH);
    return { scale, x: (w - mapW * scale) / 2, y: (h - mapH * scale) / 2 };
  }, [mapW, mapH]);

  const fitBoundsView = useCallback(
    (bounds: Bounds, padding: number): Viewport => {
      const { w, h } = sizeRef.current;
      const scale = Math.min(
        w / (bounds.w + padding * 2),
        h / (bounds.h + padding * 2),
        getSitePlanScaleLimits(sizeRef.current, mapW, mapH).max,
      );
      const cx = bounds.x + bounds.w / 2;
      const cy = bounds.y + bounds.h / 2;
      return { scale, x: w / 2 - cx * scale, y: h / 2 - cy * scale };
    },
    [mapW, mapH],
  );

  const fitAll = useCallback(() => {
    modeRef.current = { kind: "all" };
    if (sizeRef.current.w === 0 || sizeRef.current.h === 0) return;
    animateTo(fitAllView());
  }, [animateTo, fitAllView]);

  const fitBounds = useCallback(
    (bounds: Bounds, padding = 60) => {
      modeRef.current = { kind: "bounds", bounds, padding };
      if (sizeRef.current.w === 0 || sizeRef.current.h === 0) return;
      animateTo(fitBoundsView(bounds, padding));
    },
    [animateTo, fitBoundsView],
  );

  useEffect(() => {
    if (size.w === 0 || size.h === 0) return;
    const previous = lastLayoutRef.current;
    const changed = previous.w !== size.w || previous.h !== size.h || previous.mapW !== mapW || previous.mapH !== mapH;
    lastLayoutRef.current = { ...size, mapW, mapH };
    if (!changed) return;

    const mode = modeRef.current;
    if (mode.kind === "all") {
      setView(fitAllView());
    } else if (mode.kind === "bounds") {
      setView(fitBoundsView(mode.bounds, mode.padding));
    } else if (previous.w > 0 && previous.h > 0) {
      const current = viewRef.current;
      const mapX = (previous.w / 2 - current.x) / current.scale;
      const mapY = (previous.h / 2 - current.y) / current.scale;
      setView({ scale: current.scale, x: size.w / 2 - mapX * current.scale, y: size.h / 2 - mapY * current.scale });
    }
  }, [size, mapW, mapH, fitAllView, fitBoundsView]);

  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number) => {
      if (!sizeRef.current.w || !sizeRef.current.h) return;
      const limits = getSitePlanScaleLimits(sizeRef.current, mapW, mapH);
      modeRef.current = { kind: "manual" };
      setView((current) => {
        const next = Math.min(limits.max, Math.max(limits.min, current.scale * factor));
        const mapX = (cx - current.x) / current.scale;
        const mapY = (cy - current.y) / current.scale;
        return { scale: next, x: cx - mapX * next, y: cy - mapY * next };
      });
    },
    [mapW, mapH],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      zoomAt(size.w / 2, size.h / 2, factor);
    },
    [size, zoomAt],
  );

  const onWheelNative = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const rect = container?.getBoundingClientRect();
      const x = rect ? e.clientX - rect.left : size.w / 2;
      const y = rect ? e.clientY - rect.top : size.h / 2;
      zoomAt(x, y, e.deltaY > 0 ? 0.9 : 1.1);
    },
    [container, size, zoomAt],
  );

  useEffect(() => {
    if (!container) return;
    container.addEventListener("wheel", onWheelNative, { passive: false });
    return () => container.removeEventListener("wheel", onWheelNative);
  }, [container, onWheelNative]);

  useEffect(() => {
    if (!container) return;
    let previous: { distance: number; x: number; y: number } | null = null;
    const gesture = (event: TouchEvent) => {
      if (!sizeRef.current.w || !sizeRef.current.h) return;
      if (event.touches.length < 2) {
        previous = null;
        return;
      }
      event.preventDefault();
      stageRef.current?.stopDrag();
      const first = event.touches[0]!;
      const second = event.touches[1]!;
      const rect = container.getBoundingClientRect();
      const x = (first.clientX + second.clientX) / 2 - rect.left;
      const y = (first.clientY + second.clientY) / 2 - rect.top;
      const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
      if (previous && previous.distance > 0) {
        const current = viewRef.current;
        const limits = getSitePlanScaleLimits(sizeRef.current, mapW, mapH);
        const scale = Math.min(limits.max, Math.max(limits.min, (current.scale * distance) / previous.distance));
        const mapX = (previous.x - current.x) / current.scale;
        const mapY = (previous.y - current.y) / current.scale;
        modeRef.current = { kind: "manual" };
        const next = { scale, x: x - mapX * scale, y: y - mapY * scale };
        viewRef.current = next;
        setView(next);
      }
      previous = { x, y, distance };
    };
    const finish = () => {
      previous = null;
    };
    container.addEventListener("touchstart", gesture, { passive: false });
    container.addEventListener("touchmove", gesture, { passive: false });
    container.addEventListener("touchend", finish);
    return () => {
      container.removeEventListener("touchstart", gesture);
      container.removeEventListener("touchmove", gesture);
      container.removeEventListener("touchend", finish);
    };
  }, [container, mapW, mapH]);

  const onStageDrag = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    modeRef.current = { kind: "manual" };
    setView({ scale: stage.scaleX(), x: stage.x(), y: stage.y() });
  }, []);

  const screenToMap = useCallback((): MapPoint | null => {
    const stage = stageRef.current;
    const point = stage?.getPointerPosition();
    if (!stage || !point) return null;
    return { x: (point.x - stage.x()) / stage.scaleX(), y: (point.y - stage.y()) / stage.scaleY() };
  }, []);

  return {
    containerRef,
    stageRef,
    size,
    view,
    fitAll,
    fitBounds,
    zoomBy,
    onStageDrag,
    screenToMap,
  };
}
