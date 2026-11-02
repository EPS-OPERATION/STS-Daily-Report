import { boolean, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { projects } from "./project.schema.js";
import { zones } from "./zone.schema.js";

// A project may hold several plans (Master Layout, Level 1, ...); V1 uses
// one default plan. backgroundObjectKey points at MinIO (bytes live there,
// Postgres holds metadata only) — null while the background stays static.
export const sitePlans = pgTable("site_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  backgroundObjectKey: text("background_object_key"),
  originalWidth: integer("original_width"),
  originalHeight: integer("original_height"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SitePlan = typeof sitePlans.$inferSelect;

// One geometry per zone per plan (V1). Coordinates are NORMALIZED 0..1
// (never CSS pixels) so overlays stay responsive:
// { type: "polygon", points: [{ x, y }, ...] }
export const zoneMapAreas = pgTable(
  "zone_map_areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sitePlanId: uuid("site_plan_id")
      .notNull()
      .references(() => sitePlans.id, { onDelete: "cascade" }),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "cascade" }),
    geometry: jsonb("geometry").notNull(),
    // Shipped default for "Reset to default". Populated from seed; user edits
    // only touch `geometry`, so reset is a local copy (no extra tables).
    defaultGeometry: jsonb("default_geometry"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("zone_map_areas_plan_zone_unique").on(t.sitePlanId, t.zoneId)],
);

export type ZoneMapArea = typeof zoneMapAreas.$inferSelect;
