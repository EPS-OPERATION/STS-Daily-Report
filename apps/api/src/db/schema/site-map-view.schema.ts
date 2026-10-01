import { sql } from "drizzle-orm";
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
} from "drizzle-orm/pg-core";
import { sitePlans } from "./site-plan.schema.js";
import { facilities } from "./facility.schema.js";

export const siteMapViews = pgTable(
  "site_map_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sitePlanId: uuid("site_plan_id")
      .notNull()
      .references(() => sitePlans.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    imageObjectKey: text("image_object_key"),
    legacyAssetUrl: text("legacy_asset_url"),
    width: integer("width"),
    height: integer("height"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("site_map_views_plan_key_unique").on(t.sitePlanId, t.key),
    check("site_map_views_sort_order_check", sql`${t.sortOrder} >= 0`),
    check(
      "site_map_views_dimensions_check",
      sql`(${t.width} IS NULL) = (${t.height} IS NULL) AND (${t.width} IS NULL OR (${t.width} > 0 AND ${t.height} > 0))`,
    ),
  ],
);

export const facilityMapMarkers = pgTable(
  "facility_map_markers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    siteMapViewId: uuid("site_map_view_id")
      .notNull()
      .references(() => siteMapViews.id, { onDelete: "cascade" }),
    x: doublePrecision("x").notNull(),
    y: doublePrecision("y").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("facility_map_markers_facility_view_unique").on(t.facilityId, t.siteMapViewId),
    index("facility_map_markers_view_idx").on(t.siteMapViewId),
    check("facility_map_markers_coordinates_check", sql`${t.x} BETWEEN 0 AND 1 AND ${t.y} BETWEEN 0 AND 1`),
  ],
);
