import { z } from "zod";
import { COORDINATION_ICONS, COORDINATION_MAX, COORDINATION_MIN, coordinationDateValid, coordinationGeometryError } from "@sts/shared";
export const coordinationFormSchema = z.object({
  contractorId: z.string().uuid("เลือกผู้รับเหมา"), workDate: z.string().refine(coordinationDateValid, "เลือกวันที่ทำงาน"),
  title: z.string().trim().min(1, "ระบุชื่องาน").max(200, "ชื่องานยาวได้ไม่เกิน 200 ตัวอักษร"),
  icon: z.enum(COORDINATION_ICONS), x: z.number().min(COORDINATION_MIN).max(COORDINATION_MAX), y: z.number().min(COORDINATION_MIN).max(COORDINATION_MAX),
  rotation: z.number().min(-360).max(360), areaKind: z.enum(["rectangle", "polygon"]),
  geometry: z.object({ type: z.literal("polygon"), points: z.array(z.object({ x: z.number(), y: z.number() })) }),
  linkArea: z.boolean().optional(),
  note: z.string().max(1000, "หมายเหตุยาวได้ไม่เกิน 1000 ตัวอักษร").nullable().optional(),
}).superRefine((v, ctx) => {
  const error = coordinationGeometryError(v.geometry);
  if (error) ctx.addIssue({ code: "custom", path: ["geometry"], message: error });
});
