import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { BarPlot } from "@mui/x-charts/BarChart";
import { ChartContainer } from "@mui/x-charts/ChartContainer";
import { ChartsAxisHighlight } from "@mui/x-charts/ChartsAxisHighlight";
import { ChartsGrid } from "@mui/x-charts/ChartsGrid";
import { ChartsTooltip } from "@mui/x-charts/ChartsTooltip";
import { ChartsXAxis } from "@mui/x-charts/ChartsXAxis";
import { ChartsYAxis } from "@mui/x-charts/ChartsYAxis";
import { LinePlot, MarkPlot } from "@mui/x-charts/LineChart";
import { weatherCodeLabel, type WeatherHour } from "@sts/shared";

const HOUR = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
const DAY_HOUR = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
const n = (v: number | null) => (v === null ? null : v);

/** Time labels shared by the reported and recorded charts so both line up hour for hour. */
export function hourLabels(hours: WeatherHour[]) {
  const multiDay = new Set(hours.map((h) => h.hour.slice(0, 10))).size > 2 || hours.length > 30;
  const labels = hours.map((h) => (multiDay ? DAY_HOUR : HOUR).format(new Date(h.hour)));
  // Long ranges: label every 6th (or 24th) hour so ticks stay readable.
  const every = hours.length > 24 * 4 ? 24 : hours.length > 30 ? 6 : 2;
  return { labels, every };
}

// Recorded hourly site weather: temperature (line) with rain per hour (bars).
// One day labels each hour; several days label the time with the date.
export function HourlyWeatherChart({ hours, height = 260, tempRange }: { hours: WeatherHour[]; height?: number; tempRange?: [number, number] }) {
  const theme = useTheme();
  if (hours.length === 0) {
    return (
      <Box sx={{ height, display: "grid", placeItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          ยังไม่มีข้อมูลอากาศรายชั่วโมงในช่วงนี้
        </Typography>
      </Box>
    );
  }
  const { labels, every } = hourLabels(hours);
  const xAxis = [
    {
      id: "hour",
      scaleType: "band" as const,
      data: labels,
      tickLabelInterval: (_: string, i: number) => i % every === 0,
      tickLabelStyle: { fontSize: 11 },
      valueFormatter: (v: string, ctx: { location: string }) => {
        if (ctx.location !== "tooltip") return v;
        const h = hours[labels.indexOf(v)];
        return h ? `${v} · ${weatherCodeLabel(h.weatherCode)}` : v;
      },
    },
  ];

  return (
    <Stack spacing={1}>
      <Legend items={[{ label: "อุณหภูมิ (°C)", color: theme.palette.warning.main, line: true }, { label: "ฝน (mm/ชม.)", color: theme.palette.info.main }]} />
      <ChartContainer
        height={height}
        xAxis={xAxis}
        yAxis={[
          { id: "temp", position: "left", label: "°C", width: 44, min: tempRange?.[0], max: tempRange?.[1] },
          { id: "rain", position: "right", label: "mm/ชม.", min: 0, max: Math.max(2, ...hours.map((h) => h.precipitationMm ?? 0)) * 1.2, width: 52 },
        ]}
        series={[
          { type: "bar", id: "rain", label: "ฝน (mm)", yAxisId: "rain", color: theme.palette.info.main, data: hours.map((h) => n(h.precipitationMm)), valueFormatter: (v) => (v === null ? "-" : `${v} mm`) },
          { type: "line", id: "temp", label: "อุณหภูมิ (°C)", yAxisId: "temp", color: theme.palette.warning.main, data: hours.map((h) => n(h.temperatureC)), showMark: false, valueFormatter: (v) => (v === null ? "-" : `${v} °C`) },
        ]}
        margin={{ top: 12 }}
      >
        <ChartsGrid horizontal />
        <BarPlot />
        <LinePlot />
        <MarkPlot />
        <ChartsXAxis axisId="hour" />
        <ChartsYAxis axisId="temp" />
        <ChartsYAxis axisId="rain" />
        <ChartsAxisHighlight x="band" />
        <ChartsTooltip trigger="axis" />
      </ChartContainer>
    </Stack>
  );
}

// Plain legend row (the composed charts draw no legend of their own).
export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <Stack direction="row" spacing={2} sx={{ pl: 1 }}>
      {items.map((i) => (
        <Stack key={i.label} direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: i.line ? 16 : 10, height: i.line ? 3 : 10, borderRadius: 0.5, bgcolor: i.color }} />
          <Typography variant="caption" color="text.secondary">
            {i.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
