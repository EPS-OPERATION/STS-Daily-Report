import type { CoordinationSectionCatalog } from "@sts/shared";
import type { Building } from "@/features/buildings/index.js";

// A report row happens in a building, or on a route section of a Map area (linear work with no building, such as the
// 33 kV line A-B … G-H). The form keeps ONE "where" value per row so drafts, copying and duplicate checks stay as they
// are: a building id, or "s:<section id>". It is split into { buildingId, sectionId } only when the report is sent.
const SECTION = "s:";

export const isSectionValue = (value: string) => value.startsWith(SECTION);

/** Form value of a saved row. */
export const toLocationValue = (row: { buildingId: string | null; sectionId?: string | null }) =>
  row.sectionId ? `${SECTION}${row.sectionId}` : (row.buildingId ?? "");

/** API fields of a form value. */
export const fromLocationValue = (value: string) =>
  isSectionValue(value) ? { buildingId: null, sectionId: value.slice(SECTION.length) } : { buildingId: value, sectionId: null };

/** Today Activity row waiting for its section to be tapped on the map of area `mapId` (the form refuses to send it). */
export const pendingSectionValue = (mapId: string) => `${SECTION}?${mapId}`;
export const isPendingSection = (value: string) => value.startsWith(`${SECTION}?`);

/** The Map area a section row belongs to (picked or still pending). */
export function sectionRowMap(value: string, catalog: CoordinationSectionCatalog): string | null {
  if (!isSectionValue(value)) return null;
  if (isPendingSection(value)) return value.slice(SECTION.length + 1);
  return catalog.sections.find((s) => s.id === value.slice(SECTION.length))?.mapId ?? null;
}

/** Sections in the "where" picker after the buildings, under a heading per Map area: code chip "A-B" and the work
 *  (same shape as a building so the existing picker lists them). */
export const sectionsAsPlaces = ({ maps, sections }: CoordinationSectionCatalog): Building[] =>
  sections.map((s, i) => {
    const mapName = maps.find((m) => m.id === s.mapId)?.name ?? "";
    return { id: `${SECTION}${s.id}`, code: s.code, name: `${mapName} · ${s.code}`, nameTh: s.work, sortOrder: 100000 + i, group: `${mapName} · ช่วง` };
  });
