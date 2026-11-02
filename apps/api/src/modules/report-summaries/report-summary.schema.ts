import { t } from "elysia";
import { isoDate } from "@/shared/http/params.js";

export const weeklySummaryQuery = t.Object({ weekStart: isoDate });

export const materialsQuery = t.Object({
  from: t.Optional(isoDate),
  to: t.Optional(isoDate),
  search: t.Optional(t.String({ maxLength: 120 })),
  contractorId: t.Optional(t.String({ format: "uuid" })),
  page: t.Optional(t.String()),
  pageSize: t.Optional(t.String()),
});

// `date` = single day (kept for old links); `from`/`to` = range.
export const siteDayQuery = t.Object({ date: t.Optional(isoDate), from: t.Optional(isoDate), to: t.Optional(isoDate) });

export const manpowerTrendQuery = t.Object({
  until: isoDate,
  weeks: t.Optional(t.Numeric({ minimum: 2, maximum: 52 })),
});
