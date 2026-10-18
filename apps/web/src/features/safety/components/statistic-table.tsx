import Box from "@mui/material/Box";
import { ACCIDENT_CATEGORIES } from "@sts/shared";
import dayjs from "dayjs";
import type { SafetyStats } from "../types/safety.types.js";
import { shortDate } from "@/lib/dates.js";
import { formatNumber } from "@/lib/format.js";

const BLUE = "#5bc8f2";
const INK = "#0b1fd1";
const GREEN = "#127a2b";
const RED = "#d61f1f";

// "2 Oct 2026" · "28 Sep – 4 Oct 2026" · "12–18 Sep 2026"
export function periodLabel(from: string, to: string) {
  const f = dayjs(from);
  const t = dayjs(to);
  if (from === to) return t.format("D MMM YYYY");
  if (f.year() !== t.year()) return `${f.format("D MMM YYYY")} – ${t.format("D MMM YYYY")}`;
  if (f.month() !== t.month()) return `${f.format("D MMM")} – ${t.format("D MMM YYYY")}`;
  return `${f.format("D")}–${t.format("D MMM YYYY")}`;
}

// Status face by severity, on the year count. Serious rows (LTI, Emergency): any case = ☹️.
// Other rows: 0 = 😊, 1–2 = 😐, 3+ = ☹️.
const SERIOUS = new Set<string>(["lti", "emergency"]);
function statusOf(code: string, yearCount: number) {
  if (yearCount === 0) return { emoji: "😊", label: "good" };
  if (SERIOUS.has(code) || yearCount >= 3) return { emoji: "☹️", label: "attention" };
  return { emoji: "😐", label: "watch" };
}

const cell = { border: "1px solid #3a3a3a", padding: "6px 10px" } as const;

// "STATISTIC" table of the EPS Safety Weekly Report (same layout on screen and in the PDF).
export function StatisticTable({ stats, compact }: { stats: SafetyStats; compact?: boolean }) {
  const period = periodLabel(stats.from, stats.to);
  const font = compact ? 12 : 15;
  return (
    <Box
      component="table"
      sx={{ width: "100%", borderCollapse: "collapse", fontSize: font, "& td, & th": cell, "& th": { bgcolor: BLUE, color: INK, fontWeight: 700 } }}
    >
      <thead>
        <tr>
          <th style={{ width: "46%" }}>Categories</th>
          <th>{period}</th>
          <th>Year {stats.to.slice(0, 4)}</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {ACCIDENT_CATEGORIES.map((c, i) => {
          const row = stats.categories.find((x) => x.code === c.code);
          const periodCount = row?.period ?? 0;
          const yearCount = row?.year ?? 0;
          const { emoji, label: ariaLabel } = statusOf(c.code, yearCount);
          return (
            <tr key={c.code}>
              <td style={{ color: GREEN, fontWeight: 600 }}>
                {i + 1}. {c.label}
              </td>
              <td style={{ textAlign: "center", color: periodCount > 0 ? RED : INK, fontWeight: 700 }}>{periodCount}</td>
              <td style={{ textAlign: "center", color: yearCount > 0 ? RED : INK, fontWeight: 700 }}>{yearCount}</td>
              <td style={{ textAlign: "center", fontSize: font + 4 }} aria-label={ariaLabel}>
                {emoji}
              </td>
            </tr>
          );
        })}
        <tr>
          <td colSpan={4} style={{ color: GREEN, fontWeight: 600 }}>
            Days Without an Accident (accumulate) : {formatNumber(stats.daysWithoutAccident)} Days
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={{ color: GREEN, fontWeight: 600 }}>
            Highest Days Without Accident : {formatNumber(stats.highestDaysWithoutAccident)} Days
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={{ background: BLUE, color: INK }}>
            Last Accident Loss Time Injury : {stats.lastLti ? shortDate(stats.lastLti) : "-"}
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={{ background: BLUE, color: INK }}>
            Manhour record ({period}) : {formatNumber(stats.manHoursPeriod)} Hrs.
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={{ background: BLUE, color: INK }}>
            Total acc. (Start – {shortDate(stats.to)}) : {formatNumber(stats.manHoursTotal)} Hrs.
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={4} style={{ border: 0, padding: "4px 2px", fontSize: font - 2, color: "#555" }}>
            Status (ตามจำนวนทั้งปี): 😊 ไม่มีเหตุ · 😐 Non-LTI / Property Damage / Near miss 1–2 ครั้ง · ☹️ 3 ครั้งขึ้นไป หรือมี LTI / Emergency แม้ 1 ครั้ง
          </td>
        </tr>
      </tfoot>
    </Box>
  );
}
