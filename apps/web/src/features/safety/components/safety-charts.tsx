import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import dayjs from "dayjs";
import { CHART_OTHER, CHART_SERIES } from "@/app/theme/chart-palette.js";
import { EmptySection } from "@/components/ui/empty-state.js";
import { mondayOf } from "@/lib/dates.js";
import type { SafetyStats } from "../types/safety.types.js";

export type SafetyTrendPeriod = "daily" | "weekly" | "monthly";

type TrendBucket = { key: string; label: string; nearMiss: number; inspections: number };

// Daily = last 14 days, weekly = last 8 weeks (Mon–Sun), monthly = Jan…current month.
// EPS manual entries and contractor reports are already merged in `stats.daily` / `stats.monthly`.
export function safetyTrendBuckets(stats: SafetyStats, period: SafetyTrendPeriod): TrendBucket[] {
  if (period === "monthly") {
    return stats.monthly.map((m) => ({
      key: m.month,
      label: dayjs(`${m.month}-01`).format("MMM"),
      nearMiss: m.nearMiss,
      inspections: m.inspections,
    }));
  }

  const byDate = new Map(stats.daily.map((d) => [d.date, d]));
  if (period === "daily") {
    const end = dayjs(stats.to);
    return Array.from({ length: 14 }, (_, i) => {
      const day = end.subtract(13 - i, "day");
      const key = day.format("YYYY-MM-DD");
      const row = byDate.get(key);
      return { key, label: day.format("D MMM"), nearMiss: row?.nearMiss ?? 0, inspections: row?.inspections ?? 0 };
    });
  }

  const lastStart = mondayOf(stats.to);
  const firstStart = dayjs(lastStart).subtract(7 * 7, "day").format("YYYY-MM-DD");
  return Array.from({ length: 8 }, (_, i) => {
    const start = dayjs(firstStart).add(i * 7, "day").format("YYYY-MM-DD");
    const end = dayjs(start).add(7, "day").format("YYYY-MM-DD");
    const rows = stats.daily.filter((d) => d.date >= start && d.date < end);
    return {
      key: start,
      label: dayjs(start).format("D MMM"),
      nearMiss: rows.reduce((s, d) => s + d.nearMiss, 0),
      inspections: rows.reduce((s, d) => s + d.inspections, 0),
    };
  });
}

// Near misses vs safety inspections, one shared axis. Period is chosen by the caller.
export function SafetyTrendChart({
  stats,
  period = "monthly",
  height = 240,
}: {
  stats: SafetyStats;
  period?: SafetyTrendPeriod;
  height?: number;
}) {
  const buckets = safetyTrendBuckets(stats, period);
  return (
    <BarChart
      height={height}
      borderRadius={3}
      xAxis={[
        {
          scaleType: "band",
          data: buckets.map((b) => b.label),
          tickLabelStyle: { fontSize: period === "daily" ? 10 : 11, angle: period === "daily" ? -45 : 0 },
        },
      ]}
      yAxis={[{ width: 36, tickMinStep: 1 }]}
      series={[
        { id: "nm", label: "Near Miss", color: CHART_SERIES[0], data: buckets.map((b) => b.nearMiss) },
        { id: "insp", label: "Safety Inspection", color: CHART_SERIES[1], data: buckets.map((b) => b.inspections) },
      ]}
      slotProps={{ legend: { direction: "horizontal", position: { vertical: "top", horizontal: "center" } } }}
      grid={{ horizontal: true }}
    />
  );
}

// "Unsafe Action = n Case" / "Unsafe Condition = n Case" pies, split by contractor.
export function FindingPie({
  title,
  summary,
  colors,
  size = 220,
}: {
  title: string;
  summary: SafetyStats["unsafeAct"];
  colors: Map<string, string>;
  size?: number;
}) {
  const status = summary.total === 0 ? "-" : summary.open ? `Open ${summary.open}` : "Closed";
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="body1" sx={{ fontWeight: 700 }}>
        {title} = {summary.total} Case
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
        Status : {status}
      </Typography>
      {summary.total ? (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <PieChart
            width={size + 160}
            height={size}
            series={[
              {
                outerRadius: size / 2 - 10,
                paddingAngle: summary.byContractor.length > 1 ? 1 : 0,
                arcLabel: (item) => `${item.label} ${item.value}`,
                data: summary.byContractor.map((c) => ({
                  id: c.contractorCode,
                  label: c.contractorCode,
                  value: c.cases,
                  color: colors.get(c.contractorCode) ?? CHART_OTHER,
                })),
              },
            ]}
            slotProps={{ legend: { direction: "vertical", position: { vertical: "middle", horizontal: "end" } } }}
          />
        </Box>
      ) : (
        <EmptySection icon={<InsightsOutlinedIcon />} title="ไม่มีรายการในช่วงนี้" description="เลือกช่วงวันที่อื่น หรือรอผู้รับเหมาส่งรายงาน" />
      )}
    </Box>
  );
}
