import { check, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects } from "./project.schema.js";
import { users } from "./user.schema.js";

// Physical buildings used for manpower allocation (NOT WBS zones — the two
// schemes do not map 1:1). Code is stable per project (see @sts/shared BUILDINGS).
export const buildings = pgTable(
  "buildings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    nameTh: text("name_th"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("buildings_project_code_unique").on(t.projectId, t.code),
    check("buildings_sort_order_check", sql`${t.sortOrder} >= 0`),
  ],
);

export type Building = typeof buildings.$inferSelect;
export type NewBuilding = typeof buildings.$inferInsert;

// Where a building appears on each site-map image (admin places these on /site-plan/config).
// x / y are normalised 0..1 of the image so markers survive image resizing.
export const SITE_MAP_VIEWS = ["overview", "topview", "plan"] as const;
export type SiteMapView = (typeof SITE_MAP_VIEWS)[number];

export const buildingMarkers = pgTable(
  "building_markers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buildingId: uuid("building_id")
      .notNull()
      .references(() => buildings.id, { onDelete: "cascade" }),
    view: text("view").notNull(),
    x: numeric("x", { precision: 6, scale: 5, mode: "number" }).notNull(),
    y: numeric("y", { precision: 6, scale: 5, mode: "number" }).notNull(),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("building_markers_building_view_unique").on(t.buildingId, t.view),
    check("building_markers_view_check", sql`${t.view} IN ('overview', 'topview', 'plan')`),
    check("building_markers_xy_check", sql`${t.x} BETWEEN 0 AND 1 AND ${t.y} BETWEEN 0 AND 1`),
  ],
);

export type BuildingMarker = typeof buildingMarkers.$inferSelect;

// Work part = optional subdivision of a facility (e.g. "Part A" of TG Building),
// configured by EPS. Location on each map view is optional.
export const buildingParts = pgTable(
  "building_parts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buildingId: uuid("building_id")
      .notNull()
      .references(() => buildings.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("building_parts_building_code_unique").on(t.buildingId, t.code),
    check("building_parts_status_check", sql`${t.status} IN ('active', 'inactive')`),
  ],
);

export const buildingPartMarkers = pgTable(
  "building_part_markers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partId: uuid("part_id")
      .notNull()
      .references(() => buildingParts.id, { onDelete: "cascade" }),
    view: text("view").notNull(),
    x: numeric("x", { precision: 6, scale: 5, mode: "number" }).notNull(),
    y: numeric("y", { precision: 6, scale: 5, mode: "number" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("building_part_markers_part_view_unique").on(t.partId, t.view),
    check("building_part_markers_view_check", sql`${t.view} IN ('overview', 'topview', 'plan')`),
    check("building_part_markers_xy_check", sql`${t.x} BETWEEN 0 AND 1 AND ${t.y} BETWEEN 0 AND 1`),
  ],
);

export type BuildingPart = typeof buildingParts.$inferSelect;

