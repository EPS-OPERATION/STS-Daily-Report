import Box from "@mui/material/Box";
import { ACCIDENT_CATEGORIES } from "@sts/shared";
import dayjs from "dayjs";
import type { SafetyStats } from "../types/safety.types.js";

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
          const row = stats.categories.find((x) => x.code === c.code)!;
          return (
            <tr key={c.code}>
              <td style={{ color: GREEN, fontWeight: 600 }}>
                {i + 1}. {c.label}
              </td>
              <td style={{ textAlign: "center", color: row.period ? RED : INK, fontWeight: 700 }}>{row.period}</td>
              <td style={{ textAlign: "center", color: row.year ? RED : INK, fontWeight: 700 }}>{row.year}</td>
              <td style={{ textAlign: "center", fontSize: font + 4 }} aria-label={row.year ? "attention" : "good"}>
                {row.year ? "😔" : "🙂"}
              </td>
            </tr>
          );
        })}
        <tr>
          <td colSpan={4} style={{ color: GREEN, fontWeight: 600 }}>
            Days Without an Accident (accumulate) : {stats.daysWithoutAccident.toLocaleString()} Days
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={{ color: GREEN, fontWeight: 600 }}>
            Highest Days Without Accident : {stats.highestDaysWithoutAccident.toLocaleString()} Days
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={{ background: BLUE, color: INK }}>
            Last Accident Loss Time Injury : {stats.lastLti ? dayjs(stats.lastLti).format("D MMM YYYY") : "-"}
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={{ background: BLUE, color: INK }}>
            Manhour record ({period}) : {stats.manHoursPeriod.toLocaleString()} Hrs.
          </td>
        </tr>
        <tr>
          <td colSpan={4} style={{ background: BLUE, color: INK }}>
            Total acc. (Start – {dayjs(stats.to).format("D MMM YYYY")}) : {stats.manHoursTotal.toLocaleString()} Hrs.
          </td>
        </tr>
      </tbody>
    </Box>
  );
}
