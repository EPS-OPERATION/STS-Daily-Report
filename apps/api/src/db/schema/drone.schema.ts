import { date, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./project.schema.js";
import { users } from "./user.schema.js";

// Drone progress capture: one row per flight date. Image bytes live in MinIO
// (only the object key is stored here), like daily-report and safety photos.
export const droneLogs = pgTable(
  "drone_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    capturedBy: text("captured_by").notNull().default(""),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    objectKey: text("object_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("drone_logs_project_date_idx").on(t.projectId, t.logDate)],
);
