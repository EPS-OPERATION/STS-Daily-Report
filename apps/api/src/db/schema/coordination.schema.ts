import { sql } from "drizzle-orm";
import { boolean, check, date, foreignKey, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { CoordinationAreaKind, CoordinationGeometry, CoordinationIcon, CoordinationPoint } from "@sts/shared";
import { projects } from "./project.schema.js";
import { projectContractors } from "./project-contractor.schema.js";
import { users } from "./user.schema.js";

export const coordinationMaps = pgTable("coordination_maps", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().unique().references(() => projects.id, { onDelete: "cascade" }),
  imagePath: text("image_path").notNull(), width: integer("width").notNull(), height: integer("height").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check("coordination_maps_dimensions_check", sql`${t.width} > 0 AND ${t.height} > 0`)]);

export const coordinationColors = pgTable("coordination_colors", {
  projectId: uuid("project_id").notNull(), contractorId: uuid("contractor_id").notNull(),
  color: text("color").notNull(), revision: integer("revision").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.projectId, t.contractorId] }),
  foreignKey({ columns: [t.projectId, t.contractorId], foreignColumns: [projectContractors.projectId, projectContractors.contractorId] }).onDelete("cascade"),
  check("coordination_colors_hex_check", sql`${t.color} ~ '^#[0-9A-Fa-f]{6}$'`),
]);

export const coordinationItems = pgTable("coordination_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  mapId: uuid("map_id").notNull().references(() => coordinationMaps.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull(), contractorId: uuid("contractor_id").notNull(),
  workDate: date("work_date").notNull(), title: text("title").notNull(), icon: text("icon").$type<CoordinationIcon>().notNull(),
  x: numeric("x", { precision: 9, scale: 8, mode: "number" }).notNull(),
  y: numeric("y", { precision: 9, scale: 8, mode: "number" }).notNull(),
  rotation: numeric("rotation", { precision: 7, scale: 3, mode: "number" }).notNull().default(0),
  areaKind: text("area_kind").$type<CoordinationAreaKind>().notNull(), geometry: jsonb("geometry").$type<CoordinationGeometry>().notNull(),
  linkArea: boolean("link_area").notNull().default(true),
  // Road routes only: used in both directions.
  twoWay: boolean("two_way").notNull().default(false),
  // Longer detail behind the short title (shown when the job is clicked / in the list under the map).
  note: text("note"),
  revision: integer("revision").notNull().default(1),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  foreignKey({ columns: [t.projectId, t.contractorId], foreignColumns: [projectContractors.projectId, projectContractors.contractorId] }).onDelete("cascade"),
  index("coordination_items_project_date_idx").on(t.projectId, t.workDate),
  // Must mirror COORDINATION_MIN/COORDINATION_MAX in @sts/shared (margin around the drawing).
  check("coordination_items_xy_check", sql`${t.x} BETWEEN -0.15 AND 1.15 AND ${t.y} BETWEEN -0.15 AND 1.15`),
  check("coordination_items_revision_check", sql`${t.revision} > 0`),
  check("coordination_items_icon_check", sql`${t.icon} IN ('crane','machinery','truck','weld','pipe','box','pin','road','text')`),
  check("coordination_items_area_kind_check", sql`${t.areaKind} IN ('rectangle','polygon','route')`),
]);

// Daily note for the coordination map: one per project per work date, written by EPS staff.
export const coordinationDayNotes = pgTable("coordination_day_notes", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  workDate: date("work_date").notNull(),
  note: text("note").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.projectId, t.workDate] })]);

// EPS "stamp": a locked work date (row present = locked). Unlocking deletes the row.
export const coordinationDayLocks = pgTable("coordination_day_locks", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  workDate: date("work_date").notNull(),
  lockedBy: uuid("locked_by").references(() => users.id, { onDelete: "set null" }),
  lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.projectId, t.workDate] })]);

// Site road register, kept by EPS: one row per drawn piece of road. Pieces with the same name are one road cut
// into parts (contractors pick the name once and book every piece); a name always belongs to one road code. points = open line in
// map coordinates (0..1, same margin as items). Road requests in daily reports refer to these ids.
export const coordinationRoadSegments = pgTable("coordination_road_segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  road: text("road").notNull(),
  name: text("name").notNull(),
  points: jsonb("points").$type<CoordinationPoint[]>().notNull(),
  closed: boolean("closed").notNull().default(false),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("coordination_road_segments_name_idx").on(t.projectId, t.name),
  check("coordination_road_segments_road_check", sql`char_length(${t.road}) between 1 and 20`),
  check("coordination_road_segments_name_check", sql`char_length(${t.name}) between 1 and 80`),
]);
