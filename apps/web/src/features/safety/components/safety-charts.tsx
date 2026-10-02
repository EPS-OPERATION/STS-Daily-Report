import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import dayjs from "dayjs";
import { CHART_OTHER, CHART_SERIES } from "@/app/theme/chart-palette.js";
import type { SafetyStats } from "../types/safety.types.js";

// Monthly trend: near misses vs safety inspections (line walk findings), one shared axis.
export function MonthlyTrendChart({ stats, height = 240 }: { stats: SafetyStats; height?: number }) {
  return (
    <BarChart
      height={height}
      borderRadius={3}
      xAxis={[{ scaleType: "band", data: stats.monthly.map((m) => dayjs(`${m.month}-01`).format("MMM")) }]}
      yAxis={[{ width: 36, tickMinStep: 1 }]}
      series={[
        { id: "nm", label: "Near Miss", color: CHART_SERIES[0], data: stats.monthly.map((m) => m.nearMiss) },
        { id: "insp", label: "Safety Inspection", color: CHART_SERIES[1], data: stats.monthly.map((m) => m.inspections) },
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
        <Typography variant="body2" color="text.secondary" sx={{ py: 6 }}>
          ไม่มีรายการในช่วงนี้
        </Typography>
      )}
    </Box>
  );
}
