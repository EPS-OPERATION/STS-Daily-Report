export type SiteIconType =
  | "crane"       // 🏗️ รถเครน
  | "machinery"   // 🚜 เครื่องจักรหนัก / แบคโฮ
  | "truck"       // 🚛 รถบรรทุก / รถโม่ปูน
  | "weld"        // 🔥 งานเชื่อม / ประกายไฟ
  | "pipe"        // 🔧 งานท่อ / ซัพพอร์ต
  | "box"         // 📦 วางของ / ประกอบชิ้นส่วน
  | "pin";        // 📍 จุดทำงานทั่วไป

export interface MapPoint {
  x: number; // 0..1 of the drawing
  y: number;
}

export interface MapRect {
  x: number; // top-left, 0..1 of the drawing
  y: number;
  w: number;
  h: number;
}

// One job on the map for one day: a big contractor-coloured icon, the area that job occupies
// (optional rectangle in the same colour), a short title shown on the map, and a longer
// comment that stays hidden until the icon is clicked.
export interface SiteCalloutMarker {
  id: string;
  date: string; // YYYY-MM-DD — the day this plan applies to
  contractorCode: string;
  contractorName: string;
  icon: SiteIconType;
  /** Short title shown next to the icon. */
  text: string;
  /** Longer note, shown on click (or with "show all text"). */
  comment?: string;
  /** Area this job occupies — a dragged rectangle… */
  area?: MapRect;
  /** …or a free shape clicked corner by corner (takes precedence over `area`). */
  polygon?: MapPoint[];
  /** Legacy (v2) per-pin colour; colours now come from the contractor via `mapContractorColors`. */
  color?: string;
  targetX: number; // 0..1 (icon position)
  targetY: number; // 0..1
  boxX: number;    // 0..1 (title label position, joined by a leader line)
  boxY: number;    // 0..1
  createdAt: string;
}

/** Stand-alone area from the first daily-map version; migrated into a marker that owns it. */
export interface LegacyAreaMarker extends MapRect {
  id: string;
  date: string;
  contractorCode: string;
  contractorName: string;
  label: string;
  createdAt: string;
}

export const MAP_TITLE_MAX = 40;

export interface MapContractor {
  code: string;
  name: string;
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

// Strong, mutually distinct hues that read on the grey CAD drawing and the colour top view.
export const MAP_CONTRACTOR_COLORS = [
  "#2563EB", // blue
  "#EA580C", // orange
  "#0D9488", // teal
  "#7C3AED", // violet
  "#DB2777", // pink
  "#65A30D", // green
  "#0891B2", // cyan
  "#B45309", // brown
  "#CA8A04", // mustard
  "#475569", // slate
] as const;

// One colour per contractor among those on the map that day, in order of first appearance,
// so two contractors on the same day never share a colour (up to 10; then slate repeats) and
// adding a new contractor never changes the colour of those already there.
export function mapContractorColors(codes: string[]): Map<string, string> {
  const last = MAP_CONTRACTOR_COLORS.length - 1;
  return new Map([...new Set(codes)].map((c, i) => [c, MAP_CONTRACTOR_COLORS[Math.min(i, last)]!]));
}

export const FALLBACK_MAP_COLOR = "#475569";
