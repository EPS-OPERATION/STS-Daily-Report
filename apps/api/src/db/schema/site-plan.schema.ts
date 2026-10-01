import {
  boolean,
  check,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  backgroundObjectKey: text("background_object_key"),
  originalWidth: integer("original_width"),
  originalHeight: integer("original_height"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SitePlan = typeof sitePlans.$inferSelect;

// Legacy polygon rows are retained for history and one-time point backfill.
// Normal Site Activity reads zoneMapPoints instead.
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

// Nullable coordinates are an explicit unmapped marker, preserving old area
// rows while preventing their legacy fallback from restoring a removed point.
export const zoneMapPoints = pgTable(
  "zone_map_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sitePlanId: uuid("site_plan_id")
      .notNull()
      .references(() => sitePlans.id, { onDelete: "cascade" }),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "cascade" }),
    x: doublePrecision("x"),
    y: doublePrecision("y"),
    view: text("view").notNull().default("top"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("zone_map_points_plan_zone_view_unique").on(t.sitePlanId, t.zoneId, t.view),
    check("zone_map_points_view_check", sql`${t.view} IN ('overview', 'top')`),
    check(
      "zone_map_points_coordinates_check",
      sql`(${t.x} IS NULL) = (${t.y} IS NULL) AND (${t.x} IS NULL OR ${t.x} BETWEEN 0 AND 1) AND (${t.y} IS NULL OR ${t.y} BETWEEN 0 AND 1)`,
    ),
  ],
);

export type ZoneMapArea = typeof zoneMapAreas.$inferSelect;

// Display catalog only. Missing domain linkage never creates a business Zone.
export const siteMarkerDefinitions = pgTable(
  "site_marker_definitions",
  {
    sitePlanId: uuid("site_plan_id")
      .notNull()
      .references(() => sitePlans.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    no: integer("no").notNull(),
    name: text("name").notNull(),
    zoneId: uuid("zone_id").references(() => zones.id, { onDelete: "set null" }),
    overviewX: doublePrecision("overview_x"),
    overviewY: doublePrecision("overview_y"),
    topViewX: doublePrecision("top_view_x"),
    topViewY: doublePrecision("top_view_y"),
  },
  (t) => [
    primaryKey({ columns: [t.sitePlanId, t.key] }),
    unique("site_marker_definitions_plan_no_unique").on(t.sitePlanId, t.no),
    check("site_marker_definitions_no_check", sql`${t.no} > 0`),
    check(
      "site_marker_definitions_overview_point_check",
      sql`(${t.overviewX} IS NULL) = (${t.overviewY} IS NULL) AND (${t.overviewX} IS NULL OR ${t.overviewX} BETWEEN 0 AND 1) AND (${t.overviewY} IS NULL OR ${t.overviewY} BETWEEN 0 AND 1)`,
    ),
    check(
      "site_marker_definitions_top_view_point_check",
      sql`(${t.topViewX} IS NULL) = (${t.topViewY} IS NULL) AND (${t.topViewX} IS NULL OR ${t.topViewX} BETWEEN 0 AND 1) AND (${t.topViewY} IS NULL OR ${t.topViewY} BETWEEN 0 AND 1)`,
    ),
  ],
);
