import ThunderstormOutlinedIcon from "@mui/icons-material/ThunderstormOutlined";
import Box from "@mui/material/Box";
import { BarChart } from "@mui/x-charts/BarChart";
import { EmptySection } from "@/components/ui/empty-state.js";
import type { RainStats } from "../types/rain-log.types.js";

interface RainTrendChartProps {
  stats: RainStats;
  height?: number;
}

export function RainTrendChart({ stats, height = 300 }: RainTrendChartProps) {
  const data = stats.byDate;

  if (data.length === 0) {
    return <EmptySection icon={<ThunderstormOutlinedIcon />} title="ไม่มีประวัติฝนตกในช่วงวันที่เลือก" description="บันทึกเวลาฝนตกจริงเพื่อเริ่มเก็บสถิติ Delay" />;
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
          {
            id: "rainfall",
            label: "ปริมาณฝน (มม.)",
            width: 48,
            position: "right",
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
          {
            id: "rainMm",
            label: "ปริมาณน้ำฝน (มม.)",
            color: "#0284C7", // Sky blue for rain
            data: data.map((d) => d.rainfallMm),
            yAxisId: "rainfall",
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
