import { boolean, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { contractors } from "./contractor.schema.js";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // always stored normalized (trimmed + lowercase); unique enforces one identity per email
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  status: text("status").notNull().default("active"),
  canManageSiteConfiguration: boolean("can_manage_site_configuration").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// A user may belong to many contractors (and later projects); never put
// contractor_id on users. Memberships cascade so deleting a user or a
// contractor cannot leave orphan membership rows.
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
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("contractor_memberships_user_contractor_unique").on(t.userId, t.contractorId)],
);

export type ContractorMembership = typeof contractorMemberships.$inferSelect;
