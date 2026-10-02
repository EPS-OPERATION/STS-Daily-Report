import type { SiteCalloutMarker } from "../types/coordination.types.js";

export const INITIAL_CALLOUT_MARKERS: SiteCalloutMarker[] = [
  // 1. บริษัท อู่ไทสียา เอ็นจิเนียริ่ง (เหลือง, แดง, เขียว, น้ำเงิน ตามรูปจริง)
  {
    id: "callout-ume-1",
    contractorCode: "UME",
    contractorName: "อู่ไทสียา",
    icon: "pipe",
    text: "พื้นที่ติดตั้ง Support ท่อ / วาง man-pipe piping",
    color: "#EAB308", // Yellow
    targetX: 0.17,
    targetY: 0.38,
    boxX: 0.15,
    boxY: 0.30,
    createdAt: "2026-09-28 08:30",
  },
  {
    id: "callout-ume-2",
    contractorCode: "UME",
    contractorName: "อู่ไทสียา",
    icon: "box",
    text: "จุดวาง Economizer",
    color: "#EF4444", // Red
    targetX: 0.28,
    targetY: 0.40,
    boxX: 0.28,
    boxY: 0.39,
    createdAt: "2026-09-28 08:45",
  },
  {
    id: "callout-ume-3",
    contractorCode: "UME",
    contractorName: "อู่ไทสียา",
    icon: "pin",
    text: "จุดวาง 8 คน",
    color: "#22C55E", // Green
    targetX: 0.21,
    targetY: 0.46,
    boxX: 0.21,
    boxY: 0.46,
    createdAt: "2026-09-28 09:00",
  },
  {
    id: "callout-ume-4",
    contractorCode: "UME",
    contractorName: "อู่ไทสียา",
    icon: "box",
    text: "จุด pre-assembly horizontal",
    color: "#3B82F6", // Blue
    targetX: 0.29,
    targetY: 0.51,
    boxX: 0.29,
    boxY: 0.51,
    createdAt: "2026-09-28 09:15",
  },

  // 2. หจก. ภัทรภณ เพาเวอร์ เอ็นจิเนียริ่ง
  {
    id: "callout-ppw-1",
    contractorCode: "PPW",
    contractorName: "ภัทรภณ",
    icon: "crane",
    text: "งานยกท่อ Main Steam / วางแนวท่อทางเดิน",
    color: "#EF4444", // Red
    targetX: 0.24,
    targetY: 0.48,
    boxX: 0.16,
    boxY: 0.55,
    createdAt: "2026-09-28 08:15",
  },

  // 3. L-Tap
  {
    id: "callout-ltap-1",
    contractorCode: "L-Tap",
    contractorName: "L-Tap",
    icon: "crane",
    text: "เครื่องกำเนิดไอน้ำ / บอยเลอร์ (จุดวาง Mobile Crane 35T)",
    color: "#3B82F6", // Blue
    targetX: 0.24,
    targetY: 0.69,
    boxX: 0.24,
    boxY: 0.77,
    createdAt: "2026-09-28 08:00",
  },

  // 4. SZ / Zhongtian
  {
    id: "callout-sz-1",
    contractorCode: "SZ",
    contractorName: "SZ",
    icon: "weld",
    text: "งานเช็ค + แคริเบรตต์วาล์วระบบ",
    color: "#EC4899", // Pink
    targetX: 0.18,
    targetY: 0.69,
    boxX: 0.18,
    boxY: 0.69,
    createdAt: "2026-09-28 08:10",
  },
  {
    id: "callout-sz-2",
    contractorCode: "SZ",
    contractorName: "SZ",
    icon: "pipe",
    text: "งานติดตั้ง/พอก งานบลูมัสติกบันได งานเก็บรอยต่อท่อ",
    color: "#06B6D4", // Cyan
    targetX: 0.49,
    targetY: 0.85,
    boxX: 0.49,
    boxY: 0.85,
    createdAt: "2026-09-28 08:20",
  },
];
