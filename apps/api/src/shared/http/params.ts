import { t } from "elysia";

export const DATE_RE = "^\\d{4}-\\d{2}-\\d{2}$";
export const TIME_RE = "^([01]\\d|2[0-3]):[0-5]\\d$";

export const isoDate = t.String({ pattern: DATE_RE });

export const hhmm = t.String({ pattern: TIME_RE });

export const projectIdParams = t.Object({ projectId: t.String({ format: "uuid" }) });

export const dateRangeQuery = t.Object({ from: isoDate, to: isoDate });
