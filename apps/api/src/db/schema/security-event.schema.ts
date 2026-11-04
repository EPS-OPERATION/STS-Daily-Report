import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./user.schema.js";

// Security log: the ONLY place a client IP is kept (business tables must not store it). Rows are purged after
// SECURITY_EVENT_RETENTION_DAYS (auth/security-event.ts). `user_id` = the account the event is about (null when a
// failed login matched no account), `actor_id` = the admin who did it (admin actions only). `detail` is small
// non-secret context (e.g. the new role) — never passwords, tokens, reset links or what was typed in a login box.
export const SECURITY_EVENT_TYPES = [
  "login_success",
  "login_failed",
  "password_reset_issued",
  "password_reset_done",
  "role_changed",
  "status_changed",
  "registration_approved",
  "registration_rejected",
] as const;
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    event: text("event").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    ip: text("ip"),
    userAgent: text("user_agent"),
    detail: jsonb("detail"),
  },
  (t) => [index("security_events_created_at_idx").on(t.createdAt), index("security_events_user_idx").on(t.userId, t.createdAt)],
);

export type SecurityEvent = typeof securityEvents.$inferSelect;
