import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// One row per company (Sinoma, L-tab, …). The discipline (CE / ME / EE) is chosen in the daily report form.
// `isContractor` = false for the owner company (EPS): kept for its data but left out of every contractor list.
export const contractors = pgTable("contractors", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  isContractor: boolean("is_contractor").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Other codes a company is known by — the per-discipline codes it had before the merge (LCE → L-tab,
// SCM → Sinoma, …), so old document numbers and links still find the company.
export const contractorAliases = pgTable(
  "contractor_aliases",
  {
    code: text("code").primaryKey(),
    contractorId: uuid("contractor_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contractor_aliases_contractor_idx").on(t.contractorId)],
);

export type Contractor = typeof contractors.$inferSelect;
export type NewContractor = typeof contractors.$inferInsert;
