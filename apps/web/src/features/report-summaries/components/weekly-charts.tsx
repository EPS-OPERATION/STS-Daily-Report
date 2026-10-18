import { useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  BarChart,
  ChartsTooltipCell,
  ChartsTooltipContainer,
  ChartsTooltipPaper,
  ChartsTooltipRow,
  ChartsTooltipTable,
  LineChart,
  useAxesTooltip,
  type ChartsTooltipProps,
} from "@mui/x-charts";
import { POSITIONS } from "@sts/shared";
import dayjs from "dayjs";
import { CHART_OTHER, CHART_PRIMARY, CHART_SERIES } from "@/app/theme/chart-palette.js";
import { formatThaiDate } from "@/lib/dates.js";
import type { ManpowerSummary, PositionMixRow } from "../types/report-summary.types.js";

const DAY_TH = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

const legendBottom = {
  legend: { direction: "horizontal" as const, position: { vertical: "bottom" as const, horizontal: "center" as const } },
};

function Empty({ text, height = 280 }: { text: string; height?: number }) {
  return (
    <Box sx={{ height, display: "grid", placeItems: "center" }}>
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Box>
  );
}

function CustomStackedBarTooltip(props: ChartsTooltipProps) {
  const tooltipData = useAxesTooltip();
  if (!tooltipData || tooltipData.length === 0) return null;

  return (
    <ChartsTooltipContainer {...props}>
      <ChartsTooltipPaper sx={{ p: 1, minWidth: 160, borderRadius: 2 }}>
        {tooltipData.map(({ axisId, mainAxis, axisValue, axisFormattedValue, seriesItems }) => {
          const total = seriesItems.reduce(
            (sum, item) => sum + (typeof item.value === "number" ? item.value : 0),
            0,
          );

          return (
            <ChartsTooltipTable key={axisId}>
              {axisValue != null && !mainAxis.hideTooltip && (
                <Typography
                  component="caption"
                  sx={{
                    fontWeight: 700,
                    textAlign: "left",
                    px: 1,
                    pt: 0.5,
                    pb: 0.75,
                    fontSize: 13,
                    color: "text.primary",
                    display: "block",
                  }}
                >
                  {axisFormattedValue}
                </Typography>
              )}
              <tbody>
                {seriesItems.map(({ seriesId, color, formattedValue, formattedLabel }) => {
                  if (formattedValue == null) return null;
                  return (
                    <ChartsTooltipRow key={seriesId}>
                      <ChartsTooltipCell component="th" sx={{ py: 0.35, pr: 2 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: 10,
                              height: 10,
                              borderRadius: 2,
                              backgroundColor: color,
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>{formattedLabel}</span>
                        </div>
                      </ChartsTooltipCell>
                      <ChartsTooltipCell component="td" sx={{ textAlign: "right", fontWeight: 700, py: 0.35 }}>
                        {formattedValue}
                      </ChartsTooltipCell>
                    </ChartsTooltipRow>
                  );
                })}

                {/* Total Row */}
                <ChartsTooltipRow sx={{ borderTop: "1.5px solid rgba(0,0,0,0.1)", mt: 0.5 }}>
                  <ChartsTooltipCell component="th" sx={{ pt: 0.75, pb: 0.5, fontWeight: 700, color: "text.primary" }}>
                    รวม
                  </ChartsTooltipCell>
                  <ChartsTooltipCell
                    component="td"
                    sx={{ textAlign: "right", pt: 0.75, pb: 0.5, fontWeight: 700, color: "primary.main" }}
                  >
                    {total.toLocaleString()} คน
                  </ChartsTooltipCell>
                </ChartsTooltipRow>
              </tbody>
            </ChartsTooltipTable>
          );
        })}
      </ChartsTooltipPaper>
    </ChartsTooltipContainer>
  );
}

// Deck p.24 left: man-days per day, stacked by contractor (works for a week or a month).
export function ManDayByContractorChart({
  days,
  daily,
  colors,
  height = 352,
  legend = true,
}: {
  days: string[];
  daily: ManpowerSummary["daily"];
  colors: Map<string, string>;
  /** Total height, chip row included. */
  height?: number;
  /** The chip row already names each colour; tight layouts drop the legend under the bars. */
  legend?: boolean;
}) {
  // Contractors hidden by the filter chips (empty = show all).
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  if (daily.length === 0) return <Empty text="ยังไม่มีรายงานเช้าในช่วงนี้" height={height} />;
  const perDay = new Map<string, Map<string, number>>(); // contractor → date → headcount
  for (const r of daily) {
    const row = perDay.get(r.contractorCode) ?? new Map<string, number>();
    row.set(r.date, (row.get(r.date) ?? 0) + r.headcount);
    perDay.set(r.contractorCode, row);
  }
  const allCodes = [...perDay.keys()].sort((a, b) => a.localeCompare(b));
  const codes = allCodes.filter((c) => !hidden.has(c));
  const totals = days.map((d) => codes.reduce((s, c) => s + (perDay.get(c)?.get(d) ?? 0), 0));
  const week = days.length <= 7;
  const toggle = (c: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else if (codes.length > 1) next.add(c); // keep at least one contractor visible
      return next;
    });
  return (
    <Box>
      <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: legend ? 1 : 0, justifyContent: "flex-end" }}>
        <Typography variant="caption" color="text.secondary">
          ผู้รับเหมา:
        </Typography>
        <Chip
          size="small"
          label="All"
          variant={hidden.size === 0 ? "filled" : "outlined"}
          color={hidden.size === 0 ? "primary" : "default"}
          onClick={() => setHidden(new Set())}
        />
        {allCodes.map((c) => {
          const on = !hidden.has(c);
          return (
            <Chip
              key={c}
              size="small"
              label={c}
              aria-pressed={on}
              onClick={() => toggle(c)}
              variant={on ? "filled" : "outlined"}
              sx={on ? { bgcolor: colors.get(c) ?? CHART_OTHER, color: "common.white", "&:hover": { bgcolor: colors.get(c) ?? CHART_OTHER, opacity: 0.85 } } : { color: "text.disabled" }}
            />
          );
        })}
      </Stack>
      <BarChart
        height={Math.max(160, height - 32)}
        borderRadius={week ? 4 : 2}
        margin={{ top: legend ? 24 : 12, bottom: 56 }}
        xAxis={[
          {
            scaleType: "band",
            data: days,
            valueFormatter: (d: string) => {
              const djs = dayjs(d);
              if (week) {
                return `${DAY_TH[(djs.day() + 6) % 7]} ${formatThaiDate(d)}`;
              }
              return formatThaiDate(d);
            },
            tickLabelInterval: () => true,
            tickLabelStyle: {
              fontSize: days.length > 20 ? 10 : 11,
              angle: -45,
              textAnchor: "end",
            },
            height: 56,
          },
        ]}
        // 15% headroom so the day total above the tallest bar is never clipped.
        yAxis={[{ label: legend ? "People" : undefined, width: legend ? 48 : 40, min: 0, max: Math.max(10, Math.ceil((Math.max(...totals) * 1.15) / 10) * 10) }]}
        series={codes.map((code) => ({
          id: code,
          label: code,
          stack: "total",
          color: colors.get(code) ?? CHART_OTHER,
          data: days.map((d) => perDay.get(code)?.get(d) ?? 0),
          valueFormatter: (v: number | null) => (v ? `${v} คน` : null),
        }))}
        // Each contractor's count inside its segment (hidden when the segment is too thin).
        barLabel={(item, ctx) => (item.value && ctx.bar.height >= 16 && ctx.bar.width >= 18 ? String(item.value) : null)}
        slots={{ tooltip: CustomStackedBarTooltip }}
        slotProps={legendBottom}
        hideLegend={!legend}
        grid={{ horizontal: true }}
        sx={{ "& .MuiBarLabel-root": { fill: "#FFFFFF", fontWeight: 700, fontSize: 12 } }}
      />
    </Box>
  );
}

// Deck p.24 right: average daily manpower per week (trend).
/** Up to this many days the trend is per day; longer ranges average per week. */
export const TREND_DAILY_MAX_DAYS = 31;

// Headcount trend over the selected range (from the same daily rows as the Man-day chart).
// Days without any report are null, not zeros, so a missing day is not a false drop: the line joins the
// reported days and only those carry a mark (a broken line of fragments was hard to read).
export function ManpowerTrendChart({ days, daily, height = 300 }: { days: string[]; daily: Array<{ date: string; headcount: number }>; height?: number }) {
  const byDay = new Map<string, number>();
  for (const d of daily) byDay.set(d.date, (byDay.get(d.date) ?? 0) + d.headcount);
  if (byDay.size === 0) return <Empty text="ยังไม่มีข้อมูลในช่วงที่เลือก" height={height} />;

  const weekly = days.length > TREND_DAILY_MAX_DAYS;
  const points: Array<{ key: string; label: string; value: number | null }> = [];
  if (!weekly) {
    for (const d of days) points.push({ key: d, label: dayjs(d).format("D MMM"), value: byDay.get(d) ?? null });
  } else {
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7);
      const reported = chunk.map((d) => byDay.get(d)).filter((n): n is number => n !== undefined);
      const first = chunk[0]!;
      const last = chunk[chunk.length - 1]!;
      points.push({
        key: first,
        label: `${dayjs(first).format("D")}–${dayjs(last).format("D MMM")}`,
        value: reported.length ? Math.round(reported.reduce((a, n) => a + n, 0) / reported.length) : null,
      });
    }
  }
  const unit = weekly ? "คน/วัน (เฉลี่ย)" : "คน";
  return (
    <LineChart
      height={height}
      xAxis={[
        {
          scaleType: "point",
          data: points.map((p) => p.key),
          valueFormatter: (v: string) => points.find((p) => p.key === v)?.label ?? v,
          tickLabelStyle: { fontSize: 12 },
        },
      ]}
      yAxis={[{ label: height < 300 ? undefined : unit, width: height < 300 ? 36 : 52, min: 0 }]}
      series={[
        {
          id: "trend",
          label: weekly ? "เฉลี่ยคน/วัน" : "คนเข้างาน",
          color: CHART_PRIMARY,
          curve: "linear",
          data: points.map((p) => p.value),
          showMark: ({ index }) => points[index]?.value !== null,
          connectNulls: true,
          valueFormatter: (v: number | null) => (v === null ? "ไม่มีรายงาน" : weekly ? `${v} คน/วัน` : `${v} คน`),
        },
      ]}
      grid={{ horizontal: true }}
      hideLegend
      margin={{ right: 28 }}
    />
  );
}

// Headcount by position, grouped by contractor (actual count in range).
export function PositionByContractorChart({ rows, colors, height = 320 }: { rows: PositionMixRow[]; colors: Map<string, string>; height?: number }) {
  if (rows.length === 0) return <Empty text="ยังไม่มีข้อมูลตำแหน่งในช่วงนี้" height={height} />;
  // Positions in the form's order, only those anyone used this week.
  const positions = POSITIONS.filter((p) => rows.some((r) => r.position === p.code));
  const codes = [...new Set(rows.map((r) => r.contractorCode))].sort((a, b) => a.localeCompare(b));
  return (
    <BarChart
      height={height}
      borderRadius={4}
      xAxis={[{ scaleType: "band", data: positions.map((p) => p.label), tickLabelInterval: () => true, tickLabelStyle: { fontSize: 11, angle: -30, textAnchor: "end" }, height: 64 }]}
      yAxis={[{ width: 44 }]}
      series={codes.map((code) => ({
        id: code,
        label: code,
        color: colors.get(code) ?? CHART_OTHER,
        data: positions.map((p) => {
          const r = rows.find((row) => row.contractorCode === code && row.position === p.code);
          return r?.totalHeadcount ?? r?.avgPerDay ?? 0;
        }),
        valueFormatter: (v: number | null) => (v ? `${v.toLocaleString()} คน` : null),
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

export function NationalityByContractorChart({ contractors, height = 300 }: { contractors: ManpowerSummary["contractors"]; height?: number }) {
  if (contractors.length === 0) return <Empty text="ยังไม่มีข้อมูลในช่วงนี้" height={height} />;
  return (
    <BarChart
      height={height}
      borderRadius={4}
      xAxis={[{ scaleType: "band", data: contractors.map((c) => c.contractorCode) }]}
      yAxis={[{ width: 44 }]}
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

// Man-days per building (site order), stacked by contractor (user request, Oct 2026).
// Horizontal so the 15 facility names stay readable.
export function ManpowerByBuildingChart({
  rows,
  colors,
  height,
}: {
  rows: ManpowerSummary["byBuilding"];
  colors: Map<string, string>;
  /** Fixed height (bars shrink to fit); default grows with the building count. */
  height?: number;
}) {
  const codes = [...new Set(rows.flatMap((b) => Object.keys(b.contractors)))].sort((a, b) => a.localeCompare(b));
  if (codes.length === 0) return <Empty text="ยังไม่มีการจัดสรรคนลงอาคารในช่วงนี้" height={height} />;
  const shown = height === undefined ? rows : fitBuildings(rows, Math.max(3, Math.floor((height - 40) / BUILDING_ROW)));
  return (
    <BarChart
      height={height ?? rows.length * 30 + 90}
      layout="horizontal"
      borderRadius={3}
      yAxis={[{ scaleType: "band", data: shown.map((b) => b.name), width: height === undefined ? 190 : 160, tickLabelStyle: { fontSize: height === undefined ? 13 : 12 } }]}
      xAxis={[{ label: height === undefined ? "คน-วัน" : undefined }]}
      series={codes.map((code) => ({
        id: code,
        label: code,
        stack: "total",
        color: colors.get(code) ?? CHART_OTHER,
        data: shown.map((b) => b.contractors[code] ?? 0),
        valueFormatter: (v: number | null) => (v ? `${v.toLocaleString()} คน-วัน` : null),
      }))}
      slotProps={legendBottom}
      grid={{ vertical: true }}
    />
  );
}


/** Screen px per building bar when the chart has a fixed height (labels must not overlap). */
const BUILDING_ROW = 22;

// Buildings that had people, busiest first; past `max` rows the rest are summed into one "อื่นๆ" bar.
function fitBuildings(rows: ManpowerSummary["byBuilding"], max: number): ManpowerSummary["byBuilding"] {
  const total = (b: ManpowerSummary["byBuilding"][number]) => Object.values(b.contractors).reduce((a, n) => a + n, 0);
  const used = rows.filter((b) => total(b) > 0).sort((a, b) => total(b) - total(a));
  if (used.length <= max) return used;
  const rest = used.slice(max - 1);
  const other = { ...rest[0]!, name: `อื่นๆ (${rest.length} อาคาร)`, contractors: {} as Record<string, number> };
  for (const b of rest) for (const [code, n] of Object.entries(b.contractors)) other.contractors[code] = (other.contractors[code] ?? 0) + n;
  return [...used.slice(0, max - 1), other];
}
