import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { WeatherHour } from "@sts/shared";
import { useState, type ReactNode } from "react";
import { addDaysIso, todayIso } from "@/lib/dates.js";
import { useHourlyWeather } from "../hooks/use-weather.js";
import { HourlyWeatherChart } from "./hourly-weather-chart.js";

type Range = "today" | "yesterday" | "week";
const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "วันนี้" },
  { value: "yesterday", label: "เมื่อวาน" },
  { value: "week", label: "7 วัน" },
];

/** Where the site is (shown with the charts so readers know which place the data describes). */
const SITE_NOTE = "ภายในพื้นที่โรงงาน บริษัท ปูนซิเมนต์ไทย (ทุ่งสง) จำกัด · ต.ที่วัง อ.ทุ่งสง จ.นครศรีธรรมราช";

const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString();

// Two charts on one hour axis, read top to bottom: what the weather service recorded for the site,
// then what EPS recorded on site (Rain & Delay Log, supplied by the page through `actual`).
export function HourlyWeatherPanel({
  projectId,
  actual,
}: {
  projectId: string | null;
  /** Renders the EPS actual chart for the same range and hours. */
  actual?: (range: { from: string; to: string; hours: WeatherHour[] }) => ReactNode;
}) {
  const [range, setRange] = useState<Range>("today");
  const today = todayIso();
  const from = range === "today" ? today : range === "yesterday" ? addDaysIso(today, -1) : addDaysIso(today, -6);
  const to = range === "yesterday" ? addDaysIso(today, -1) : today;
  const q = useHourlyWeather(projectId, from, to);
  const data = q.data?.data;
  const hours = data?.hours ?? [];

  const rainHours = hours.filter((h) => (h.precipitationMm ?? 0) >= 0.1);
  const rainTotal = hours.reduce((s, h) => s + (h.precipitationMm ?? 0), 0);
  const temps = hours.map((h) => h.temperatureC).filter((t): t is number => t !== null);

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} spacing={1.5} sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="h5">อากาศหน้างานรายชั่วโมง</Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
            <PlaceOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">
              {SITE_NOTE}
            </Typography>
          </Stack>
        </Box>
        <ToggleButtonGroup exclusive size="small" value={range} onChange={(_, v: Range | null) => v && setRange(v)} aria-label="ช่วงเวลา">
          {RANGES.map((r) => (
            <ToggleButton key={r.value} value={r.value} sx={{ px: 1.75 }}>
              {r.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {data?.stale ? (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          ดึงข้อมูลชั่วโมงล่าสุดไม่สำเร็จ — แสดงข้อมูลที่บันทึกไว้แล้ว
        </Alert>
      ) : null}
      {q.isError ? <Alert severity="error">โหลดข้อมูลอากาศไม่สำเร็จ</Alert> : null}

      {q.isLoading ? (
        <Skeleton variant="rounded" height={420} />
      ) : (
        <Stack spacing={2.5}>
          <Box>
            <ChartHeading
              title="ข้อมูลอุตุนิยมวิทยา (Open-Meteo)"
              note="แบบจำลองสภาพอากาศตามพิกัดไซต์ · บันทึกอัตโนมัติทุกชั่วโมง"
              figures={
                hours.length
                  ? [
                      { label: "ฝนรวม", value: `${fmt(rainTotal)} mm` },
                      { label: "ฝนตก", value: `${rainHours.length} ชม.` },
                      { label: "อุณหภูมิ", value: temps.length ? `${fmt(Math.min(...temps))}–${fmt(Math.max(...temps))} °C` : "-" },
                    ]
                  : []
              }
            />
            <HourlyWeatherChart hours={hours} />
          </Box>
          {actual ? (
            <Box>
              <ChartHeading title="ข้อมูลจากการกรอกด้วย EPS (Actual)" note="จาก Rain & Delay Log · ฝนที่ตกจริงหน้างาน" figures={[]} />
              {actual({ from, to, hours })}
            </Box>
          ) : null}
        </Stack>
      )}
    </Box>
  );
}

function ChartHeading({ title, note, figures }: { title: string; note: string; figures: { label: string; value: string }[] }) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      justifyContent="space-between"
      alignItems={{ md: "baseline" }}
      spacing={0.5}
      sx={{ mb: 1, pb: 0.75, borderBottom: 1, borderColor: "divider" }}
    >
      <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {note}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={2}>
        {figures.map((f) => (
          <Typography key={f.label} variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            {f.label}{" "}
            <Box component="span" sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>
              {f.value}
            </Box>
          </Typography>
        ))}
      </Stack>
    </Stack>
  );
}
