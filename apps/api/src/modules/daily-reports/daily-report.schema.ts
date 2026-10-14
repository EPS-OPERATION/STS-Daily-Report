import { t } from "elysia";
import {
  ACCIDENT_CATEGORY_CODES,
  DISCIPLINE_CODES,
  MACHINE_TYPES,
  PERMIT_TYPE_CODES,
  PHOTO_CATEGORIES,
  POSITION_CODES,
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

export const reviewQueueQuery = t.Object({
  date: t.Optional(isoDate),
  from: t.Optional(isoDate),
  to: t.Optional(isoDate),
});

// EPS review decision. Rejection must tell the contractor what to fix
// (service enforces the note; maxLength keeps the envelope small).
export const reviewBody = t.Object({
  decision: t.Union([t.Literal("approved"), t.Literal("rejected")]),
  note: t.Optional(t.String({ maxLength: 1000 })),
});

const crewFields = {
  discipline: t.Union(DISCIPLINE_CODES.map((d) => t.Literal(d))),
  positions: t.Array(
    t.Object({
      position: t.Union(POSITION_CODES.map((p) => t.Literal(p))),
      headcount: t.Integer({ minimum: 1, maximum: 5000 }),
    }),
    { minItems: 1, maxItems: POSITION_CODES.length },
  ),
  thaiMale: count,
  thaiFemale: count,
  foreignMale: count,
  foreignFemale: count,
};

export const morningBody = t.Object({
  date: isoDate,
  contractorId: t.String({ format: "uuid" }),
  startTime: hhmm,
  endTime: hhmm,
  workHours: t.Number({ minimum: 0, maximum: 24, multipleOf: 0.5 }),
  weather: t.Union(WEATHER_CODES.map((w) => t.Literal(w))),
  temperatureC: t.Optional(t.Number({ minimum: -10, maximum: 60 })),
  humidityPct: t.Optional(t.Integer({ minimum: 0, maximum: 100 })),
  equipment: t.Array(
    t.Object({
      // Free text: SITE_EQUIPMENT_TYPES is the suggestion list, contractors may add custom names.
      equipmentType: t.String({ minLength: 1, maxLength: 120 }),
      qty: t.Integer({ minimum: 1, maximum: 500 }),
    }),
    { maxItems: 30 },
  ),
  crews: t.Array(
    t.Object({
      ...crewFields,
      allocations: t.Array(
        t.Object({
          buildingId: t.String({ format: "uuid" }),
          headcount: t.Integer({ minimum: 1, maximum: 5000 }),
          workDescription: t.String({ minLength: 1, maxLength: 500 }),
          startTime: t.Optional(hhmm),
          endTime: t.Optional(hhmm),
          planPercent: t.Optional(percent),
        }),
        { minItems: 1, maxItems: 32 },
      ),
    }),
    { minItems: 1, maxItems: DISCIPLINE_CODES.length },
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
  accidentCategory: t.Optional(t.Union(ACCIDENT_CATEGORY_CODES.map((c) => t.Literal(c)))),
  crews: t.Array(t.Object(crewFields), { minItems: 1, maxItems: DISCIPLINE_CODES.length }),
  progress: t.Array(
    t.Object({
      allocationId: t.String({ format: "uuid" }),
      actualPercent: percent,
      countermeasure: t.Optional(t.String({ maxLength: 1000 })),
    }),
    { maxItems: 16 },
  ),
  signatureName: t.String({ minLength: 1, maxLength: 120 }),
  // PNG data URL from the signature pad; ~200 KB ceiling. Optional when re-saving an already-signed report.
  signatureData: t.Optional(t.String({ pattern: "^data:image/png;base64,", maxLength: 200_000 })),
  // Requests for tomorrow (reviewed at the 17:00 coordination meeting).
  machinery: t.Array(
    t.Object({
      buildingId: t.String({ format: "uuid" }),
      machineType: t.Union(MACHINE_TYPES.map((m) => t.Literal(m))),
      unitTag: t.Optional(t.String({ maxLength: 40 })),
      startTime: t.Optional(hhmm),
      endTime: t.Optional(hhmm),
      purpose: t.Optional(t.String({ maxLength: 300 })),
    }),
    { maxItems: 50 },
  ),
  equipmentRequests: t.Array(
    t.Object({
      buildingId: t.String({ format: "uuid" }),
      // Free text (same suggestion list as morning equipment).
      equipmentType: t.String({ minLength: 1, maxLength: 120 }),
      qty: t.Integer({ minimum: 1, maximum: 500 }),
      purpose: t.Optional(t.String({ maxLength: 300 })),
    }),
    { maxItems: 30 },
  ),
  permits: t.Array(
    t.Object({
      buildingId: t.String({ format: "uuid" }),
      permitType: t.Union(PERMIT_TYPE_CODES.map((p) => t.Literal(p))),
      otherLabel: t.Optional(t.String({ maxLength: 120 })),
      workers: t.Integer({ minimum: 1, maximum: 5000 }),
      highRisk: t.Optional(t.Boolean()),
      taskName: t.Optional(t.String({ maxLength: 120 })),
      supervisorName: t.Optional(t.String({ maxLength: 120 })),
    }),
    { maxItems: 50 },
  ),
  roadUsage: t.Array(
    t.Object({
      buildingId: t.Optional(t.Nullable(t.String())),
      roadLocation: t.String({ minLength: 1, maxLength: 120 }),
      startTime: hhmm,
      endTime: hhmm,
      purpose: t.String({ minLength: 1, maxLength: 300 }),
    }),
    { maxItems: 20 },
  ),
  // Tomorrow Forecast Activities (paper form R003).
  forecasts: t.Optional(
    t.Array(
      t.Object({
        buildingId: t.String({ format: "uuid" }),
        description: t.String({ minLength: 1, maxLength: 300 }),
      }),
      { maxItems: 20 },
    ),
  ),
  // Materials on site today (paper form "Add Material on site").
  materials: t.Array(
    t.Object({
      name: t.String({ minLength: 1, maxLength: 120 }),
      qty: t.Number({ minimum: 0, maximum: 1000000 }),
      unit: t.String({ minLength: 1, maxLength: 20 }),
    }),
    { maxItems: 30 },
  ),
});

export const materialsQuery = t.Object({
  from: t.Optional(isoDate),
  to: t.Optional(isoDate),
  search: t.Optional(t.String({ maxLength: 120 })),
  contractorId: t.Optional(t.String({ format: "uuid" })),
  page: t.Optional(t.String()),
  pageSize: t.Optional(t.String()),
});

export const photoUploadBody = t.Object({
  category: t.Union(PHOTO_CATEGORIES.map((c) => t.Literal(c))),
  file: t.File({ type: "image", maxSize: "10m" }),
});

// `date` = single day (kept for old links); `from`/`to` = range.
export const siteDayQuery = t.Object({ date: t.Optional(isoDate), from: t.Optional(isoDate), to: t.Optional(isoDate) });

export const dateRangeQuery = t.Object({ from: isoDate, to: isoDate });

export const manpowerTrendQuery = t.Object({
  until: isoDate,
  weeks: t.Optional(t.Numeric({ minimum: 2, maximum: 52 })),
});

// EPS settles a road booking's time (the service checks the role).
export const roadUsageParams = t.Object({ projectId: t.String({ format: "uuid" }), id: t.String({ format: "uuid" }) });
export const roadAdjustBody = t.Object({ startTime: hhmm, endTime: hhmm }, { additionalProperties: false });
