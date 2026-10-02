import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const activityStatusSchema = z.enum(["active", "attention", "blocked", "completed"]);

export const siteActivityFormSchema = z.object({
  workDate: z.string().regex(DATE_RE, "Use YYYY-MM-DD"),
  zoneId: z.string().uuid("Select a zone"),
  zonePartId: z.string().uuid().nullable().default(null),
  contractorId: z.string().uuid("Select a contractor"),
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(2000).optional(),
  status: activityStatusSchema,
  manpower: z.coerce.number().int().min(0).max(100000),
  progressPercent: z.coerce.number().int().min(0).max(100),
  startTime: z.string().regex(TIME_RE, "Use HH:MM").optional().or(z.literal("")),
  endTime: z.string().regex(TIME_RE, "Use HH:MM").optional().or(z.literal("")),
});

export type SiteActivityFormValues = z.infer<typeof siteActivityFormSchema>;
