import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import type { RainStats } from "../types/rain-log.types.js";

interface RainTrendChartProps {
  stats: RainStats;
  height?: number;
}

export function RainTrendChart({ stats, height = 300 }: RainTrendChartProps) {
  const data = stats.byDate;

  if (data.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: "center", bgcolor: "background.paper", borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">
          ไม่มีประวัติฝนตกในช่วงวันที่เลือก
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <BarChart
        height={height}
        borderRadius={4}
        xAxis={[
          {
            scaleType: "band",
            data: data.map((d) => d.label),
            tickLabelStyle: { fontSize: 12 },
          },
        ]}
        yAxis={[
          {
            id: "hours",
            label: "ชั่วโมงหยุดงาน (ชม.)",
            width: 48,
          },
        ]}
        series={[
          {
            id: "stoppage",
            label: "ชั่วโมงหยุดงาน (ชม.)",
            color: "#DC2626", // Red for work stoppage impact
            data: data.map((d) => d.stoppageHours),
            yAxisId: "hours",
          },
        ]}
        slotProps={{
          legend: {
            direction: "horizontal",
            position: { vertical: "top", horizontal: "center" },
          },
        }}
        grid={{ horizontal: true }}
      />
    </Box>
  );
}
