import { POSITION_CODES, type PositionCode } from "@sts/shared";
import { z } from "zod";

const count = z.number().int().min(0).max(5000);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "รูปแบบเวลา HH:MM");

const asTuple = <T extends string>(list: readonly T[]) => list as unknown as [T, ...T[]];

export const epsPositionCounts = z.record(z.enum(asTuple(POSITION_CODES)), count);

export const epsAllocationSchema = z
  .object({
    buildingId: z.string(),
    headcount: z.number().int().min(0).max(5000),
    workDescription: z.string().trim().max(500),
  })
  .superRefine((a, ctx) => {
    if (isBlankEpsAllocation(a)) return;
    if (!a.buildingId) ctx.addIssue({ code: "custom", path: ["buildingId"], message: "เลือกอาคาร" });
    if (!a.workDescription.trim()) ctx.addIssue({ code: "custom", path: ["workDescription"], message: "ระบุรายละเอียดงาน" });
    if (a.headcount < 1) ctx.addIssue({ code: "custom", path: ["headcount"], message: "ใส่จำนวนคน (อย่างน้อย 1)" });
  });

export type EpsAllocationValues = z.infer<typeof epsAllocationSchema>;

export function isBlankEpsAllocation(a: { buildingId: string; workDescription: string }) {
  return !a.buildingId && !a.workDescription.trim();
}

export const epsManpowerSchema = z
  .object({
    startTime: hhmm,
    endTime: hhmm,
    workHours: z.number().min(0).max(24),
    otHours: z.number().min(0).max(24),
    positions: epsPositionCounts,
    thaiMale: count,
    thaiFemale: count,
    foreignMale: count,
    foreignFemale: count,
    allocations: z.array(epsAllocationSchema).max(32),
  })
  .superRefine((v, ctx) => {
    if (v.startTime >= v.endTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม" });
    }
    const total = Object.values(v.positions).reduce<number>((s, n) => s + (Number.isFinite(n) ? n : 0), 0);
    if (total <= 0) {
      ctx.addIssue({ code: "custom", path: ["positions"], message: "กรอกจำนวนคนตามตำแหน่งอย่างน้อย 1 คน" });
    }
    const byNationality = v.thaiMale + v.thaiFemale + v.foreignMale + v.foreignFemale;
    if (byNationality !== total) {
      ctx.addIssue({
        code: "custom",
        path: ["thaiMale"],
        message: `สัญชาติ/เพศรวม ${byNationality} คน ต้องเท่ากับจำนวนตามตำแหน่ง ${total} คน`,
      });
    }
    const placed = v.allocations
      .filter((a) => !isBlankEpsAllocation(a))
      .reduce((s, a) => s + (Number.isFinite(a.headcount) ? a.headcount : 0), 0);
    if (placed > total) {
      ctx.addIssue({
        code: "custom",
        path: ["allocations"],
        message: `ลงงานพร้อมกัน ${placed} คน เกินจำนวน EPS ${total} คน`,
      });
    }
  });

export type EpsManpowerFormValues = z.infer<typeof epsManpowerSchema>;

export function emptyEpsPositions(): Record<PositionCode, number> {
  return Object.fromEntries(POSITION_CODES.map((p) => [p, 0])) as Record<PositionCode, number>;
}
