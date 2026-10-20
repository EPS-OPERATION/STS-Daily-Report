import { ACCIDENT_CATEGORY_CODES, DISCIPLINE_CODES, MACHINE_TYPES, POSITION_CODES, WEATHER_CODES, allocationPeak, timeWindowsOverlap, type Discipline } from "@sts/shared";
import { z } from "zod";

const count = z.number().int().min(0, "ต้องไม่ติดลบ").max(5000);

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "รูปแบบเวลา HH:MM");

const asTuple = <T extends string>(list: readonly T[]) => list as unknown as [T, ...T[]];

// Sum of a code→count record (positions / equipment).
export const sumCounts = (rec: Partial<Record<string, number>> | undefined) =>
  Object.values(rec ?? {}).reduce<number>((s, n) => s + (typeof n === "number" && Number.isFinite(n) ? n : 0), 0);

const positionCounts = z.record(z.enum(asTuple(POSITION_CODES)), count);

const disciplinePick = z.array(z.enum(asTuple(DISCIPLINE_CODES))).min(1, "เลือกประเภทงานอย่างน้อย 1 อย่าง");

// Manpower of one discipline crew: people by position + nationality/sex split of the same people.
const crewManpower = {
  positions: positionCounts,
  thaiMale: count,
  thaiFemale: count,
  foreignMale: count,
  foreignFemale: count,
};

export const crewSchema = z.object(crewManpower);

// Each selected discipline must total > 0 and its nationality/sex split must match the positions.
function checkCrews(
  crews: Record<Discipline, { positions: Record<string, number>; thaiMale: number; thaiFemale: number; foreignMale: number; foreignFemale: number }>,
  picked: Discipline[],
  ctx: z.RefinementCtx,
) {
  for (const d of picked) {
    const c = crews[d];
    const total = sumCounts(c.positions);
    if (total <= 0) {
      ctx.addIssue({ code: "custom", path: ["crews", d, "positions"], message: "กรอกจำนวนคนตามตำแหน่งอย่างน้อย 1 คน" });
    }
    const byNationality = c.thaiMale + c.thaiFemale + c.foreignMale + c.foreignFemale;
    if (byNationality !== total) {
      ctx.addIssue({
        code: "custom",
        path: ["crews", d, "thaiMale"],
        message: `สัญชาติ/เพศรวม ${byNationality} คน ต้องเท่ากับจำนวนตามตำแหน่ง ${total} คน`,
      });
    }
  }
}

// A row with neither building nor work is an unused spare line (the table starts with 3): it is
// skipped by every check and never sent.
export const isBlankActivity = (a: { buildingId: string; workDescription: string }) => !a.buildingId && !a.workDescription.trim();

// One Today Activity row. Time window and plan % are opt-in (timed / hasPlan) so contractors
// who do not need them only fill building, work and people.
export const allocationSchema = z
  .object({
    buildingId: z.string(),
    headcount: z.number().int().min(0).max(5000),
    workDescription: z.string().trim().max(500),
    timed: z.boolean(),
    startTime: hhmm,
    endTime: hhmm,
    hasPlan: z.boolean(),
    planPercent: z.number().int().min(0).max(100),
  })
  .superRefine((a, ctx) => {
    if (isBlankActivity(a)) return;
    if (!a.buildingId) ctx.addIssue({ code: "custom", path: ["buildingId"], message: "เลือกอาคาร" });
    if (!a.workDescription.trim()) ctx.addIssue({ code: "custom", path: ["workDescription"], message: "ระบุรายละเอียดงาน" });
    if (a.headcount < 1) ctx.addIssue({ code: "custom", path: ["headcount"], message: "ใส่จำนวนคน (อย่างน้อย 1)" });
    if (a.timed && a.startTime >= a.endTime) ctx.addIssue({ code: "custom", path: ["endTime"], message: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม" });
  });

export type ActivityValues = z.infer<typeof allocationSchema>;

// Form row → shared coverage input (untimed = all day).
export const activityWindow = (a: Pick<ActivityValues, "headcount" | "timed" | "startTime" | "endTime">) => ({
  headcount: Number.isFinite(a.headcount) ? a.headcount : 0,
  startTime: a.timed ? a.startTime : null,
  endTime: a.timed ? a.endTime : null,
});

// Most people placed at once vs the crew. Only "more than came" blocks sending; fewer is
// shown as information (not everyone has to be assigned).
export function placementStatus(
  all: Pick<ActivityValues, "buildingId" | "workDescription" | "headcount" | "timed" | "startTime" | "endTime">[],
  dayStart: string,
  dayEnd: string,
  total: number,
): { placed: number; over: string | null } {
  const rows = all.filter((r) => !isBlankActivity(r));
  const peak = allocationPeak(rows.map(activityWindow), dayStart, dayEnd);
  const when = rows.some((r) => r.timed) ? `ช่วง ${peak.from}–${peak.to} ` : "";
  return {
    placed: peak.placed,
    over: peak.placed > total ? `${when}ลงงานพร้อมกัน ${peak.placed} คน เกินจำนวนคนที่มา ${total} คน` : null,
  };
}

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
  // Free text: SITE_EQUIPMENT_TYPES is the suggestion list, contractors may type custom names.
  equipmentType: z.string().trim().min(1, "ระบุเครื่องมือ/อุปกรณ์").max(120),
  qty: z.number().int().min(1, "อย่างน้อย 1").max(500),
  buildingId: z.string().min(1, "เลือกอาคาร"),
  purpose: z.string().trim().max(300).optional(),
});

export const permitSchema = z
  .object({
    permitType: z.string().trim().min(1, "เลือกประเภทใบอนุญาต"),
    otherLabel: z.string().trim().max(120).optional(),
    buildingId: z.string().min(1, "เลือกอาคาร"),
    workers: z.number().int().min(1, "อย่างน้อย 1 คน").max(5000),
    highRisk: z.boolean(),
    taskName: z.string().trim().max(120),
    supervisorName: z.string().trim().max(120),
  })
  .refine((p) => p.permitType !== "other" || Boolean(p.otherLabel), {
    message: "ระบุชื่องาน",
    path: ["otherLabel"],
  })
  // High-risk is the contractor's own call; once ticked, the task and its EPS supervisor are required.
  .refine((p) => !p.highRisk || Boolean(p.taskName), { message: "ระบุชื่องานความเสี่ยงสูง", path: ["taskName"] })
  .refine((p) => !p.highRisk || Boolean(p.supervisorName), { message: "ระบุผู้ควบคุมงาน (EPS)", path: ["supervisorName"] });

const morningCrewSchema = z.object({ ...crewManpower, allocations: z.array(allocationSchema) });

export const morningSchema = z
  .object({
    startTime: hhmm,
    endTime: hhmm,
    workHours: z.number().min(0).max(24),
    // Which discipline forms are open; only these crews are sent.
    disciplines: disciplinePick,
    weather: z.enum(asTuple(WEATHER_CODES), { errorMap: () => ({ message: "เลือกสภาพอากาศ" }) }),
    temperatureC: z.number().min(-10).max(60).nullable(),
    humidityPct: z.number().int().min(0).max(100).nullable(),
    equipment: z.record(z.string(), count),
    crews: z.object({ CE: morningCrewSchema, ME: morningCrewSchema, EE: morningCrewSchema }),
    permits: z.array(permitSchema).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.startTime >= v.endTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "เวลาออกงานต้องหลังเวลาเข้างาน" });
    }
    // Morning equipment: fixed list + contractor-added custom names. One row per
    // name (case-insensitive), max 30 rows with qty > 0.
    const used = Object.entries(v.equipment ?? {}).filter(([, n]) => (n ?? 0) > 0);
    if (used.length > 30) {
      ctx.addIssue({ code: "custom", path: ["equipment"], message: "เครื่องจักร/อุปกรณ์ได้สูงสุด 30 รายการ" });
    }
    const seen = new Set<string>();
    for (const [name] of used) {
      const key = name.trim().toLowerCase();
      if (!key) {
        ctx.addIssue({ code: "custom", path: ["equipment"], message: "ระบุชื่อเครื่องจักร/อุปกรณ์" });
      } else if (key.length > 120) {
        ctx.addIssue({ code: "custom", path: ["equipment"], message: "ชื่อเครื่องจักร/อุปกรณ์ยาวเกินไป" });
      } else if (seen.has(key)) {
        ctx.addIssue({ code: "custom", path: ["equipment"], message: `อุปกรณ์ "${name.trim()}" ซ้ำ` });
      }
      seen.add(key);
    }
    checkCrews(v.crews, v.disciplines, ctx);
    for (const d of v.disciplines) {
      const crew = v.crews[d];
      if (crew.allocations.every(isBlankActivity)) {
        ctx.addIssue({ code: "custom", path: ["crews", d, "allocations"], message: "ลงงานอย่างน้อย 1 แถว (อาคาร + งาน + คน)" });
      }
      const { over } = placementStatus(crew.allocations, v.startTime, v.endTime, sumCounts(crew.positions));
      if (over) ctx.addIssue({ code: "custom", path: ["crews", d, "allocations"], message: over });
      // The same building may repeat only for windows that do not overlap.
      crew.allocations.forEach((a, i) => {
        crew.allocations.slice(0, i).forEach((b) => {
          if (!a.buildingId || a.buildingId !== b.buildingId) return;
          const [as, ae] = a.timed ? [a.startTime, a.endTime] : [v.startTime, v.endTime];
          const [bs, be] = b.timed ? [b.startTime, b.endTime] : [v.startTime, v.endTime];
          if (timeWindowsOverlap(as, ae, bs, be)) {
            ctx.addIssue({ code: "custom", path: ["crews", d, "allocations", i, "buildingId"], message: "อาคารนี้ซ้ำในช่วงเวลาเดียวกัน" });
          }
        });
      });
    }
  });

export type MorningFormValues = z.infer<typeof morningSchema>;

export const roadUsageSchema = z
  .object({
    roadLocation: z.string().trim().min(1, "ระบุถนน/ช่องทาง").max(120),
    buildingId: z.string().optional().default(""),
    startTime: hhmm,
    endTime: hhmm,
    purpose: z.string().trim().min(1, "ระบุวัตถุประสงค์").max(300),
    // Where on the map: register segments in driving order + the line through them (or a free line).
    segmentIds: z.array(z.string()).default([]),
    route: z.array(z.object({ x: z.number(), y: z.number() })).nullable().default(null),
  })
  .refine((r) => r.startTime < r.endTime, { message: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม", path: ["endTime"] });

// Materials on site today (paper form "Add Material on site"): free-text name + qty + unit.
export const materialSchema = z.object({
  name: z.string().trim().min(1, "ระบุชื่อวัสดุ").max(120),
  qty: z.number().gt(0, "ต้องมากกว่า 0").max(1000000),
  unit: z.string().trim().min(1, "เลือกหน่วย").max(20),
});

export const additionalAllocationSchema = z
  .object({
    id: z.string().optional(),
    buildingId: z.string().min(1, "เลือกอาคาร"),
    discipline: z.enum(asTuple(DISCIPLINE_CODES)),
    workDescription: z.string().trim().min(1, "ระบุรายละเอียดงานที่ทำเพิ่ม").max(500),
    headcount: z.number().int().min(1, "อย่างน้อย 1 คน").max(5000),
    actualPercent: z.number().int().min(0).max(100),
    timed: z.boolean().default(false),
    startTime: hhmm.optional().or(z.literal("")),
    endTime: hhmm.optional().or(z.literal("")),
  })
  .refine((a) => !a.timed || (!a.startTime && !a.endTime) || (Boolean(a.startTime) && Boolean(a.endTime) && (a.startTime ?? "") < (a.endTime ?? "")), {
    message: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม",
    path: ["endTime"],
  });

export type AdditionalAllocationValues = z.infer<typeof additionalAllocationSchema>;

export const eveningSchema = z
  .object({
    // Itemised OT: one row per building/task; NMH counts only these people.
    overtime: z.array(
      z.object({
        buildingId: z.string().min(1, "เลือกอาคาร"),
        task: z.string().trim().min(1, "ระบุงานที่ทำ").max(300),
        workers: z.number().int().min(1, "อย่างน้อย 1 คน").max(1000),
        hours: z.number().min(0.5, "อย่างน้อย 0.5 ชม.").max(24, "ไม่เกิน 24 ชม."),
      }),
    ).max(30),
    accidentOccurred: z.boolean({ required_error: "เลือกว่าเกิดอุบัติเหตุหรือไม่" }).nullable(),
    accidentNote: z.string().trim().max(1000).optional(),
    accidentCategory: z.enum(asTuple(ACCIDENT_CATEGORY_CODES)).nullable(),
    // Afternoon crews per discipline — differ from the morning crews.
    disciplines: disciplinePick,
    crews: z.object({ CE: crewSchema, ME: crewSchema, EE: crewSchema }),
    progress: z.array(
      z.object({
        allocationId: z.string(),
        planPercent: z.number().nullable(),
        actualPercent: z.number().int().min(0).max(100),
        countermeasure: z.string().trim().max(1000).optional(),
      }),
    ),
    additionalAllocations: z.array(additionalAllocationSchema).default([]),
    signatureName: z.string().trim().min(1, "ระบุชื่อผู้รายงาน").max(120),
    signatureData: z.string().min(1, "แตะเพื่อเซ็นชื่อก่อนส่ง"),
    // Requests for tomorrow.
    machinery: z.array(machinerySchema),
    equipmentRequests: z.array(equipmentRequestSchema),
    permits: z.array(permitSchema).default([]),
    roadUsage: z.array(roadUsageSchema),
    // Materials on site today.
    materials: z.array(materialSchema).max(30),
    // Tomorrow Forecast Activities (paper form R003): what + where.
    forecasts: z
      .array(
        z.object({
          description: z.string().trim().min(1, "ระบุรายละเอียดงาน").max(300),
          buildingId: z.string().min(1, "เลือกพื้นที่ / อาคาร"),
        }),
      )
      .min(1, "เพิ่มแผนงานพรุ่งนี้อย่างน้อย 1 รายการ")
      .max(20),
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
    checkCrews(v.crews, v.disciplines, ctx);
    v.progress.forEach((p, i) => {
      if (p.planPercent !== null && p.actualPercent < p.planPercent && !p.countermeasure) {
        ctx.addIssue({
          code: "custom",
          path: ["progress", i, "countermeasure"],
          message: "ผลงานต่ำกว่าแผน — ต้องระบุสาเหตุและมาตรการแก้ไข",
        });
      }
    });
    const seenMaterials = new Set<string>();
    v.materials.forEach((m, i) => {
      const key = `${m.name.trim().toLowerCase()}|${m.unit.trim().toLowerCase()}`;
      if (seenMaterials.has(key)) {
        ctx.addIssue({ code: "custom", path: ["materials", i, "name"], message: "วัสดุ + หน่วยนี้ซ้ำ" });
      }
      seenMaterials.add(key);
    });
    // OT people come from the afternoon crew: one row can't have more people than worked the afternoon.
    const crew = v.disciplines.reduce((s, d) => { const c = v.crews[d]; return s + c.thaiMale + c.thaiFemale + c.foreignMale + c.foreignFemale; }, 0);
    v.overtime.forEach((o, i) => {
      if (o.hours * 2 !== Math.round(o.hours * 2)) ctx.addIssue({ code: "custom", path: ["overtime", i, "hours"], message: "กรอกทีละ 0.5 ชม." });
      if (crew > 0 && o.workers > crew) ctx.addIssue({ code: "custom", path: ["overtime", i, "workers"], message: `เกินคนช่วงบ่าย (${crew} คน)` });
    });
  });

export type EveningFormValues = z.infer<typeof eveningSchema>;
