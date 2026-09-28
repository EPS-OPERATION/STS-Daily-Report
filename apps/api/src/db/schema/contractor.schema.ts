import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const contractors = pgTable("contractors", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Contractor = typeof contractors.$inferSelect;
export type NewContractor = typeof contractors.$inferInsert;
