export type SiteIconType =
  | "crane"       // 🏗️ รถเครน
  | "machinery"   // 🚜 เครื่องจักรหนัก / แบคโฮ
  | "truck"       // 🚛 รถบรรทุก / รถโม่ปูน
  | "weld"        // 🔥 งานเชื่อม / ประกายไฟ
  | "pipe"        // 🔧 งานท่อ / ซัพพอร์ต
  | "box"         // 📦 วางของ / ประกอบชิ้นส่วน
  | "pin";        // 📍 จุดทำงานทั่วไป

export interface SiteCalloutMarker {
  id: string;
  contractorCode: string; // e.g. "UME", "PPW", "L-Tap", "SZ"
  contractorName: string;
  icon: SiteIconType;
  text: string;
  color: string; // badge/box color (#EF4444, #F59E0B, #3B82F6, #EC4899, #10B981)
  targetX: number; // 0..1 (pin point on site map)
  targetY: number; // 0..1 (pin point on site map)
  boxX: number;    // 0..1 (callout box position)
  boxY: number;    // 0..1 (callout box position)
  createdAt: string;
}

export interface ContractorColorOption {
  code: string;
  name: string;
  defaultColor: string;
  badgeBg: string;
}

export const SITE_ICONS: Array<{ type: SiteIconType; label: string; emoji: string }> = [
  { type: "crane", label: "เครน", emoji: "🏗️" },
  { type: "machinery", label: "เครื่องจักร", emoji: "🚜" },
  { type: "truck", label: "รถขนส่ง/ปูน", emoji: "🚛" },
  { type: "pipe", label: "งานท่อ", emoji: "🔧" },
  { type: "weld", label: "งานเชื่อม", emoji: "🔥" },
  { type: "box", label: "จุดวางของ", emoji: "📦" },
  { type: "pin", label: "จุดงาน", emoji: "📍" },
];

export const CONTRACTOR_PALETTES: ContractorColorOption[] = [
  { code: "UME", name: "อู่ไทสียา", defaultColor: "#EAB308", badgeBg: "#FEF9C3" },
  { code: "PPW", name: "ภัทรภณ เพาเวอร์", defaultColor: "#EF4444", badgeBg: "#FEE2E2" },
  { code: "L-Tap", name: "L-Tap", defaultColor: "#3B82F6", badgeBg: "#DBEAFE" },
  { code: "SZ", name: "SZ / Zhongtian", defaultColor: "#EC4899", badgeBg: "#FCE7F3" },
];

export const PRESET_COLORS = [
  "#EF4444", // Red (เหมือนในรูป ภัทรภณ / อู่ไทสียา)
  "#F59E0B", // Amber / Yellow (เหมือนในรูป อู่ไทสียา)
  "#3B82F6", // Blue (เหมือนในรูป L-Tap / อู่ไทสียา)
  "#EC4899", // Pink (เหมือนในรูป SZ)
  "#10B981", // Green (เหมือนในรูป อู่ไทสียา / SZ)
  "#06B6D4", // Cyan
  "#8B5CF6", // Purple
];
