import { useMemo, useState } from "react";
import {
  clampToMap,
  mapToNormalized,
  nearestEdgeIndex,
  normalizedToMap,
  type MapPoint,
} from "../utils/coordinates.js";
import type { PlanArea, PolygonGeometry } from "../types/site-plan.types.js";

export interface DraftArea {
  key: string;
  areaId: string | null;
  zoneId: string;
  points: MapPoint[];
  deleted: boolean;
  isNew: boolean;
}

export interface DrawingState {
  zoneId: string;
  points: MapPoint[];
}

interface ServerArea extends PlanArea {
  id: string;
}

const samePoints = (a: MapPoint[], b: MapPoint[]): boolean =>
  a.length === b.length && a.every((p, i) => p.x === b[i]?.x && p.y === b[i]?.y);

// Local draft state for Edit Map. Server geometry is cloned on entry;
// Cancel discards everything, Save persists explicit changes only.
export function useSitePlanEditor(serverAreas: ServerArea[], mapW: number, mapH: number) {
  const [editMode, setEditMode] = useState(false);
  const [drafts, setDrafts] = useState<DraftArea[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null);
  const [drawing, setDrawing] = useState<DrawingState | null>(null);
  const [newCounter, setNewCounter] = useState(0);

  const serverById = useMemo(() => new Map(serverAreas.map((a) => [a.id, a])), [serverAreas]);

  const enterEdit = () => {
    setDrafts(
      serverAreas.map((a) => ({
        key: a.id,
        areaId: a.id,
        zoneId: a.zone.id,
        points: a.geometry.points.map((p) => normalizedToMap(p, mapW, mapH)),
        deleted: false,
        isNew: false,
      })),
    );
    setSelectedKey(null);
    setDrawing(null);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setDrafts([]);
    setSelectedKey(null);
    setSelectedVertex(null);
    setDrawing(null);
    setEditMode(false);
  };

  const dirty = useMemo(() => {
    if (drawing && drawing.points.length > 0) return true;
    for (const d of drafts) {
      if (d.isNew && !d.deleted) return true;
      if (d.deleted) return true;
      const server = d.areaId ? serverById.get(d.areaId) : undefined;
      if (!server) continue;
      if (d.zoneId !== server.zone.id) return true;
      const serverPts = server.geometry.points.map((p) => normalizedToMap(p, mapW, mapH));
      if (!samePoints(d.points, serverPts)) return true;
    }
    return false;
  }, [drafts, drawing, serverById, mapW, mapH]);

  const updatePoints = (key: string, points: MapPoint[]) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, points } : d)));
  };

  const deleteVertex = (key: string, index: number): boolean => {
    const draft = drafts.find((d) => d.key === key);
    if (!draft || draft.points.length <= 3) return false;
    updatePoints(
      key,
      draft.points.filter((_, i) => i !== index),
    );
    return true;
  };

  const addVertexAt = (key: string, point: MapPoint): boolean => {
    const draft = drafts.find((d) => d.key === key);
    if (!draft || draft.points.length >= 500) return false;
    const at = nearestEdgeIndex(draft.points, clampToMap(point, mapW, mapH));
    const next = [...draft.points];
    next.splice(at, 0, clampToMap(point, mapW, mapH));
    updatePoints(key, next);
    return true;
  };

  const assignZone = (key: string, zoneId: string) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, zoneId } : d)));
  };

  const markDeleted = (key: string, deleted: boolean) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, deleted } : d)));
    if (deleted && selectedKey === key) setSelectedKey(null);
  };

  const removeDraft = (key: string) => {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
    if (selectedKey === key) {
      setSelectedKey(null);
      setSelectedVertex(null);
    }
  };

  const applyServerGeometry = (key: string, points: MapPoint[]) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, points } : d)));
  };

  const resetDraft = (key: string) => {
    const draft = drafts.find((d) => d.key === key);
    if (!draft?.areaId) return;
    const server = serverById.get(draft.areaId);
    if (!server) return;
    setDrafts((prev) =>
      prev.map((d) =>
        d.key === key
          ? {
              ...d,
              zoneId: server.zone.id,
              points: server.geometry.points.map((p) => normalizedToMap(p, mapW, mapH)),
              deleted: false,
            }
          : d,
      ),
    );
  };

  const startDrawing = (zoneId: string) => {
    setSelectedKey(null);
    setDrawing({ zoneId, points: [] });
  };

  const pushDrawPoint = (point: MapPoint) => {
    setDrawing((d) => (d ? { ...d, points: [...d.points, clampToMap(point, mapW, mapH)] } : d));
  };

  const undoDrawPoint = () => {
    setDrawing((d) => (d ? { ...d, points: d.points.slice(0, -1) } : d));
  };

  const cancelDrawing = () => setDrawing(null);

  const finishDrawing = (): boolean => {
    if (!drawing || drawing.points.length < 3) return false;
    const key = `new:${newCounter}`;
    setNewCounter((n) => n + 1);
    setDrafts((prev) => [
      ...prev,
      { key, areaId: null, zoneId: drawing.zoneId, points: drawing.points, deleted: false, isNew: true },
    ]);
    setSelectedKey(key);
    setDrawing(null);
    return true;
  };

  // Normalized payloads for the area APIs (viewport transforms never leak).
  const toNormalized = (points: MapPoint[]): PolygonGeometry => ({
    type: "polygon",
    points: points.map((p) => mapToNormalized(p, mapW, mapH)),
  });

  const selected = drafts.find((d) => d.key === selectedKey && !d.deleted) ?? null;

  const select = (key: string | null) => {
    setSelectedKey(key);
    setSelectedVertex(null);
  };

  return {
    editMode,
    enterEdit,
    cancelEdit,
    drafts: drafts.filter((d) => !d.deleted),
    allDrafts: drafts,
    selected,
    select,
    selectedVertex,
    selectVertex: setSelectedVertex,
    updatePoints,
    deleteVertex,
    addVertexAt,
    assignZone,
    markDeleted,
    removeDraft,
    applyServerGeometry,
    resetDraft,
    drawing,
    startDrawing,
    pushDrawPoint,
    undoDrawPoint,
    cancelDrawing,
    finishDrawing,
    dirty,
    toNormalized,
  };
}
