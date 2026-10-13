import { sql } from "drizzle-orm";
import { boolean, check, date, foreignKey, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { CoordinationGeometry } from "@sts/shared";
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
  workDate: date("work_date").notNull(), title: text("title").notNull(), icon: text("icon").notNull(),
  x: numeric("x", { precision: 9, scale: 8, mode: "number" }).notNull(),
  y: numeric("y", { precision: 9, scale: 8, mode: "number" }).notNull(),
  rotation: numeric("rotation", { precision: 7, scale: 3, mode: "number" }).notNull().default(0),
  areaKind: text("area_kind").notNull(), geometry: jsonb("geometry").$type<CoordinationGeometry>().notNull(),
  linkArea: boolean("link_area").notNull().default(true),
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
  check("coordination_items_icon_check", sql`${t.icon} IN ('crane','machinery','truck','weld','pipe','box','pin','text')`),
  check("coordination_items_area_kind_check", sql`${t.areaKind} IN ('rectangle','polygon')`),
]);
