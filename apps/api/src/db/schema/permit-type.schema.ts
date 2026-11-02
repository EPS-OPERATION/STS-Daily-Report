import { boolean, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { projects } from "./project.schema.js";

// Dynamic permit types per project. Seeded with the 7 standard types,
// and editable/extendable by EPS staff.
export const permitTypes = pgTable(
  "permit_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    label: text("label").notNull(),
    labelTh: text("label_th").notNull(),
    iconKey: text("icon_key").notNull().default("other"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("permit_types_project_code_unique").on(t.projectId, t.code),
    index("permit_types_project_idx").on(t.projectId),
  ],
);

export type PermitTypeRow = typeof permitTypes.$inferSelect;
export type NewPermitTypeRow = typeof permitTypes.$inferInsert;
