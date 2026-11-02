import { PRINT_BLUE } from "@/components/print/print-tokens.js";
import dayjs from "dayjs";

export const BLUE = PRINT_BLUE;

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_ACTIVITY_ROWS = 10;

// Buddhist-era short date as written on the paper form (3/9/69).
export function thaiShortDate(iso: string): string {
  const d = dayjs(iso);
  return `${d.date()}/${d.month() + 1}/${String(d.year() + 543).slice(-2)}`;
}

export const tick = (on: boolean) => (on ? "☑" : "☐");

export const sumOf = (rows: { headcount: number }[]) => rows.reduce((s, r) => s + r.headcount, 0);

export function PrintStyles() {
  return (
    <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        .sheet { break-after: page; font-size: 12px; line-height: 1.3; }
        .sheet:last-child { break-after: auto; }
        .f { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .f td, .f th { border: 1px solid #222; padding: 2px 4px; vertical-align: middle; overflow-wrap: anywhere; }
        .f th { background: ${BLUE}; font-weight: 700; text-align: center; }
        .c { text-align: center; } .b { font-weight: 700; } .blue { background: ${BLUE}; }
        .photo { height: 96px; object-fit: cover; width: 100%; display: block; }
        .gap { height: 6px; }
      `}</style>
  );
}

export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div className="b" style={{ margin: "10px 0 4px", fontSize: 14, borderBottom: "1.5px solid #0B4D8B", color: "#0B4D8B" }}>
      {children}
    </div>
  );
}
