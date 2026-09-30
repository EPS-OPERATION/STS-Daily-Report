import { useCallback, useMemo, useState } from "react";
import {
  clampToMap,
  mapToNormalized,
  nearestEdgeIndex,
  normalizedToMap,
  type MapPoint,
} from "@/features/site-plan/utils/coordinates.js";
import type { PlanArea, PolygonGeometry } from "@/features/site-plan/types/site-plan.types.js";

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

export function getDraftForZoneId(drafts: DraftArea[], zoneId: string | null): DraftArea | null {
  return zoneId ? (drafts.find((draft) => draft.zoneId === zoneId && !draft.deleted) ?? null) : null;
}

// Local draft state for Edit Map. Server geometry is cloned on entry;
// Cancel discards everything, Save persists explicit changes only.
export function useSitePlanEditor(serverAreas: ServerArea[], mapW: number, mapH: number) {
  const [editMode, setEditMode] = useState(false);
  const [drafts, setDrafts] = useState<DraftArea[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [boundaryEditing, setBoundaryEditing] = useState(false);
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null);
  const [drawing, setDrawing] = useState<DrawingState | null>(null);
  const [newCounter, setNewCounter] = useState(0);

  const serverById = useMemo(() => new Map(serverAreas.map((a) => [a.id, a])), [serverAreas]);

  const enterEdit = useCallback(() => {
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
    setSelectedZoneId(null);
    setBoundaryEditing(false);
    setDrawing(null);
    setEditMode(true);
  }, [serverAreas, mapW, mapH]);

  const cancelEdit = useCallback(() => {
    setDrafts([]);
    setSelectedZoneId(null);
    setBoundaryEditing(false);
    setSelectedVertex(null);
    setDrawing(null);
    setEditMode(false);
  }, []);

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
    const draft = drafts.find((item) => item.key === key);
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, zoneId } : d)));
    if (draft?.zoneId === selectedZoneId) setSelectedZoneId(zoneId);
  };

  const markDeleted = (key: string, deleted: boolean) => {
    const draft = drafts.find((item) => item.key === key);
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, deleted } : d)));
    if (deleted && draft?.zoneId === selectedZoneId) {
      setBoundaryEditing(false);
      setSelectedVertex(null);
    }
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
              points: (server.defaultGeometry ?? server.geometry).points.map((p) => normalizedToMap(p, mapW, mapH)),
              deleted: false,
            }
          : d,
      ),
    );
  };

  const startDrawing = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setBoundaryEditing(false);
    setSelectedVertex(null);
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
    setSelectedZoneId(drawing.zoneId);
    setBoundaryEditing(true);
    setDrawing(null);
    return true;
  };

  // Duplicate an existing draft's shape onto another (unmapped) zone.
  // Points are offset so the copy does not sit exactly on the original.
  const duplicateDraft = useCallback(
    (key: string, zoneId: string): string | null => {
      const draft = drafts.find((d) => d.key === key && !d.deleted);
      if (!draft) return null;
      if (drafts.some((d) => d.zoneId === zoneId && !d.deleted)) return null;
      const nextKey = `new:${newCounter}`;
      setNewCounter((n) => n + 1);
      const points = draft.points.map((p) => clampToMap({ x: p.x + 24, y: p.y + 24 }, mapW, mapH));
      setDrafts((prev) => [...prev, { key: nextKey, areaId: null, zoneId, points, deleted: false, isNew: true }]);
      setSelectedZoneId(zoneId);
      setBoundaryEditing(true);
      setSelectedVertex(null);
      return nextKey;
    },
    [drafts, newCounter, mapW, mapH],
  );

  // Normalized payloads for the area APIs (viewport transforms never leak).
  const toNormalized = (points: MapPoint[]): PolygonGeometry => ({
    type: "polygon",
    points: points.map((p) => mapToNormalized(p, mapW, mapH)),
  });

  const selected = getDraftForZoneId(drafts, selectedZoneId);

  const selectZone = useCallback(
    (zoneId: string | null) => {
      // Direct-edit mode: selecting a mapped zone immediately shows its
      // vertex handles (no separate "Edit boundary" step).
      if (zoneId) {
        setBoundaryEditing(drafts.some((d) => d.zoneId === zoneId && !d.deleted));
      } else {
        setBoundaryEditing(false);
      }
      setSelectedZoneId(zoneId);
      setSelectedVertex(null);
    },
    [drafts],
  );

  return {
    editMode,
    enterEdit,
    cancelEdit,
    selectedZoneId,
    drafts: drafts.filter((d) => !d.deleted),
    allDrafts: drafts,
    selected,
    selectZone,
    boundaryEditing,
    setBoundaryEditing,
    selectedVertex,
    selectVertex: setSelectedVertex,
    updatePoints,
    deleteVertex,
    addVertexAt,
    assignZone,
    markDeleted,
    resetDraft,
    drawing,
    startDrawing,
    pushDrawPoint,
    undoDrawPoint,
    cancelDrawing,
    finishDrawing,
    duplicateDraft,
    dirty,
    toNormalized,
  };
}
