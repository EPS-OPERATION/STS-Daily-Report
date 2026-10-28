import { date, index, integer, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./user.schema.js";

// Usage log: one row per user per calendar day (Asia/Bangkok). Written with the once-a-minute session
// touch and at login, so the admin Usage page can tell how often the app is really used.
// active_minutes ≈ minutes with requests (one per touch); 0 = day recovered from older data (backfill).
export const userActivityDays = pgTable(
  "user_activity_days",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    activeMinutes: integer("active_minutes").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] }), index("user_activity_days_day_idx").on(t.day)],
);

export type UserActivityDay = typeof userActivityDays.$inferSelect;
