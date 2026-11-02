import { check, integer, pgTable, text, timestamp, unique, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { projects } from "./project.schema.js";

// WBS zones. Adjacency-list hierarchy via parentId (no nested-set yet).
// Zone code is unique within a project. Lifecycle status (active/inactive)
// is NOT construction condition — that comes from activity aggregation.
export const zones = pgTable(
  "zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => zones.id, {
      // A zone with children cannot be deleted; reparent first.
      onDelete: "restrict",
    }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("zones_project_code_unique").on(t.projectId, t.code),
    check("zones_sort_order_check", sql`${t.sortOrder} >= 0`),
  ],
);

export type Zone = typeof zones.$inferSelect;
export type NewZone = typeof zones.$inferInsert;
