import { POSITION_CODES } from "@sts/shared";
import { t } from "elysia";
import { hhmm, isoDate } from "@/shared/http/params.js";

const count = t.Integer({ minimum: 0, maximum: 5000 });

export const epsManpowerQuery = t.Object({ date: isoDate });

export const epsManpowerBody = t.Object({
  date: isoDate,
  startTime: hhmm,
  endTime: hhmm,
  workHours: t.Number({ minimum: 0, maximum: 24, multipleOf: 0.5 }),
  otHours: t.Optional(t.Number({ minimum: 0, maximum: 24, multipleOf: 0.5 })),
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
  // Optional: EPS people who work site-wide (PM/QAQC) do not have to be tied to a building.
  allocations: t.Optional(
    t.Array(
      t.Object({
        buildingId: t.String({ format: "uuid" }),
        headcount: t.Integer({ minimum: 1, maximum: 5000 }),
        workDescription: t.String({ minLength: 1, maxLength: 500 }),
        startTime: t.Optional(hhmm),
        endTime: t.Optional(hhmm),
      }),
      { maxItems: 32 },
    ),
  ),
});
