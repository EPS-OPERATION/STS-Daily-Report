import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import { BarPlot } from "@mui/x-charts/BarChart";
import { ChartContainer } from "@mui/x-charts/ChartContainer";
import { ChartsAxisHighlight } from "@mui/x-charts/ChartsAxisHighlight";
import { ChartsGrid } from "@mui/x-charts/ChartsGrid";
import { ChartsTooltip } from "@mui/x-charts/ChartsTooltip";
import { ChartsXAxis } from "@mui/x-charts/ChartsXAxis";
import { ChartsYAxis } from "@mui/x-charts/ChartsYAxis";
import type { WeatherHour } from "@sts/shared";
import { hourLabels, Legend } from "./hourly-weather-chart.js";
import { EmptySection } from "@/components/ui/empty-state.js";

/** One rain period EPS recorded on site (Rain & Delay Log). */
export interface ActualRainPeriod { date: string; startTime: string; endTime: string; note?: string }

const bangkokDate = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
const bangkokHour = (iso: string) => (new Date(iso).getUTCHours() + 7) % 24;
const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// EPS-recorded rain on the same hour axis as the weather-service chart above: each bar is how many
// minutes of that hour it rained on site (60 = the whole hour), so the two charts read side by side.
export function ActualRainChart({ hours, periods, height = 200 }: { hours: WeatherHour[]; periods: ActualRainPeriod[]; height?: number }) {
  const theme = useTheme();
  const { labels, every } = hourLabels(hours);
  const minutes = hours.map((h) => {
    const day = bangkokDate(h.hour);
    const from = bangkokHour(h.hour) * 60;
    const to = from + 60;
    const m = periods
      .filter((p) => p.date === day)
      .reduce((sum, p) => sum + Math.max(0, Math.min(to, minutesOf(p.endTime)) - Math.max(from, minutesOf(p.startTime))), 0);
    return m ? Math.min(60, m) : null;
  });

  if (!minutes.some((m) => m)) {
    return (
      <EmptySection dense height={96} title="EPS ยังไม่ได้บันทึกฝนตกในช่วงนี้ — กด «Log actual rain time» ด้านล่างเมื่อฝนตกหน้างาน" />
    );
  }

  return (
    <Stack spacing={1}>
      <Legend items={[{ label: "ฝนตกหน้างาน (นาทีในแต่ละชั่วโมง)", color: theme.palette.info.dark }]} />
      <ChartContainer
        height={height}
        xAxis={[{ id: "hour", scaleType: "band", data: labels, tickLabelInterval: (_: string, i: number) => i % every === 0, tickLabelStyle: { fontSize: 11 } }]}
        yAxis={[{ id: "min", position: "left", label: "นาที", min: 0, max: 60, width: 44, tickInterval: [0, 15, 30, 45, 60] }]}
        series={[
          {
            type: "bar",
            id: "actual",
            label: "ฝนตกหน้างาน",
            yAxisId: "min",
            color: theme.palette.info.dark,
            data: minutes,
            valueFormatter: (v) => (v ? `${v} นาที` : null),
          },
        ]}
        margin={{ top: 12, right: 52 }}
      >
        <ChartsGrid horizontal />
        <BarPlot />
        <ChartsXAxis axisId="hour" />
        <ChartsYAxis axisId="min" />
        <ChartsAxisHighlight x="band" />
        <ChartsTooltip trigger="axis" />
      </ChartContainer>
    </Stack>
  );
}
