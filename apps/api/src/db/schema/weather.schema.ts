import { index, integer, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./project.schema.js";

// Recorded site weather, one row per project per hour (start of the hour). Filled by the API from
// Open-Meteo (model data for the site's coordinates); `source` leaves room for an on-site station later.
// Re-fetching the same hour overwrites it (recent hours get corrected by the provider).
export const weatherHourly = pgTable(
  "weather_hourly",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    hour: timestamp("hour", { withTimezone: true }).notNull(),
    temperatureC: numeric("temperature_c", { precision: 4, scale: 1, mode: "number" }),
    humidityPct: integer("humidity_pct"),
    precipitationMm: numeric("precipitation_mm", { precision: 5, scale: 1, mode: "number" }),
    windKmh: numeric("wind_kmh", { precision: 5, scale: 1, mode: "number" }),
    gustKmh: numeric("gust_kmh", { precision: 5, scale: 1, mode: "number" }),
    weatherCode: integer("weather_code"),
    source: text("source").notNull().default("open-meteo"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.hour] }), index("weather_hourly_fetched_idx").on(t.projectId, t.fetchedAt)],
);
