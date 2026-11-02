import { WEATHER_CONDITIONS } from "@sts/shared";
import { Controller } from "react-hook-form";
import { SectionCard } from "./section-card.js";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { WEATHER_ICONS } from "./morning-helpers.js";
import type { UseMorningFormState } from "../hooks/use-morning-form.js";

export function MorningWeatherSection({ ed }: { ed: UseMorningFormState }) {
  const { control, siteWeather, setWeatherOpen, weatherValue, tempValue, humidityValue, weatherShown, matchesRecorded, handleApplyWeather } = ed;
  return (
    <SectionCard id="sec-weather" index={2} title="สภาพอากาศ" subtitle="ใช้เทียบกฎหยุดงาน (ฝน/ลมแรง) และอธิบายผลงานที่ต่ำกว่าแผน">
      {/* Snapshot: one line with the day's weather; the controls slide down only to change it. */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "grey.50" }}>
        {weatherValue ? (
          (() => {
            const Icon = WEATHER_ICONS[weatherValue];
            return <Icon sx={{ fontSize: 32, color: "warning.dark" }} />;
          })()
        ) : (
          <WbSunnyOutlinedIcon sx={{ fontSize: 32, color: "text.disabled" }} />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {weatherValue ? WEATHER_CONDITIONS.find((w) => w.code === weatherValue)?.label : "ยังไม่ได้เลือก"}
            {tempValue !== null && tempValue !== undefined ? ` · ${tempValue}°C` : ""}
            {humidityValue !== null && humidityValue !== undefined ? ` · ${humidityValue}%` : ""}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {matchesRecorded && siteWeather
              ? siteWeather.isNow ? `อากาศตอนนี้ ${siteWeather.at} น. · อัปเดตอัตโนมัติจนกดส่ง` : `อัตโนมัติจากข้อมูลอากาศ ${siteWeather.at} น.`
              : weatherValue
                ? "กรอกเองแล้ว"
                : siteWeather
                  ? "เลือกสภาพอากาศด้านล่าง"
                  : "ไม่มีข้อมูลอากาศที่บันทึก — เลือกเองด้านล่าง"}
          </Typography>
        </Box>
        {weatherValue ? (
          <Button
            size="small"
            variant="text"
            endIcon={<ExpandMoreIcon sx={{ transform: weatherShown ? "rotate(180deg)" : "none", transition: "transform .2s" }} />}
            onClick={() => setWeatherOpen((o) => !o)}
            sx={{ flexShrink: 0, minHeight: 40 }}
          >
            {weatherShown ? "ซ่อน" : "แก้ไข"}
          </Button>
        ) : null}
      </Stack>
      <Collapse in={weatherShown} unmountOnExit={false}>
        <Box sx={{ pt: 1.5 }}>
        {siteWeather && !matchesRecorded ? (
          <Button size="small" variant="text" onClick={handleApplyWeather} sx={{ mb: 1, textTransform: "none", px: 0.5 }}>
            ใช้ค่าที่บันทึก ({siteWeather.weatherLabel} · {siteWeather.temperatureC}°C · {siteWeather.humidityPct}%)
          </Button>
        ) : null}
      <Controller
        name="weather"
        control={control}
        render={({ field, fieldState }) => (
          <>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0.75 }}>
              {WEATHER_CONDITIONS.map((w) => {
                const Icon = WEATHER_ICONS[w.code];
                const on = field.value === w.code;
                return (
                  <Button
                    key={w.code}
                    variant="outlined"
                    aria-pressed={on}
                    onClick={() => field.onChange(w.code)}
                    sx={{
                      flexDirection: "column",
                      gap: 0.25,
                      py: 1,
                      px: { xs: 0.25, sm: 1 },
                      minWidth: 0,
                      borderWidth: on ? 2 : 1,
                      borderColor: on ? "warning.main" : "divider",
                      bgcolor: on ? "warning.light" : "background.paper",
                      color: on ? "warning.dark" : "text.secondary",
                      touchAction: "manipulation",
                      "&:hover": { borderWidth: on ? 2 : 1 },
                    }}
                  >
                    <Icon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                    <Typography variant="caption" sx={{ color: "inherit", lineHeight: 1.2, fontSize: { xs: "0.68rem", sm: "0.75rem" } }}>
                      {w.label}
                    </Typography>
                  </Button>
                );
              })}
            </Box>
            {fieldState.error ? (
              <Typography variant="caption" color="error">
                {fieldState.error.message}
              </Typography>
            ) : null}
          </>
        )}
      />
      <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
        {(
          [
            ["temperatureC", "อุณหภูมิ", "°C"],
            ["humidityPct", "ความชื้น", "%"],
          ] as const
        ).map(([name, label, unit]) => (
          <Grid key={name} size={6}>
            <Controller
              name={name}
              control={control}
              render={({ field }) => (
                <TextField
                  label={`${label} (${unit})`}
                  size="small"
                  fullWidth
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const n = Number.parseFloat(e.target.value);
                    field.onChange(Number.isNaN(n) ? null : n);
                  }}
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
              )}
            />
          </Grid>
        ))}
      </Grid>
        </Box>
      </Collapse>
    </SectionCard>
  );
}
