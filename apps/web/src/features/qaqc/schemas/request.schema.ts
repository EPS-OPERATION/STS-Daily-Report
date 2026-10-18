import { INSPECTION_TYPE_CODES, READINESS_CODES } from "@sts/shared";
import { z } from "zod";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "รูปแบบเวลา HH:MM");

const asTuple = <T extends string>(list: readonly T[]) => list as unknown as [T, ...T[]];

export const requestSchema = z.object({
  buildingId: z.string().min(1, "เลือกอาคาร"),
  inspectionDate: z.string().min(1, "เลือกวันที่"),
  inspectionTime: hhmm,
  inspectionType: z.enum(asTuple(INSPECTION_TYPE_CODES)).default("other"),
  workItem: z.string().trim().min(1, "ระบุงานที่ขอตรวจ").max(200),
  location: z.string().trim().max(120).optional(),
  drawingRef: z.string().trim().max(120).optional(),
  readiness: z.enum(asTuple(READINESS_CODES)),
});

export type RequestFormValues = z.infer<typeof requestSchema>;
