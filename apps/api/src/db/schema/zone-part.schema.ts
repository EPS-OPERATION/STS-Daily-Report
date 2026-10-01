import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { zones } from "./zone.schema.js";
import { facilities } from "./facility.schema.js";

export const zoneParts = pgTable(
  "zone_parts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    zoneId: uuid("zone_id").references(() => zones.id, { onDelete: "cascade" }),
    facilityId: uuid("facility_id").references(() => facilities.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    displayColor: varchar("display_color", { length: 7 }).notNull().default("#457B9D"),
    mapX: doublePrecision("map_x"),
    mapY: doublePrecision("map_y"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("zone_parts_zone_code_unique").on(t.zoneId, t.code),
    unique("zone_parts_facility_code_unique").on(t.facilityId, t.code),
    check("zone_parts_owner_check", sql`${t.facilityId} IS NOT NULL OR ${t.zoneId} IS NOT NULL`),
    index("zone_parts_facility_idx").on(t.facilityId),
    index("zone_parts_zone_idx").on(t.zoneId),
    check("zone_parts_sort_order_check", sql`${t.sortOrder} >= 0`),
    check("zone_parts_display_color_check", sql`${t.displayColor} ~ '^#[0-9A-F]{6}$'`),
    check(
      "zone_parts_map_point_check",
      sql`(${t.mapX} IS NULL) = (${t.mapY} IS NULL) AND (${t.mapX} IS NULL OR ${t.mapX} BETWEEN 0 AND 1) AND (${t.mapY} IS NULL OR ${t.mapY} BETWEEN 0 AND 1)`,
    ),
  ],
);

export type ZonePart = typeof zoneParts.$inferSelect;
export type NewZonePart = typeof zoneParts.$inferInsert;
