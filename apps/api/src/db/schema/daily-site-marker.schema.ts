import { sql } from "drizzle-orm";
import { check, date, doublePrecision, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contractors } from "./contractor.schema.js";
import { facilities } from "./facility.schema.js";
import { projects } from "./project.schema.js";
import { siteMapViews } from "./site-map-view.schema.js";
import { users } from "./user.schema.js";

export const dailySiteMarkers = pgTable(
  "daily_site_markers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    siteMapViewId: uuid("site_map_view_id")
      .notNull()
      .references(() => siteMapViews.id, { onDelete: "restrict" }),
    workDate: date("work_date").notNull(),
    contractorId: uuid("contractor_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "restrict" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "restrict" }),
    iconKey: text("icon_key").notNull(),
    comment: text("comment").notNull(),
    x: doublePrecision("x").notNull(),
    y: doublePrecision("y").notNull(),
    facilityId: uuid("facility_id").references(() => facilities.id, { onDelete: "set null" }),
    status: text("status").notNull().default("active"),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("daily_site_markers_project_view_date_status_idx").on(t.projectId, t.siteMapViewId, t.workDate, t.status),
    index("daily_site_markers_contractor_idx").on(t.contractorId),
    index("daily_site_markers_creator_idx").on(t.createdBy),
    check("daily_site_markers_coordinates_check", sql`${t.x} BETWEEN 0 AND 1 AND ${t.y} BETWEEN 0 AND 1`),
    check("daily_site_markers_comment_check", sql`length(trim(${t.comment})) BETWEEN 1 AND 2000`),
    check(
      "daily_site_markers_icon_key_check",
      sql`${t.iconKey} IN ('vehicle', 'truck', 'crane', 'excavator', 'equipment', 'material', 'worker', 'hazard', 'restricted-area', 'work-area', 'other')`,
    ),
    check(
      "daily_site_markers_lifecycle_check",
      sql`(${t.status} = 'active' AND ${t.withdrawnAt} IS NULL) OR (${t.status} = 'withdrawn' AND ${t.withdrawnAt} IS NOT NULL)`,
    ),
  ],
);

export type DailySiteMarker = typeof dailySiteMarkers.$inferSelect;
