import { mapToNormalized, normalizedToMap, type MapPoint } from "@/features/site-plan/utils/coordinates.js";
import type { ZonePartOption } from "@/features/site-plan/types/site-plan.types.js";

export interface ZonePartDraft {
  key: string;
  id: string | null;
  code: string;
  name: string;
  displayColor: string;
  point: MapPoint | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ZonePartDraftInput {
  id?: string;
  code: string;
  name: string;
  displayColor: string;
  mapX: number | null;
  mapY: number | null;
  sortOrder: number;
  isActive: boolean;
}

export function toZonePartDrafts(parts: ZonePartOption[], mapW: number, mapH: number): ZonePartDraft[] {
  return parts.map((part) => ({
    key: part.id,
    id: part.id,
    code: part.code,
    name: part.name,
    displayColor: part.displayColor,
    point: part.mapX == null || part.mapY == null ? null : normalizedToMap({ x: part.mapX, y: part.mapY }, mapW, mapH),
    sortOrder: part.sortOrder,
    isActive: part.isActive,
  }));
}

export function toZonePartInputs(drafts: ZonePartDraft[], mapW: number, mapH: number): ZonePartDraftInput[] | null {
  if (drafts.some((draft) => !draft.code.trim() || !draft.name.trim())) return null;
  return drafts.map((draft) => {
    const normalized = draft.point ? mapToNormalized(draft.point, mapW, mapH) : null;
    return {
      ...(draft.id ? { id: draft.id } : {}),
      code: draft.code.trim(),
      name: draft.name.trim(),
      displayColor: draft.displayColor,
      mapX: normalized?.x ?? null,
      mapY: normalized?.y ?? null,
      sortOrder: draft.sortOrder,
      isActive: draft.isActive,
    };
  });
}

export function hasZonePartDraftChanges(
  drafts: ZonePartDraft[],
  original: ZonePartOption[],
  mapW: number,
  mapH: number,
): boolean {
  const inputs = toZonePartInputs(drafts, mapW, mapH);
  if (!inputs || inputs.length !== original.length) return true;
  const originalById = new Map(original.map((part) => [part.id, part]));
  return inputs.some((input) => {
    if (!input.id) return true;
    const part = originalById.get(input.id);
    return (
      !part ||
      input.code !== part.code ||
      input.name !== part.name ||
      input.displayColor !== part.displayColor ||
      input.sortOrder !== part.sortOrder ||
      input.isActive !== part.isActive ||
      input.mapX !== part.mapX ||
      input.mapY !== part.mapY
    );
  });
}
