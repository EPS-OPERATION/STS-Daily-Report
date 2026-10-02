import { check, date, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { buildings } from "./building.schema.js";
import { contractors } from "./contractor.schema.js";
import { projects } from "./project.schema.js";
import { users } from "./user.schema.js";

// EPS safety line walk: one row per finding ("Issue Safety Line Walk" form).
// item_no is a running number per project. Photos live in MinIO (keys only here).
export const safetyFindings = pgTable(
  "safety_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    itemNo: integer("item_no").notNull(),
    observation: text("observation").notNull(),
    buildingId: uuid("building_id").references(() => buildings.id, { onDelete: "set null" }),
    locationDetail: text("location_detail"),
    actionToBeTaken: text("action_to_be_taken").notNull(),
    contractorId: uuid("contractor_id").references(() => contractors.id, { onDelete: "set null" }),
    inspectionDate: date("inspection_date").notNull(),
    expectedCompleteDate: date("expected_complete_date"),
    status: text("status").notNull().default("open"),
    findingType: text("finding_type").notNull(),
    findingPhotoKey: text("finding_photo_key"),
    closePhotoKey: text("close_photo_key"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("safety_findings_project_item_unique").on(t.projectId, t.itemNo),
    check("safety_findings_status_check", sql`${t.status} IN ('open', 'done')`),
    check("safety_findings_type_check", sql`${t.findingType} IN ('unsafe_act', 'unsafe_condition')`),
    index("safety_findings_project_date_idx").on(t.projectId, t.inspectionDate),
  ],
);

export type SafetyFinding = typeof safetyFindings.$inferSelect;
