import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Weather3DIcon } from "./weather-3d-icons.js";

// Compact map + weather for the PM dashboard (the full card lives in
// site-weather-location-card.tsx). Open-Meteo, no API key.
const SITE = { lat: 8.098, lon: 99.668, name: "Thi Wang, Thung Song, Nakhon Si Thammarat" };

const TH_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

type Icon = "sunny" | "cloudy" | "rain" | "heavy-rain" | "thunderstorm" | "fog";

function condition(code: number): { label: string; icon: Icon } {
  if (code === 0) return { label: "แดดจัด", icon: "sunny" };
  if (code <= 3) return { label: "มีเมฆบางส่วน", icon: "cloudy" };
  if (code === 45 || code === 48) return { label: "หมอก", icon: "fog" };
  if (code >= 51 && code <= 67) return { label: "ฝนตก", icon: "rain" };
  if (code >= 80 && code <= 82) return { label: "ฝนตกหนัก", icon: "heavy-rain" };
  if (code >= 95) return { label: "พายุฝนฟ้าคะนอง", icon: "thunderstorm" };
  return { label: "มีเมฆมาก", icon: "cloudy" };
}

interface Forecast {
  current: { temperature_2m: number; relative_humidity_2m: number; wind_speed_10m: number; precipitation: number; weather_code: number };
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max?: number[] };
}

function useSiteWeather() {
  return useQuery({
    queryKey: ["site-weather", SITE.lat, SITE.lon],
    queryFn: async (): Promise<Forecast> => {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${SITE.lat}&longitude=${SITE.lon}` +
        "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3&timezone=Asia%2FBangkok";
      const res = await fetch(url);
      if (!res.ok) throw new Error("weather unavailable");
      return (await res.json()) as Forecast;
    },
    staleTime: 15 * 60_000,
    retry: 1,
  });
}

export function SiteConditionsStrip() {
  const w = useSiteWeather();
  const now = w.data?.current;
  const cond = now ? condition(now.weather_code) : null;
  const rainy = cond && ["rain", "heavy-rain", "thunderstorm"].includes(cond.icon);
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1.25fr)" },
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ position: "relative", minHeight: 150 }}>
        <iframe
          title="Project site map"
          src={`https://maps.google.com/maps?q=${SITE.lat},${SITE.lon}&hl=th&z=14&output=embed`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          loading="lazy"
        />
        <Link
          href={`https://www.google.com/maps?q=${SITE.lat},${SITE.lon}`}
          target="_blank"
          rel="noopener"
          underline="none"
          sx={{
            position: "absolute",
            left: 8,
            bottom: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: "background.paper",
            boxShadow: 1,
            fontSize: 13,
          }}
        >
          {SITE.name} <OpenInNewIcon sx={{ fontSize: 14 }} />
        </Link>
      </Box>

      <Stack direction="row" useFlexGap flexWrap="wrap" spacing={2} alignItems="center" sx={{ px: 2, py: 1.5, bgcolor: "navy.dark", color: "common.white" }}>
        {w.isLoading ? (
          <Skeleton variant="rounded" width="100%" height={110} sx={{ bgcolor: "rgba(255,255,255,0.1)" }} />
        ) : !now || !cond ? (
          <Typography variant="body2" sx={{ color: "inherit", opacity: 0.8 }}>
            ไม่สามารถโหลดข้อมูลสภาพอากาศได้ (ต้องเชื่อมต่ออินเทอร์เน็ต)
          </Typography>
        ) : (
          <>
            <Weather3DIcon condition={cond.icon} size={64} />
            <Box sx={{ minWidth: 0, flex: "1 1 180px" }}>
              <Typography variant="h3" component="div" sx={{ color: "inherit", lineHeight: 1 }}>
                {Math.round(now.temperature_2m)}°C
              </Typography>
              <Typography variant="body2" sx={{ color: "inherit", fontWeight: 700 }}>
                {cond.label}
              </Typography>
              <Typography variant="caption" sx={{ color: "inherit", opacity: 0.8, display: "block" }}>
                ลม {Math.round(now.wind_speed_10m)} กม./ชม. · ความชื้น {now.relative_humidity_2m}% · ฝน {now.precipitation} มม.
              </Typography>
              {rainy ? (
                <Typography variant="caption" sx={{ color: "warning.light", fontWeight: 700 }}>
                  ตรวจสอบเกณฑ์หยุดงานบนที่สูงและงานยก
                </Typography>
              ) : null}
            </Box>
            <Stack direction="row" spacing={1} sx={{ ml: { md: "auto" } }}>
              {w.data!.daily.time.map((d, i) => {
                const c = condition(w.data!.daily.weather_code[i] ?? 1);
                return (
                  <Box key={d} sx={{ textAlign: "center", px: 1, py: 0.75, borderRadius: 1.5, bgcolor: "rgba(255,255,255,0.08)", minWidth: 62 }}>
                    <Typography variant="caption" sx={{ color: "inherit", fontWeight: 700, display: "block" }}>
                      {i === 0 ? "วันนี้" : i === 1 ? "พรุ่งนี้" : TH_DAYS[dayjs(d).day()]}
                    </Typography>
                    <Weather3DIcon condition={c.icon} size={30} />
                    <Typography variant="caption" sx={{ color: "inherit", display: "block" }}>
                      {Math.round(w.data!.daily.temperature_2m_max[i] ?? 0)}° / {Math.round(w.data!.daily.temperature_2m_min[i] ?? 0)}°
                    </Typography>
                    {w.data!.daily.precipitation_probability_max ? (
                      <Typography variant="caption" sx={{ color: "inherit", opacity: 0.75, fontSize: 12 }}>
                        ฝน {w.data!.daily.precipitation_probability_max[i]}%
                      </Typography>
                    ) : null}
                  </Box>
                );
              })}
            </Stack>
          </>
        )}
      </Stack>
    </Box>
  );
}
