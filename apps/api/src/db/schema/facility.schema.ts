import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { projects } from "./project.schema.js";
import { zones } from "./zone.schema.js";

export const facilities = pgTable(
  "facilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    code: text("code"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    legacyZoneId: uuid("legacy_zone_id").references(() => zones.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("facilities_project_key_unique").on(t.projectId, t.key),
    unique("facilities_project_code_unique").on(t.projectId, t.code),
    index("facilities_legacy_zone_idx").on(t.legacyZoneId),
    check("facilities_name_check", sql`length(trim(${t.name})) > 0`),
    check("facilities_sort_order_check", sql`${t.sortOrder} >= 0`),
  ],
);

export type Facility = typeof facilities.$inferSelect;
