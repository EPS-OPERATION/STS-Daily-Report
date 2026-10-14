import { boolean, check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { PermitType, StandardItemKind } from "@sts/shared";
import { buildings } from "./building.schema.js";
import { contractors } from "./contractor.schema.js";
import { projects } from "./project.schema.js";

// Entries a contractor saves once and picks again instead of retyping each day, per project:
// activity = morning Today Activity row, equipment = morning site machine, permit = evening
// work-permit request. label = work text, machine name or permit name (other permits: free text).
export const reportStandardItems = pgTable(
  "daily_report_standard_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    contractorId: uuid("contractor_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "cascade" }),
    kind: text("kind").$type<StandardItemKind>().notNull(),
    label: text("label").notNull(),
    buildingId: uuid("building_id").references(() => buildings.id, { onDelete: "set null" }),
    // Headcount for activity / permit, quantity for equipment.
    defaultCount: integer("default_count").notNull().default(1),
    permitType: text("permit_type").$type<PermitType>(),
    highRisk: boolean("high_risk").notNull().default(false),
    taskName: text("task_name").notNull().default(""),
    supervisorName: text("supervisor_name").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("daily_report_standard_items_owner_idx").on(t.projectId, t.contractorId, t.kind),
    check("daily_report_standard_items_kind_check", sql`${t.kind} in ('activity', 'equipment', 'permit')`),
    check("daily_report_standard_items_label_check", sql`char_length(${t.label}) between 1 and 200`),
    check("daily_report_standard_items_count_check", sql`${t.defaultCount} between 1 and 500`),
    check(
      "daily_report_standard_items_shape_check",
      sql`(${t.kind} = 'activity' and ${t.buildingId} is not null and ${t.permitType} is null)
        or (${t.kind} = 'equipment' and ${t.buildingId} is null and ${t.permitType} is null)
        or (${t.kind} = 'permit' and ${t.buildingId} is not null and ${t.permitType} is not null)`,
    ),
  ],
);
