import { t } from "elysia";
import { DATE_RE } from "@/modules/site-activities/site-activity.schema.js";

const isoDate = t.String({ pattern: DATE_RE });
const count = t.Integer({ minimum: 0, maximum: 5000 });
// The five accident categories (same codes as @sts/shared ACCIDENT_CATEGORY_CODES).
const categoryCode = t.Union([
  t.Literal("lti"),
  t.Literal("non_lti"),
  t.Literal("property_damage"),
  t.Literal("near_miss"),
  t.Literal("emergency"),
]);

export const safetyStatEntryParams = t.Object({
  projectId: t.String({ format: "uuid" }),
  entryId: t.String({ format: "uuid" }),
});

export const safetyStatBody = t.Object({
  date: isoDate,
  nearMiss: count,
  inspections: count,
  lti: count,
  nonLti: count,
  propertyDamage: count,
  emergency: count,
  manHours: t.Number({ minimum: 0, maximum: 10_000_000 }),
  // Hand-written safety clock (paper STATISTIC rows); null = let the system compute it.
  daysWithoutAccident: t.Optional(t.Union([t.Integer({ minimum: 0, maximum: 20_000 }), t.Null()])),
  highestDaysWithoutAccident: t.Optional(t.Union([t.Integer({ minimum: 0, maximum: 20_000 }), t.Null()])),
  // Hand-written "Year YYYY" totals (paper STATISTIC column): stored per year and shown instead of the
  // computed count. Only the categories the editor changed are sent.
  yearValues: t.Optional(t.Array(t.Object({ code: categoryCode, value: t.Integer({ minimum: 0, maximum: 100_000 }) }), { maxItems: 5 })),
  note: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
  // Who confirmed these numbers, typed by the person (accounts may be shared) — kept in the edit history.
  confirmedName: t.Optional(t.Union([t.String({ minLength: 1, maxLength: 120 }), t.Null()])),
});

// Safety history before the app. The total is the whole project's man-hours up to `asOf` (the number EPS can
// estimate); the server works out how much of it is "before the app". Dates may be null to clear them.
export const safetyBaselineBody = t.Object({
  totalManHours: t.Optional(t.Object({ value: t.Number({ minimum: 0, maximum: 1_000_000_000 }), asOf: isoDate }, { additionalProperties: false })),
  lastLtiDate: t.Optional(t.Union([isoDate, t.Null()])),
  projectStartDate: t.Optional(t.Union([isoDate, t.Null()])),
  confirmedName: t.Optional(t.Union([t.String({ minLength: 1, maxLength: 120 }), t.Null()])),
}, { additionalProperties: false });
export const safetyBaselineQuery = t.Object({ asOf: isoDate });
