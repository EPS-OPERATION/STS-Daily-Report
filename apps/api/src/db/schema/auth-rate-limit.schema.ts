import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Database-backed counters also cover multiple API instances.
export const authRateLimits = pgTable("auth_rate_limits", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull().default(1),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
});
