import {
  ACCIDENT_CATEGORY_CODES,
  DISCIPLINE_CODES,
  INSPECTION_TYPE_CODES,
  MACHINE_TYPES,
  PERMIT_TYPE_CODES,
  POSITION_CODES,
  READINESS_CODES,
  SITE_EQUIPMENT_TYPES,
  WEATHER_CODES,
} from "@sts/shared";
import { z } from "zod";

const count = z.number().int().min(0, "ต้องไม่ติดลบ").max(5000);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "รูปแบบเวลา HH:MM");
const asTuple = <T extends string>(list: readonly T[]) => list as unknown as [T, ...T[]];

// Sum of a code→count record (positions / equipment).
export const sumCounts = (rec: Record<string, number> | undefined) =>
  Object.values(rec ?? {}).reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);

export const allocationSchema = z.object({
  buildingId: z.string().min(1, "เลือกอาคาร"),
  headcount: z.number().int().min(1, "อย่างน้อย 1 คน").max(5000),
  workDescription: z.string().trim().min(1, "ระบุลักษณะงาน").max(500),
  planPercent: z.number().int().min(0).max(100),
});

// Time is optional: "allDay" = needed the whole day (no window sent).
export const machinerySchema = z
  .object({
    machineType: z.enum(MACHINE_TYPES, { errorMap: () => ({ message: "เลือกประเภทเครื่องจักร" }) }),
    unitTag: z.string().trim().max(40).optional(),
    buildingId: z.string().min(1, "เลือกอาคาร"),
    allDay: z.boolean(),
    startTime: hhmm,
    endTime: hhmm,
    purpose: z.string().trim().max(300).optional(),
  })
  .refine((m) => m.allDay || m.startTime < m.endTime, { message: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม", path: ["endTime"] });

export const equipmentRequestSchema = z.object({
  equipmentType: z.enum(asTuple(SITE_EQUIPMENT_TYPES), { errorMap: () => ({ message: "เลือกเครื่องมือ/อุปกรณ์" }) }),
  qty: z.number().int().min(1, "อย่างน้อย 1").max(500),
  buildingId: z.string().min(1, "เลือกอาคาร"),
  purpose: z.string().trim().max(300).optional(),
});

export const permitSchema = z
  .object({
    permitType: z.enum(asTuple(PERMIT_TYPE_CODES), { errorMap: () => ({ message: "เลือกประเภทใบอนุญาต" }) }),
    otherLabel: z.string().trim().max(120).optional(),
    buildingId: z.string().min(1, "เลือกอาคาร"),
    workers: z.number().int().min(1, "อย่างน้อย 1 คน").max(5000),
  })
  .refine((p) => p.permitType !== "other" || Boolean(p.otherLabel), {
    message: "ระบุชื่องาน",
    path: ["otherLabel"],
  });

export const morningSchema = z
  .object({
    startTime: hhmm,
    endTime: hhmm,
    workHours: z.number().min(0).max(24),
    disciplines: z.array(z.enum(asTuple(DISCIPLINE_CODES))),
    weather: z.enum(asTuple(WEATHER_CODES), { errorMap: () => ({ message: "เลือกสภาพอากาศ" }) }),
    temperatureC: z.number().min(-10).max(60).nullable(),
    humidityPct: z.number().int().min(0).max(100).nullable(),
    // Position headcount is the primary total.
    positions: z.record(z.enum(asTuple(POSITION_CODES)), count),
    equipment: z.record(z.enum(asTuple(SITE_EQUIPMENT_TYPES)), z.number().int().min(0).max(500)),
    thaiMale: count,
    thaiFemale: count,
    foreignMale: count,
    foreignFemale: count,
    allocations: z.array(allocationSchema).min(1, "เพิ่มอาคารอย่างน้อย 1 รายการ"),
  })
  .superRefine((v, ctx) => {
    if (v.startTime >= v.endTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "เวลาออกงานต้องหลังเวลาเข้างาน" });
    }
    const total = sumCounts(v.positions);
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
    const allocated = v.allocations.reduce((s, a) => s + a.headcount, 0);
    if (allocated !== total) {
      ctx.addIssue({ code: "custom", path: ["allocations"], message: "จัดสรรคนงานลงอาคารให้ครบพอดีกับจำนวนคนทั้งหมด" });
    }
    const placed = new Set<string>();
    v.allocations.forEach((a, i) => {
      if (a.buildingId && placed.has(a.buildingId)) {
        ctx.addIssue({ code: "custom", path: ["allocations", i, "buildingId"], message: "เลือกอาคารซ้ำ" });
      }
      placed.add(a.buildingId);
    });
  });

export type MorningFormValues = z.infer<typeof morningSchema>;

export const roadUsageSchema = z
  .object({
    roadLocation: z.string().trim().min(1, "ระบุถนน/ช่องทาง").max(120),
    buildingId: z.string().min(1, "เลือกอาคาร"),
    startTime: hhmm,
    endTime: hhmm,
    purpose: z.string().trim().min(1, "ระบุวัตถุประสงค์").max(300),
  })
  .refine((r) => r.startTime < r.endTime, { message: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม", path: ["endTime"] });

export const eveningSchema = z
  .object({
    otHours: z.number().min(0, "ต้องไม่ติดลบ").max(24, "ไม่เกิน 24 ชม."),
    accidentOccurred: z.boolean({ required_error: "เลือกว่าเกิดอุบัติเหตุหรือไม่" }).nullable(),
    accidentNote: z.string().trim().max(1000).optional(),
    accidentCategory: z.enum(asTuple(ACCIDENT_CATEGORY_CODES)).nullable(),
    progress: z.array(
      z.object({
        allocationId: z.string(),
        planPercent: z.number(),
        actualPercent: z.number().int().min(0).max(100),
        countermeasure: z.string().trim().max(1000).optional(),
      }),
    ),
    signatureName: z.string().trim().min(1, "ระบุชื่อผู้รายงาน").max(120),
    signatureData: z.string().min(1, "แตะเพื่อเซ็นชื่อก่อนส่ง"),
    // Requests for tomorrow.
    machinery: z.array(machinerySchema),
    equipmentRequests: z.array(equipmentRequestSchema),
    permits: z.array(permitSchema),
    roadUsage: z.array(roadUsageSchema),
  })
  .superRefine((v, ctx) => {
    if (v.accidentOccurred === null) {
      ctx.addIssue({ code: "custom", path: ["accidentOccurred"], message: "เลือกว่าเกิดอุบัติเหตุหรือไม่" });
    }
    if (v.accidentOccurred && !v.accidentCategory) {
      ctx.addIssue({ code: "custom", path: ["accidentCategory"], message: "เลือกประเภทเหตุการณ์" });
    }
    if (v.accidentOccurred && !v.accidentNote) {
      ctx.addIssue({ code: "custom", path: ["accidentNote"], message: "อธิบายเหตุการณ์และการดำเนินการ" });
    }
    v.progress.forEach((p, i) => {
      if (p.actualPercent < p.planPercent && !p.countermeasure) {
        ctx.addIssue({
          code: "custom",
          path: ["progress", i, "countermeasure"],
          message: "ผลงานต่ำกว่าแผน — ต้องระบุสาเหตุและมาตรการแก้ไข",
        });
      }
    });
    if (v.otHours * 2 !== Math.round(v.otHours * 2)) {
      ctx.addIssue({ code: "custom", path: ["otHours"], message: "กรอกทีละ 0.5 ชม." });
    }
  });

export type EveningFormValues = z.infer<typeof eveningSchema>;

export const requestSchema = z.object({
  buildingId: z.string().min(1, "เลือกอาคาร"),
  inspectionDate: z.string().min(1, "เลือกวันที่"),
  inspectionTime: hhmm,
  inspectionType: z.enum(asTuple(INSPECTION_TYPE_CODES), { errorMap: () => ({ message: "เลือกประเภทการตรวจ" }) }),
  workItem: z.string().trim().min(1, "ระบุงานที่ขอตรวจ").max(200),
  location: z.string().trim().max(120).optional(),
  drawingRef: z.string().trim().max(120).optional(),
  readiness: z.enum(asTuple(READINESS_CODES)),
});

export type RequestFormValues = z.infer<typeof requestSchema>;
