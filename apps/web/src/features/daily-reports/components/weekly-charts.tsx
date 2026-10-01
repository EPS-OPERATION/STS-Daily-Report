import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { POSITIONS } from "@sts/shared";
import dayjs from "dayjs";
import { CHART_OTHER, CHART_PRIMARY, CHART_SERIES } from "@/app/theme/chart-palette.js";
import type { ManpowerSummary, ManpowerTrendPoint, PositionMixRow } from "../types/daily-report.types.js";

const DAY_TH = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

// Colour follows the contractor, never its rank: slots assigned by code order so the
// same contractor keeps its colour across every chart and every week.
export function contractorColorMap(codes: string[]): Map<string, string> {
  const sorted = [...new Set(codes)].sort((a, b) => a.localeCompare(b));
  return new Map(sorted.map((c, i) => [c, CHART_SERIES[i] ?? CHART_OTHER]));
}

const legendBottom = {
  legend: { direction: "horizontal" as const, position: { vertical: "bottom" as const, horizontal: "center" as const } },
};

function Empty({ text }: { text: string }) {
  return (
    <Box sx={{ height: 280, display: "grid", placeItems: "center" }}>
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Box>
  );
}

// Deck p.24 left: man-days per day, stacked by contractor (works for a week or a month).
export function ManDayByContractorChart({
  days,
  daily,
  colors,
}: {
  days: string[];
  daily: ManpowerSummary["daily"];
  colors: Map<string, string>;
}) {
  if (daily.length === 0) return <Empty text="ยังไม่มีรายงานเช้าในช่วงนี้" />;
  const perDay = new Map<string, Map<string, number>>(); // contractor → date → headcount
  for (const r of daily) {
    const row = perDay.get(r.contractorCode) ?? new Map<string, number>();
    row.set(r.date, (row.get(r.date) ?? 0) + r.headcount);
    perDay.set(r.contractorCode, row);
  }
  const codes = [...perDay.keys()].sort((a, b) => a.localeCompare(b));
  const week = days.length <= 7;
  return (
    <BarChart
      height={300}
      borderRadius={week ? 4 : 2}
      xAxis={[
        {
          scaleType: "band",
          data: days.map((d) => (week ? `${DAY_TH[(dayjs(d).day() + 6) % 7]} ${dayjs(d).format("D")}` : dayjs(d).format("D"))),
          tickLabelStyle: { fontSize: 11 },
        },
      ]}
      yAxis={[{ label: "คน", width: 48 }]}
      series={codes.map((code) => ({
        id: code,
        label: code,
        stack: "total",
        color: colors.get(code) ?? CHART_OTHER,
        data: days.map((d) => perDay.get(code)?.get(d) ?? 0),
        valueFormatter: (v: number | null) => (v ? `${v} คน` : null),
      }))}
      slotProps={legendBottom}
      grid={{ horizontal: true }}
    />
  );
}

// Deck p.24 right: average daily manpower per week (trend).
export function ManpowerTrendChart({ points, currentWeek }: { points: ManpowerTrendPoint[]; currentWeek: string }) {
  if (points.every((p) => p.avgDaily === null)) return <Empty text="ยังไม่มีข้อมูลย้อนหลัง" />;
  return (
    <LineChart
      height={300}
      xAxis={[
        {
          scaleType: "point",
          data: points.map((p) => p.weekStart),
          valueFormatter: (v: string) => `${dayjs(v).format("D")}–${dayjs(v).add(6, "day").format("D MMM")}`,
          tickLabelStyle: { fontSize: 11 },
        },
      ]}
      yAxis={[{ label: "คน/วัน (เฉลี่ย)", width: 52, min: 0 }]}
      series={[
        {
          id: "avg",
          label: "เฉลี่ยคน/วัน",
          color: CHART_PRIMARY,
          curve: "linear",
          data: points.map((p) => p.avgDaily),
          showMark: ({ index }) => points[index]?.weekStart === currentWeek,
          valueFormatter: (v: number | null) => (v === null ? "ไม่มีรายงาน" : `${v} คน/วัน`),
        },
      ]}
      grid={{ horizontal: true }}
      hideLegend
    />
  );
}

// Deck p.25: headcount by position, grouped by contractor (average per reported day).
export function PositionByContractorChart({ rows, colors }: { rows: PositionMixRow[]; colors: Map<string, string> }) {
  if (rows.length === 0) return <Empty text="ยังไม่มีข้อมูลตำแหน่งในสัปดาห์นี้" />;
  // Positions in the form's order, only those anyone used this week.
  const positions = POSITIONS.filter((p) => rows.some((r) => r.position === p.code));
  const codes = [...new Set(rows.map((r) => r.contractorCode))].sort((a, b) => a.localeCompare(b));
  return (
    <BarChart
      height={320}
      borderRadius={4}
      xAxis={[{ scaleType: "band", data: positions.map((p) => p.label), tickLabelStyle: { fontSize: 11 } }]}
      yAxis={[{ label: "คน/วัน", width: 48 }]}
      series={codes.map((code) => ({
        id: code,
        label: code,
        color: colors.get(code) ?? CHART_OTHER,
        data: positions.map((p) => rows.find((r) => r.contractorCode === code && r.position === p.code)?.avgPerDay ?? 0),
        valueFormatter: (v: number | null) => (v ? `${v} คน/วัน` : null),
      }))}
      slotProps={legendBottom}
      grid={{ horizontal: true }}
    />
  );
}

// Deck p.20 "Manpower": nationality × sex per contractor. These four categories are not
// contractors, so they take the palette's later slots (5–8 order) to avoid reading as one.
const NATIONALITY_SERIES = [
  { key: "thaiMale", label: "ไทย ชาย", color: CHART_SERIES[4] },
  { key: "thaiFemale", label: "ไทย หญิง", color: CHART_SERIES[5] },
  { key: "foreignMale", label: "ต่างชาติ ชาย", color: CHART_SERIES[6] },
  { key: "foreignFemale", label: "ต่างชาติ หญิง", color: CHART_SERIES[3] },
] as const;

export function NationalityByContractorChart({ contractors }: { contractors: ManpowerSummary["contractors"] }) {
  if (contractors.length === 0) return <Empty text="ยังไม่มีข้อมูลในช่วงนี้" />;
  return (
    <BarChart
      height={300}
      borderRadius={4}
      xAxis={[{ scaleType: "band", data: contractors.map((c) => c.contractorCode) }]}
      yAxis={[{ label: "คน-วัน", width: 64 }]}
      series={NATIONALITY_SERIES.map((s) => ({
        id: s.key,
        label: s.label,
        stack: "total",
        color: s.color,
        data: contractors.map((c) => c[s.key]),
        valueFormatter: (v: number | null) => (v ? `${v.toLocaleString()} คน-วัน` : null),
      }))}
      slotProps={legendBottom}
      grid={{ horizontal: true }}
    />
  );
}

// Deck p.20 "MD Total" / "NMH Total": one measure per chart (never a dual axis).
export function ContractorTotalsChart({
  contractors,
  measure,
  colors,
}: {
  contractors: ManpowerSummary["contractors"];
  measure: "manDays" | "manHours";
  colors: Map<string, string>;
}) {
  if (contractors.length === 0) return <Empty text="ยังไม่มีข้อมูลในช่วงนี้" />;
  const sorted = [...contractors].sort((a, b) => b[measure] - a[measure]);
  const unit = measure === "manDays" ? "คน-วัน" : "ชม.";
  return (
    <BarChart
      height={Math.max(160, sorted.length * 44 + 60)}
      layout="horizontal"
      borderRadius={4}
      yAxis={[
        {
          scaleType: "band",
          data: sorted.map((c) => c.contractorCode),
          width: 56,
          // Each bar wears its contractor's colour (same as the other charts).
          colorMap: {
            type: "ordinal",
            values: sorted.map((c) => c.contractorCode),
            colors: sorted.map((c) => colors.get(c.contractorCode) ?? CHART_OTHER),
            unknownColor: CHART_OTHER,
          },
        },
      ]}
      xAxis={[{ label: unit }]}
      series={[
        {
          id: measure,
          label: measure === "manDays" ? "Man-days" : "NMH",
          data: sorted.map((c) => c[measure]),
          valueFormatter: (v: number | null) => (v === null ? null : `${v.toLocaleString()} ${unit}`),
        },
      ]}
      barLabel={(item) => (item.value ? item.value.toLocaleString() : null)}
      grid={{ vertical: true }}
      hideLegend
    />
  );
}

