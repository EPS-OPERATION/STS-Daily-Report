import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { contractors } from "./contractor.schema.js";
import { projects } from "./project.schema.js";

export const projectContractors = pgTable(
  "project_contractors",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    contractorId: uuid("contractor_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.contractorId] })],
);
