// Mock Work Permit dashboard data (no permits API yet — delete when it lands).
// Mirrors the EPS permit board: 239 one-day permits, Mar–May 2026.
// Column totals: Hot Work 77, Height 40, Lifting 69, Excavation 33, Scaffolding 20.
// Contractor totals: LS 107, FS 56, SZ 38, ZE 20, KR 11, BW 4, UCE 3.

export type PermitTypeCode = "HWSTS" | "WHSTS" | "LTSTS" | "EXSTS" | "SCFSTS" | "CFSTS" | "EESTS";

export interface PermitType {
  code: PermitTypeCode;
  label: string;
}

export const PERMIT_TYPES: PermitType[] = [
  { code: "HWSTS", label: "Hot Work" },
  { code: "WHSTS", label: "Height" },
  { code: "LTSTS", label: "Lifting" },
  { code: "EXSTS", label: "Excavation" },
  { code: "SCFSTS", label: "Scaffolding" },
  { code: "CFSTS", label: "Confined Space" },
  { code: "EESTS", label: "Electrical" },
];

export interface ContractorLegend {
  code: string;
  name: string;
}

export const CONTRACTOR_LEGEND: ContractorLegend[] = [
  { code: "EPS", name: "Eco Plant Services" },
  { code: "FS", name: "Fast Steel" },
  { code: "SZ", name: "Szone" },
  { code: "KR", name: "Khwuan" },
  { code: "LS", name: "LTab Site" },
  { code: "UCE", name: "Unique" },
  { code: "ZE", name: "Zhongtian" },
];

export const PERMIT_CODE_LEGEND: { code: PermitTypeCode; meaning: string }[] = [
  { code: "HWSTS", meaning: "Hot Work" },
  { code: "LTSTS", meaning: "Lifting Work" },
  { code: "EXSTS", meaning: "Excavation Work" },
  { code: "WHSTS", meaning: "Work at Height" },
  { code: "CFSTS", meaning: "Confined Space Work" },
  { code: "SCFSTS", meaning: "Scaffolding Work" },
  { code: "EESTS", meaning: "Electrical Work" },
];

export interface WorkPermit {
  id: string;
  date: string;
  expire: string;
  contractor: string;
  permitNo: string;
  type: PermitTypeCode;
  typeLabel: string;
  description: string;
  building: string;
  contractorSigned: string;
  epsSigned: string;
}

const BUILDINGS = [
  "001-Biomass Storage",
  "002-Fuel Transportation",
  "003-Furnace And Boiler",
  "010-Turbine Generator Building",
];

const CONTRACTOR_SIGNER: Record<string, string> = {
  LS: "LS - สมชาย",
  FS: "FS - พันกานต์",
  SZ: "SZ - กฤษฎา",
  ZE: "ZE - ศักดิ์สิทธิ์",
  KR: "KR - วิชัย",
  BW: "BW - ศุภกร",
  UCE: "UCE - จิรานุส",
};

const EPS_SIGNERS = ["CE - อภินันท์", "ME - พงศกร", "CE - จิรศักดิ์", "CE - เอกธนทร์", "CE - สมพร"];

const DESCRIPTIONS: Record<PermitTypeCode, string[]> = {
  HWSTS: [
    "เทคอนกรีต เช่าแบบ ผูกเหล็ก ปรับพื้น ดอกเช็ม ตัดเช็ม สกัด",
    "งานเทคอนกรีต เช่าแบบ ผูกเหล็ก ปรับพื้น",
    "Set plate screw",
    "เชื่อมประกอบโครงเหล็กหลังคา",
    "ตัดเหล็กเส้น เตรียมงานเชื่อม",
  ],
  WHSTS: [
    "ติดตั้งโครงหลังคา PEB ติดตั้งอุปกรณ์ไฟฟ้าในอาคาร",
    "ติดตั้งนั่งร้านชั่วคราว ชั้น 2",
    "ซ่อมบำรุงหลังคาอาคาร",
  ],
  LTSTS: [
    "งานยก Belt Conveyor",
    "ยก Bucket ถ่ายเถ้าแกลบ",
    "ยกเหล็กเส้น ถ่ายเสาเข็ม",
    "เทคอนกรีต ยกไม้แบบ ยกเหล็กเส้น ด้วยเครน",
  ],
  EXSTS: [
    "ขุดวางสายกราวด์",
    "ขุดเพื่อวางสายกราวด์",
    "ขุดร่องวางท่อระบายน้ำ",
  ],
  SCFSTS: [
    "ติดตั้งนั่งร้าน ตรวจรับ Scaffolding",
    "รื้อนั่งร้าน โซนหม้อไอน้ำ",
  ],
  CFSTS: [],
  EESTS: [],
};

// [contractor, HW, WH, LT, EX, SC] — columns sum to 77/40/69/33/20, rows to LS107 FS56 SZ38 ZE20 KR11 BW4 UCE3.
const MATRIX: [string, number, number, number, number, number][] = [
  ["LS", 40, 12, 35, 12, 8],
  ["FS", 15, 10, 18, 8, 5],
  ["SZ", 14, 8, 8, 5, 3],
  ["ZE", 5, 6, 4, 3, 2],
  ["KR", 2, 3, 3, 2, 1],
  ["BW", 1, 1, 1, 1, 0],
  ["UCE", 0, 0, 0, 2, 1],
];

const TYPE_ORDER: PermitTypeCode[] = ["HWSTS", "WHSTS", "LTSTS", "EXSTS", "SCFSTS"];
const SEQ_BASE: Record<PermitTypeCode, number> = { HWSTS: 160, WHSTS: 190, LTSTS: 165, EXSTS: 205, SCFSTS: 210, CFSTS: 1, EESTS: 1 };

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 86_400_000;
const RANGE_START = Date.parse("2026-03-02T00:00:00Z");
const RANGE_END = Date.parse("2026-05-28T00:00:00Z");

function buildPermits(): WorkPermit[] {
  const rng = mulberry32(239);
  const rows: Omit<WorkPermit, "permitNo" | "id">[] = [];
  const labelOf = (c: PermitTypeCode) => PERMIT_TYPES.find((t) => t.code === c)?.label ?? c;
  MATRIX.forEach(([contractor, hw, wh, lt, ex, sc], ci) => {
    [hw, wh, lt, ex, sc].forEach((n, ti) => {
      const type = TYPE_ORDER[ti];
      const descs = DESCRIPTIONS[type];
      for (let i = 0; i < n; i += 1) {
        const date = new Date(RANGE_START + Math.floor(rng() * ((RANGE_END - RANGE_START) / DAY_MS + 1)) * DAY_MS);
        const iso = date.toISOString().slice(0, 10);
        rows.push({
          date: iso,
          expire: iso,
          contractor,
          type,
          typeLabel: type === "WHSTS" ? "Work at Height" : type === "LTSTS" ? "Lifting Work" : type === "EXSTS" ? "Excavation Work" : labelOf(type),
          description: descs[(ci + i) % descs.length],
          building: BUILDINGS[(ci + ti + i) % BUILDINGS.length],
          contractorSigned: CONTRACTOR_SIGNER[contractor] ?? contractor,
          epsSigned: EPS_SIGNERS[(ci + ti + i) % EPS_SIGNERS.length],
        });
      }
    });
  });
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const seq: Record<PermitTypeCode, number> = { ...SEQ_BASE };
  return rows
    .map((r, i) => {
      seq[r.type] += 1;
      return { ...r, id: `wp-${i}`, permitNo: `EPS-${r.type}-${seq[r.type]}` };
    })
    .reverse();
}

export const WORK_PERMITS: WorkPermit[] = buildPermits();

export const PERMIT_MONTHS: string[] = [...new Set(WORK_PERMITS.map((p) => p.date.slice(0, 7)))].sort();

export const PERMIT_BUILDINGS: string[] = [...new Set(WORK_PERMITS.map((p) => p.building))].sort();

export const PERMIT_CONTRACTORS: string[] = [...new Set(WORK_PERMITS.map((p) => p.contractor))].sort();
