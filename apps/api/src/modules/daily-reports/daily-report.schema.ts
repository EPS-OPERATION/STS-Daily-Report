import { t } from "elysia";
import {
  DISCIPLINE_CODES,
  MACHINE_TYPES,
  PERMIT_TYPE_CODES,
  PHOTO_CATEGORIES,
  POSITION_CODES,
  SITE_EQUIPMENT_TYPES,
  WEATHER_CODES,
} from "@sts/shared";
import { DATE_RE, TIME_RE } from "@/modules/site-activities/site-activity.schema.js";

const isoDate = t.String({ pattern: DATE_RE });
const hhmm = t.String({ pattern: TIME_RE });
const count = t.Integer({ minimum: 0, maximum: 5000 });
const percent = t.Integer({ minimum: 0, maximum: 100 });

export const projectIdParams = t.Object({ projectId: t.String({ format: "uuid" }) });
export const reportIdParams = t.Object({ reportId: t.String({ format: "uuid" }) });
export const photoParams = t.Object({
  reportId: t.String({ format: "uuid" }),
  photoId: t.String({ format: "uuid" }),
});

export const currentReportQuery = t.Object({
  date: isoDate,
  contractorId: t.Optional(t.String({ format: "uuid" })),
});

export const weeklySummaryQuery = t.Object({ weekStart: isoDate });

export const reviewQueueQuery = t.Object({ date: isoDate });

// EPS review decision. Rejection must tell the contractor what to fix
// (service enforces the note; maxLength keeps the envelope small).
export const reviewBody = t.Object({
  decision: t.Union([t.Literal("approved"), t.Literal("rejected")]),
  note: t.Optional(t.String({ maxLength: 1000 })),
});

export const morningBody = t.Object({
  date: isoDate,
  contractorId: t.String({ format: "uuid" }),
  startTime: hhmm,
  endTime: hhmm,
  workHours: t.Number({ minimum: 0, maximum: 24, multipleOf: 0.5 }),
  disciplines: t.Array(t.Union(DISCIPLINE_CODES.map((d) => t.Literal(d))), { maxItems: 3, uniqueItems: true }),
  weather: t.Union(WEATHER_CODES.map((w) => t.Literal(w))),
  temperatureC: t.Optional(t.Number({ minimum: -10, maximum: 60 })),
  humidityPct: t.Optional(t.Integer({ minimum: 0, maximum: 100 })),
  positions: t.Array(
    t.Object({
      position: t.Union(POSITION_CODES.map((p) => t.Literal(p))),
      headcount: t.Integer({ minimum: 1, maximum: 5000 }),
    }),
    { minItems: 1, maxItems: POSITION_CODES.length },
  ),
  equipment: t.Array(
    t.Object({
      equipmentType: t.Union(SITE_EQUIPMENT_TYPES.map((e) => t.Literal(e))),
      qty: t.Integer({ minimum: 1, maximum: 500 }),
    }),
    { maxItems: SITE_EQUIPMENT_TYPES.length },
  ),
  thaiMale: count,
  thaiFemale: count,
  foreignMale: count,
  foreignFemale: count,
  allocations: t.Array(
    t.Object({
      buildingId: t.String({ format: "uuid" }),
      headcount: t.Integer({ minimum: 1, maximum: 5000 }),
      workDescription: t.String({ minLength: 1, maxLength: 500 }),
      planPercent: percent,
    }),
    { minItems: 1, maxItems: 16 },
  ),
});

export const reportKeyBody = t.Object({
  date: isoDate,
  contractorId: t.String({ format: "uuid" }),
});

export const eveningBody = t.Object({
  date: isoDate,
  contractorId: t.String({ format: "uuid" }),
  otHours: t.Number({ minimum: 0, maximum: 24, multipleOf: 0.5 }),
  accidentOccurred: t.Boolean(),
  accidentNote: t.Optional(t.String({ maxLength: 1000 })),
  progress: t.Array(
    t.Object({
      allocationId: t.String({ format: "uuid" }),
      actualPercent: percent,
      countermeasure: t.Optional(t.String({ maxLength: 1000 })),
    }),
    { maxItems: 16 },
  ),
  signatureName: t.String({ minLength: 1, maxLength: 120 }),
  // PNG data URL from the signature pad; ~200 KB ceiling.
  signatureData: t.String({ pattern: "^data:image/png;base64,", maxLength: 200_000 }),
  // Requests for tomorrow (reviewed at the 17:00 coordination meeting).
  machinery: t.Array(
    t.Object({
      buildingId: t.String({ format: "uuid" }),
      machineType: t.Union(MACHINE_TYPES.map((m) => t.Literal(m))),
      unitTag: t.Optional(t.String({ maxLength: 40 })),
      startTime: hhmm,
      endTime: hhmm,
    }),
    { maxItems: 50 },
  ),
  permits: t.Array(
    t.Object({
      buildingId: t.String({ format: "uuid" }),
      permitType: t.Union(PERMIT_TYPE_CODES.map((p) => t.Literal(p))),
      otherLabel: t.Optional(t.String({ maxLength: 120 })),
      workers: t.Integer({ minimum: 1, maximum: 5000 }),
    }),
    { maxItems: 50 },
  ),
  roadUsage: t.Array(
    t.Object({
      buildingId: t.String({ format: "uuid" }),
      roadLocation: t.String({ minLength: 1, maxLength: 120 }),
      startTime: hhmm,
      endTime: hhmm,
      purpose: t.String({ minLength: 1, maxLength: 300 }),
    }),
    { maxItems: 20 },
  ),
});

export const photoUploadBody = t.Object({
  category: t.Union(PHOTO_CATEGORIES.map((c) => t.Literal(c))),
  file: t.File({ type: "image", maxSize: "10m" }),
});

export const dateRangeQuery = t.Object({ from: isoDate, to: isoDate });

export const manpowerTrendQuery = t.Object({
  until: isoDate,
  weeks: t.Optional(t.Numeric({ minimum: 2, maximum: 52 })),
});
