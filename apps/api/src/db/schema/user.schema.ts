import { check, pgTable, text, timestamp, unique, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contractors } from "./contractor.schema.js";
import { projects } from "./project.schema.js";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // always stored normalized (trimmed + lowercase); unique enforces one identity per email
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  requestedContractorId: uuid("requested_contractor_id").references(() => contractors.id, { onDelete: "set null" }),
  requestedCompanyName: text("requested_company_name"),
  rejectionReason: text("rejection_reason"),
  decidedBy: uuid("decided_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  // "contractor" acts through memberships; "eps_site"/"eps_admin" = owner-side staff.
  role: text("role").notNull().default("contractor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("users_status_check", sql`${t.status} IN ('active', 'pending', 'rejected', 'disabled')`),
  check("users_role_check", sql`${t.role} IN ('contractor', 'eps_site', 'eps_admin')`),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// A user may belong to several contractors per project; never put
// contractor_id on users. Membership is project-scoped: the same contractor
// can be linked to the user in more than one project. Memberships cascade so
// deleting a user, contractor, or project cannot leave orphan rows.
export const contractorMemberships = pgTable(
  "contractor_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contractorId: uuid("contractor_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("contractor_memberships_user_contractor_project_unique").on(t.userId, t.contractorId, t.projectId)],
);

export type ContractorMembership = typeof contractorMemberships.$inferSelect;
