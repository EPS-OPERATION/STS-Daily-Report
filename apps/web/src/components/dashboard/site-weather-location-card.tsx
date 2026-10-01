import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { useEffect, useRef, useState } from "react";
import { Weather3DIcon } from "./weather-3d-icons.js";

// Impeccable Design System Tokens (EPS Construction Clipboard)
const DS = {
  bg: "#FFFFFF",
  surface: "#F7F8F5",
  surface2: "#EFEFEA",
  ink: "#282B28",
  muted: "#757973",
  line: "#DDDED9",
  primary: "#2D7238", // Moss-Olive (Working Brand)
  primaryStrong: "#245C2D",
  accent: "#D97706", // Baked-Ember (Reserved for Priority)
  danger: "#DC2626",
  warningBg: "#FEF3C7",
  warningInk: "#92400E",
  success: "#16A34A",
  radius: "12px",
};

interface DailyForecastItem {
  date: string;
  dayEn: string;
  dayTh: string;
  conditionIcon: "sunny" | "cloudy" | "rain" | "heavy-rain" | "thunderstorm" | "fog";
  tempMax: number;
  tempMin: number;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  pressure: number;
  uvIndex: number;
  windSpeedKmh: number;
  windSpeedMph: number;
  weatherCode: number;
  conditionLabel: string;
  conditionEn: string;
  conditionIcon: "sunny" | "cloudy" | "rain" | "heavy-rain" | "thunderstorm" | "fog";
  conditionBadge: "แดดแรง" | "ฝนตก" | "ฟ้าคะนอง" | "ลมแรง" | "ปกติ";
  sunrise: string;
  sunset: string;
  updatedAt: string;
  forecast: DailyForecastItem[];
}

function getWeatherCondition(code: number): {
  label: string;
  labelEn: string;
  icon: WeatherData["conditionIcon"];
  badge: WeatherData["conditionBadge"];
} {
  if (code === 0) {
    return { label: "แดดจัด / ท้องฟ้าโปร่ง", labelEn: "SUNNY", icon: "sunny", badge: "แดดแรง" };
  }
  if (code === 1 || code === 2) {
    return { label: "มีเมฆบางส่วน แดดสลับ", labelEn: "PARTLY CLOUDY", icon: "cloudy", badge: "ปกติ" };
  }
  if (code === 3) {
    return { label: "มีเมฆเป็นส่วนมาก", labelEn: "MOSTLY CLOUDY", icon: "cloudy", badge: "ปกติ" };
  }
  if (code === 45 || code === 48) {
    return { label: "มีหมอก ทัศนวิสัยจำกัด", labelEn: "FOGGY", icon: "fog", badge: "ปกติ" };
  }
  if (code >= 51 && code <= 67) {
    return { label: "มีฝนตกปรอยๆ - ปานกลาง", labelEn: "LIGHT RAIN", icon: "rain", badge: "ฝนตก" };
  }
  if (code >= 80 && code <= 82) {
    return { label: "ฝนตกหนักต่อเนื่อง", labelEn: "HEAVY RAIN", icon: "heavy-rain", badge: "ฝนตก" };
  }
  if (code >= 95) {
    return { label: "ฝนฟ้าคะนอง", labelEn: "THUNDERSTORM", icon: "thunderstorm", badge: "ฟ้าคะนอง" };
  }
  return { label: "มีเมฆเป็นส่วนมาก สภาพปกติ", labelEn: "PARTLY CLOUDY", icon: "cloudy", badge: "ปกติ" };
}

function formatDayName(dateStr: string, index: number): { dayEn: string; dayTh: string } {
  if (index === 0) return { dayEn: "TODAY", dayTh: "วันนี้" };
  if (index === 1) return { dayEn: "TOMORROW", dayTh: "พรุ่งนี้" };
  const d = new Date(dateStr);
  const daysEn = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const daysTh = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  const dayIdx = d.getDay();
  return { dayEn: daysEn[dayIdx] || "DAY", dayTh: daysTh[dayIdx] || "วัน" };
}

function formatFullDayHeader(dateStr?: string): { dayEn: string; dayTh: string; dateEn: string; dateTh: string } {
  const d = dateStr ? new Date(dateStr) : new Date();
  const fullDaysEn = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const fullDaysTh = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
  const monthsEn = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];
  const monthsTh = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const dayIdx = d.getDay();
  const monthIdx = d.getMonth();
  const dateNum = d.getDate();
  const yearEn = d.getFullYear();
  const yearTh = yearEn + 543;

  return {
    dayEn: fullDaysEn[dayIdx] || "TODAY",
    dayTh: fullDaysTh[dayIdx] || "วันนี้",
    dateEn: `${monthsEn[monthIdx]} ${dateNum}, ${yearEn}`,
    dateTh: `${dateNum} ${monthsTh[monthIdx]} ${yearTh}`,
  };
}

const fallbackForecast: DailyForecastItem[] = [
  { date: "2026-10-01", dayEn: "TODAY", dayTh: "วันนี้", conditionIcon: "cloudy", tempMax: 31, tempMin: 23 },
  { date: "2026-10-02", dayEn: "TOMORROW", dayTh: "พรุ่งนี้", conditionIcon: "rain", tempMax: 29, tempMin: 23 },
  { date: "2026-10-03", dayEn: "SAT", dayTh: "ส.", conditionIcon: "thunderstorm", tempMax: 29, tempMin: 22 },
  { date: "2026-10-04", dayEn: "SUN", dayTh: "อา.", conditionIcon: "cloudy", tempMax: 30, tempMin: 23 },
  { date: "2026-10-05", dayEn: "MON", dayTh: "จ.", conditionIcon: "sunny", tempMax: 30, tempMin: 23 },
];

function getWeatherTheme(icon: WeatherData["conditionIcon"] = "sunny") {
  if (icon === "thunderstorm") {
    return {
      gradient: "linear-gradient(145deg, #1E3A5F 0%, #284B77 45%, #0F2338 100%)",
      shadow: "0 14px 34px -4px rgba(15, 35, 56, 0.45), 0 4px 12px rgba(0, 0, 0, 0.12)",
    };
  }
  if (icon === "rain" || icon === "heavy-rain") {
    return {
      gradient: "linear-gradient(145deg, #1868BA 0%, #2279D6 45%, #134F94 100%)",
      shadow: "0 14px 34px -4px rgba(19, 79, 148, 0.38), 0 4px 12px rgba(0, 0, 0, 0.1)",
    };
  }
  return {
    gradient: "linear-gradient(145deg, #1C7ED6 0%, #228BE6 45%, #1864AB 100%)",
    shadow: "0 14px 34px -4px rgba(24, 100, 171, 0.38), 0 4px 12px rgba(0, 0, 0, 0.08)",
  };
}

export function SiteWeatherLocationCard() {
  // Baseline location: SCG Thung Song / Tambon Thi Wang, Nakhon Si Thammarat
  const [lat, setLat] = useState("8.0980");
  const [lon, setLon] = useState("99.6680");
  const [locationName, setLocationName] = useState("ต.ที่วัง อ.ทุ่งสง จ.นครศรีธรรมราช");
  const [facilityDetail] = useState("ภายในพื้นที่โรงงาน บริษัท ปูนซิเมนต์ไทย (ทุ่งสง) จำกัด");

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Form state for editing location
  const [tempLat, setTempLat] = useState(lat);
  const [tempLon, setTempLon] = useState(lon);
  const [tempName, setTempName] = useState(locationName);

  const firstFieldRef = useRef<HTMLInputElement>(null);

  async function fetchWeather(targetLat: string, targetLon: string) {
    setLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,surface_pressure,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset&timezone=Asia%2FBangkok`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const current = data.current || {};
        const daily = data.daily || {};

        const temp = Math.round(current.temperature_2m ?? 31);
        const humidity = current.relative_humidity_2m ?? 65;
        const precip = current.precipitation ?? 0;
        const windSpeedKmh = current.wind_speed_10m ?? 6.5;
        const windSpeedMph = Math.round(windSpeedKmh * 0.621371 * 10) / 10;
        const weatherCode = current.weather_code ?? 1;
        const pressure = current.surface_pressure ? Math.round(current.surface_pressure) : 1010;
        const uvIndex = current.uv_index ? Math.round(current.uv_index * 10) / 10 : 8.5;

        const condition = getWeatherCondition(weatherCode);

        // Parse 5-day daily forecast
        const times: string[] = daily.time || [];
        const maxTemps: number[] = daily.temperature_2m_max || [];
        const minTemps: number[] = daily.temperature_2m_min || [];
        const codes: number[] = daily.weather_code || [];

        const forecast: DailyForecastItem[] = times.slice(0, 5).map((t, idx) => {
          const cond = getWeatherCondition(codes[idx] ?? 2);
          const { dayEn, dayTh } = formatDayName(t, idx);
          return {
            date: t,
            dayEn,
            dayTh,
            conditionIcon: cond.icon,
            tempMax: Math.round(maxTemps[idx] ?? 30),
            tempMin: Math.round(minTemps[idx] ?? 23),
          };
        });

        // Sunrise & Sunset
        const sunriseTime = daily.sunrise?.[0] ? daily.sunrise[0].split("T")[1]?.slice(0, 5) : "06:09";
        const sunsetTime = daily.sunset?.[0] ? daily.sunset[0].split("T")[1]?.slice(0, 5) : "18:12";

        setWeather({
          temperature: temp,
          humidity,
          precipitation: precip,
          pressure,
          uvIndex,
          windSpeedKmh: Math.round(windSpeedKmh * 10) / 10,
          windSpeedMph,
          weatherCode,
          conditionLabel: condition.label,
          conditionEn: condition.labelEn,
          conditionIcon: condition.icon,
          conditionBadge: condition.badge,
          sunrise: sunriseTime,
          sunset: sunsetTime,
          updatedAt: current.time || new Date().toISOString(),
          forecast: forecast.length > 0 ? forecast : fallbackForecast,
        });
      }
    } catch {
      // Fallback
      setWeather({
        temperature: 31,
        humidity: 65,
        precipitation: 0,
        pressure: 1010,
        uvIndex: 8.5,
        windSpeedKmh: 6.5,
        windSpeedMph: 4.0,
        weatherCode: 1,
        conditionLabel: "มีเมฆบางส่วน สภาพปกติ",
        conditionEn: "PARTLY CLOUDY",
        conditionIcon: "cloudy",
        conditionBadge: "ปกติ",
        sunrise: "06:09",
        sunset: "18:12",
        updatedAt: new Date().toISOString(),
        forecast: fallbackForecast,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather(lat, lon);
  }, [lat, lon]);

  function handleSaveLocation(e: React.FormEvent) {
    e.preventDefault();
    if (tempLat && tempLon) {
      setLat(tempLat.trim());
      setLon(tempLon.trim());
      setLocationName(tempName.trim() || `${tempLat}, ${tempLon}`);
      setShowLocationModal(false);
    }
  }

  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
  const embedMapsUrl = `https://maps.google.com/maps?q=${lat},${lon}&hl=th&z=15&output=embed`;

  // Determine icon & alert style
  const dayHeader = formatFullDayHeader(weather?.updatedAt);
  const weatherTheme = getWeatherTheme(weather?.conditionIcon);

  return (
    <section aria-labelledby="project-map-heading" style={{ marginBottom: "24px" }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h2
            id="project-map-heading"
            style={{
              margin: 0,
              fontSize: "1.125rem",
              fontWeight: 700,
              color: DS.ink,
              letterSpacing: "-0.01em",
            }}
          >
            แผนที่โครงการ &amp; สภาพอากาศหน้างาน
          </h2>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: "9999px",
              padding: "2px 10px",
              fontSize: "0.75rem",
              fontWeight: 600,
              background: DS.surface2,
              color: DS.ink,
              border: `1px solid ${DS.line}`,
            }}
          >
            STS-9.9 MW Biomass
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.75rem", color: DS.muted }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 500 }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: DS.success,
                display: "inline-block",
              }}
            />
            {weather?.updatedAt
              ? `ซิงค์สภาพอากาศ ${new Date(weather.updatedAt).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })} น.`
              : "กำลังซิงค์ข้อมูล..."}
          </span>
          <button
            type="button"
            onClick={() => {
              setTempLat(lat);
              setTempLon(lon);
              setTempName(locationName);
              setShowLocationModal(true);
            }}
            style={{
              display: "inline-flex",
              minHeight: "36px",
              alignItems: "center",
              gap: "6px",
              borderRadius: "8px",
              border: `1px solid ${DS.line}`,
              background: DS.surface,
              padding: "4px 10px",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: DS.ink,
              cursor: "pointer",
            }}
          >
            <PlaceOutlinedIcon sx={{ fontSize: 16, color: DS.primary }} />
            แก้ไขพิกัดไซต์งาน
          </button>
        </div>
      </div>

      {/* Grid: Map on Left, Modern Frosted Weather Widget on Right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Left: Map Card */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: DS.radius,
            border: `1px solid ${DS.line}`,
            background: DS.bg,
          }}
        >
          {/* Map iframe frame */}
          <div
            style={{
              position: "relative",
              height: "200px",
              width: "100%",
              background: DS.surface2,
            }}
          >
            <iframe
              title="แผนที่โครงการ STS-9.9 MW Biomass"
              src={embedMapsUrl}
              style={{ height: "100%", width: "100%", border: 0 }}
              loading="lazy"
              allowFullScreen
            />

            {/* Floating location card */}
            <div
              style={{
                position: "absolute",
                left: "12px",
                top: "12px",
                zIndex: 10,
                maxWidth: "320px",
                borderRadius: "8px",
                border: `1px solid ${DS.line}`,
                background: DS.bg,
                padding: "10px 12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      lineHeight: 1.3,
                      color: DS.ink,
                    }}
                  >
                    {locationName}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: DS.muted, lineHeight: 1.3 }}>
                    {facilityDetail}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.7rem", color: DS.muted }}>
                    พิกัด: {lat}, {lon}
                  </p>
                </div>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    borderRadius: "4px",
                    padding: "4px",
                    color: DS.muted,
                    display: "inline-flex",
                  }}
                  title="เปิดใน Google Maps"
                >
                  <OpenInNewOutlinedIcon sx={{ fontSize: 16, "&:hover": { color: DS.primary } }} />
                </a>
              </div>
            </div>
          </div>

          {/* Map status legend footer */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              borderTop: `1px solid ${DS.line}`,
              padding: "10px 16px",
              fontSize: "0.75rem",
              color: DS.muted,
              background: DS.surface,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 600, color: DS.ink }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: DS.success,
                  display: "inline-block",
                }}
              />
              กำลังก่อสร้าง (On Plan)
            </span>
            <span>โครงการนำร่อง STS 9.9 MW Biomass</span>
          </div>
        </div>

        {/* Right: Modern Frosted Glass Weather Widget (Styled after reference image) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: "18px",
            background: weatherTheme.gradient,
            boxShadow: weatherTheme.shadow,
            border: "1px solid rgba(255, 255, 255, 0.28)",
            padding: "16px 18px",
            position: "relative",
            overflow: "hidden",
            color: "#FFFFFF",
          }}
        >
          {/* Ambient Lighting Orbs for Glassmorphism */}
          <div
            style={{
              position: "absolute",
              top: -35,
              right: -35,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -50,
              left: -40,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 70%)",
              pointerEvents: "none",
            }}
          />

          <div>
            {/* Top Bar: Location + Live Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.18)",
                paddingBottom: "10px",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <PlaceOutlinedIcon sx={{ fontSize: 16, color: "rgba(255, 255, 255, 0.95)" }} />
                <span
                  style={{
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    color: "#FFFFFF",
                    letterSpacing: "0.01em",
                  }}
                >
                  {locationName}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    borderRadius: "9999px",
                    padding: "2px 8px",
                    fontSize: "0.7rem",
                    fontWeight: 500,
                    background: "rgba(255, 255, 255, 0.18)",
                    backdropFilter: "blur(4px)",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    color: "#FFFFFF",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#4ADE80",
                      display: "inline-block",
                      boxShadow: "0 0 6px #4ADE80",
                    }}
                  />
                  Live Sync
                </span>
              </div>
            </div>

            {/* Hero Weather Section: 3-column layout matching reference image */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.9fr 1.05fr",
                alignItems: "center",
                gap: "12px",
                marginTop: "14px",
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* Left Column: Day, Date, Big Temperature, Condition */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: 300,
                    letterSpacing: "0.06em",
                    lineHeight: 1.05,
                    color: "#FFFFFF",
                    textTransform: "uppercase",
                  }}
                >
                  {dayHeader.dayEn}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 400,
                    letterSpacing: "0.08em",
                    color: "rgba(255, 255, 255, 0.8)",
                    textTransform: "uppercase",
                    marginTop: "3px",
                  }}
                >
                  {dayHeader.dateEn}
                </span>

                <div style={{ display: "flex", alignItems: "baseline", marginTop: "10px", lineHeight: 1 }}>
                  <span
                    style={{
                      fontSize: "2.5rem",
                      fontWeight: 300,
                      letterSpacing: "-0.03em",
                      color: "#FFFFFF",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {loading ? "--" : weather?.temperature ?? 31}
                  </span>
                  <span
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 300,
                      color: "rgba(255, 255, 255, 0.85)",
                      marginLeft: "2px",
                    }}
                  >
                    °C
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    color: "rgba(255, 255, 255, 0.95)",
                    textTransform: "uppercase",
                    marginTop: "5px",
                  }}
                >
                  {weather?.conditionEn || "PARTLY CLOUDY"}
                </span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    color: "rgba(255, 255, 255, 0.75)",
                    marginTop: "1px",
                  }}
                >
                  {weather?.conditionLabel}
                </span>
              </div>

              {/* Center Column: 3D Weather Illustration */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  filter: "drop-shadow(0 10px 18px rgba(0, 0, 0, 0.24))",
                }}
              >
                <Weather3DIcon condition={weather?.conditionIcon} size={56} />
              </div>

              {/* Right Column: Sleek Frosted Glass Metrics List */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "14px",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  fontSize: "0.7rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "rgba(255, 255, 255, 0.75)" }}>Wind</span>
                  <span style={{ fontWeight: 600, color: "#FFFFFF" }}>{weather?.windSpeedMph ?? 4} mph</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "rgba(255, 255, 255, 0.75)" }}>Humidity</span>
                  <span style={{ fontWeight: 600, color: "#FFFFFF" }}>{weather?.humidity ?? 65}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "rgba(255, 255, 255, 0.75)" }}>Precip</span>
                  <span style={{ fontWeight: 600, color: "#FFFFFF" }}>{weather?.precipitation ?? 0} mm</span>
                </div>
              </div>
            </div>

            {/* Bottom: 3-day forecast strip — essentials only */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
                marginTop: "12px",
                position: "relative",
                zIndex: 1,
              }}
            >
              {(weather?.forecast || fallbackForecast).slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: idx === 0 ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)",
                    backdropFilter: "blur(6px)",
                    border: idx === 0 ? "1px solid rgba(255, 255, 255, 0.35)" : "1px solid rgba(255, 255, 255, 0.16)",
                    borderRadius: "12px",
                    padding: "8px 4px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      color: idx === 0 ? "#FFFFFF" : "rgba(255, 255, 255, 0.85)",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.dayEn}
                  </span>
                  <div style={{ margin: "2px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Weather3DIcon condition={item.conditionIcon} size={26} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#FFFFFF" }}>
                      {item.tempMax}°
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "rgba(255, 255, 255, 0.65)" }}>
                      {item.tempMin}°
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Location Modal */}
      <Dialog
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: DS.radius,
            border: `1px solid ${DS.line}`,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.125rem", color: DS.ink, pb: 0.5 }}>
          แก้ไขพิกัดและสถานที่ตั้งโครงการ
        </DialogTitle>
        <form onSubmit={handleSaveLocation}>
          <DialogContent sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <p style={{ margin: 0, fontSize: "0.75rem", color: DS.muted }}>
              กำหนดพิกัดละติจูดและลองจิจูดสำหรับหมุดแผนที่และการดึงข้อมูลสภาพอากาศ
            </p>

            <TextField
              inputRef={firstFieldRef}
              label="ชื่อสถานที่ / โครงการ"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              size="small"
              fullWidth
              placeholder="เช่น ต.ที่วัง อ.ทุ่งสง จ.นครศรีธรรมราช"
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <TextField
                label="ละติจูด (Latitude)"
                value={tempLat}
                onChange={(e) => setTempLat(e.target.value)}
                size="small"
                required
                placeholder="เช่น 8.0980"
              />
              <TextField
                label="ลองจิจูด (Longitude)"
                value={tempLon}
                onChange={(e) => setTempLon(e.target.value)}
                size="small"
                required
                placeholder="เช่น 99.6680"
              />
            </div>

            <div
              style={{
                borderRadius: "8px",
                background: DS.surface2,
                padding: "10px 12px",
                fontSize: "0.75rem",
                color: DS.muted,
                lineHeight: 1.4,
              }}
            >
              <strong style={{ color: DS.ink }}>เคล็ดลับ:</strong> คุณสามารถเปิด Google Maps
              คลิกขวาบนจุดก่อสร้างจริง แล้วคัดลอกพิกัดตัวเลขมาวางที่นี่ได้ตลอดเวลา
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <button
              type="button"
              onClick={() => setShowLocationModal(false)}
              style={{
                minHeight: "36px",
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: DS.ink,
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              style={{
                minHeight: "36px",
                padding: "6px 16px",
                borderRadius: "8px",
                border: "none",
                background: DS.primary,
                color: "#FFFFFF",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              บันทึกพิกัดใหม่
            </button>
          </DialogActions>
        </form>
      </Dialog>
    </section>
  );
}
