import { sql, type SQL } from "drizzle-orm";
import { buildings, coordinationMaps, coordinationSections } from "@/db/schema/index.js";

// A report row's place is a building or a route section of a Map area (linear work such as the 33 kV line).
// Reads left-join both (plus the section's map) and show a section in the building columns, so every screen that
// lists "building code · name" shows "A-B · 33 kV line route · A-B" without knowing about sections.
// Join order for callers: .leftJoin(buildings, …buildingId) .leftJoin(coordinationSections, …sectionId)
// .leftJoin(coordinationMaps, eq(coordinationSections.mapId, coordinationMaps.id)).
export const locationCode: SQL<string> = sql<string>`coalesce(${buildings.code}, ${coordinationSections.code})`;
export const locationName: SQL<string> = sql<string>`coalesce(${buildings.name}, ${coordinationMaps.name} || ' · ' || ${coordinationSections.code})`;
