import { t } from "elysia";
import { DATE_RE, TIME_RE } from "@/modules/site-activities/site-activity.schema.js";

const isoDate = t.String({ pattern: DATE_RE });
export const projectParams = t.Object({ projectId: t.String({ format: "uuid" }) });
export const hourlyQuery = t.Object({ from: isoDate, to: isoDate });
export const atQuery = t.Object({ date: isoDate, time: t.String({ pattern: TIME_RE }) });
export const compareQuery = t.Object({ from: isoDate, to: isoDate, contractors: t.Optional(t.String({ maxLength: 500 })) });
