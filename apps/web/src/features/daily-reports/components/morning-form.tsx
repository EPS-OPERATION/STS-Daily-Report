import AddIcon from "@mui/icons-material/Add";
import AirOutlinedIcon from "@mui/icons-material/AirOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import FilterDramaOutlinedIcon from "@mui/icons-material/FilterDramaOutlined";
import ThunderstormOutlinedIcon from "@mui/icons-material/ThunderstormOutlined";
import UmbrellaOutlinedIcon from "@mui/icons-material/UmbrellaOutlined";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DISCIPLINES,
  DISCIPLINE_CODES,
  SITE_EQUIPMENT_TYPES,
  WEATHER_CONDITIONS,
  type Discipline,
  type PositionCode,
  type WeatherCondition,
} from "@sts/shared";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { useEffect, useState, type ComponentType } from "react";
import { Controller, useFieldArray, useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { HttpError } from "@/services/http/client.js";
import { StandardItemsPanel, type StandardItem } from "@/features/report-standard-items/index.js";
import { dailyReportApi } from "../api/daily-report.api.js";
import { useSubmitMorning } from "../hooks/use-daily-report-mutations.js";
import { morningSchema, placementStatus, type ActivityValues, type MorningFormValues } from "../schemas/daily-report.schema.js";
import type { Building, DailyReport, PlannedToday, ReportContractor } from "../types/daily-report.types.js";
import { BuildingSelect } from "./building-select.js";
import { CountList } from "./count-list.js";
import { CrewManpower, crewTotals, emptyPositions } from "./crew-manpower.js";
import { NumberStepper } from "./number-stepper.js";
import { PlannedTodayChecklist } from "./planned-today.js";
import { SectionCard } from "./section-card.js";
import { addDaysIso, formatThaiDate } from "../utils/dates.js";

interface MorningFormProps {
  projectId: string;
  date: string;
  contractor: ReportContractor;
  buildings: Building[];
  report: DailyReport | null;
  plannedToday: PlannedToday;
  onSubmitted: () => void;
}

const WEATHER_ICONS: Record<WeatherCondition, ComponentType<SvgIconProps>> = {
  thunderstorm: ThunderstormOutlinedIcon,
  rain: UmbrellaOutlinedIcon,
  hot: WbSunnyOutlinedIcon,
  windy: AirOutlinedIcon,
  normal: FilterDramaOutlinedIcon,
};

// Fixed suggestion list (first 7 shown, rest behind "show more"). Contractors may
// add custom names beyond this list — those ride the same record under their own key.
const EQUIPMENT_ITEMS = SITE_EQUIPMENT_TYPES.map((e, i) => ({ key: e, label: e, primary: i < 7 }));

const emptyCounts = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

const disciplineLabel = (d: Discipline) => DISCIPLINES.find((x) => x.code === d)?.label ?? d;

// Normal working hours from the shift window, minus a 1 h lunch break for full days.
function hoursBetween(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(":").map(Number);
  const [eh = 0, em = 0] = end.split(":").map(Number);
  const diff = (eh * 60 + em - (sh * 60 + sm)) / 60;
  if (diff <= 0) return 0;
  return Math.round((diff > 5 ? diff - 1 : diff) * 2) / 2;
}

type CrewValues = MorningFormValues["crews"][Discipline];

function crewDefaults(report: DailyReport | null, d: Discipline, copied = false): CrewValues {
  const crew = report?.crews.find((c) => c.shift === "morning" && c.discipline === d);
  return {
    positions: {
      ...emptyPositions(),
      ...Object.fromEntries((crew?.positions ?? []).map((p) => [p.position, p.headcount])),
    },
    thaiMale: crew?.thaiMale ?? 0,
    thaiFemale: crew?.thaiFemale ?? 0,
    foreignMale: crew?.foreignMale ?? 0,
    foreignFemale: crew?.foreignFemale ?? 0,
    allocations: (report?.allocations ?? [])
      .filter((a) => a.discipline === d)
      .map((a) => ({
        buildingId: a.buildingId,
        headcount: a.headcount,
        workDescription: a.workDescription,
        // A copy keeps who works where; times and plan % are set again for today.
        timed: !copied && Boolean(a.startTime && a.endTime),
        startTime: (!copied && a.startTime) || "08:00",
        endTime: (!copied && a.endTime) || "12:00",
        hasPlan: !copied && a.planPercent !== null,
        planPercent: copied ? 0 : (a.planPercent ?? 0),
      })),
  };
}

function toDefaults(report: DailyReport | null): MorningFormValues {
  const reported = DISCIPLINE_CODES.filter((d) => report?.crews.some((c) => c.shift === "morning" && c.discipline === d));
  return {
    startTime: report?.startTime ?? "08:00",
    endTime: report?.endTime ?? "17:00",
    workHours: report?.workHours ?? 8,
    disciplines: reported,
    weather: (report?.weather ?? "") as WeatherCondition,
    temperatureC: report?.temperatureC ?? null,
    humidityPct: report?.humidityPct ?? null,
    equipment: {
      ...emptyCounts(SITE_EQUIPMENT_TYPES),
      ...Object.fromEntries((report?.equipment ?? []).map((e) => [e.equipmentType, e.qty])),
    } as Record<string, number>,
    crews: { CE: crewDefaults(report, "CE"), ME: crewDefaults(report, "ME"), EE: crewDefaults(report, "EE") },
  };
}

export function MorningForm({ projectId, date, contractor, buildings, report, plannedToday, onSubmitted }: MorningFormProps) {
  const submit = useSubmitMorning(projectId);
  const form = useForm<MorningFormValues>({
    resolver: zodResolver(morningSchema),
    defaultValues: toDefaults(report),
    mode: "onTouched",
  });
  const { control, handleSubmit, formState, setValue, getValues, reset } = form;

  // Auto-fetch site weather for Thung Song (TMD / Open-Meteo station at site coordinates)
  const [siteWeather, setSiteWeather] = useState<{
    weather: WeatherCondition;
    weatherLabel: string;
    temperatureC: number;
    humidityPct: number;
    windSpeedKmh: number;
  } | null>(null);
  const [weatherAccepted, setWeatherAccepted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  // Copy from the latest morning report: `copied` keeps the form as it was, for undo.
  const [copying, setCopying] = useState(false);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<{ date: string; snapshot: MorningFormValues } | null>(null);
  const [confirmCopy, setConfirmCopy] = useState<DailyReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadWeather() {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=8.0980&longitude=99.6680&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FBangkok"
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          const cur = data.current || {};
          const code = cur.weather_code ?? 1;
          const temp = Math.round(cur.temperature_2m ?? 32);
          const hum = Math.round(cur.relative_humidity_2m ?? 65);
          const wind = Math.round((cur.wind_speed_10m ?? 7) * 10) / 10;

          let mapped: WeatherCondition = "normal";
          let label = "ปกติ / มีเมฆบางส่วน";
          if (code >= 95) {
            mapped = "thunderstorm";
            label = "ฝนฟ้าคะนอง";
          } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
            mapped = "rain";
            label = "มีฝนตก";
          } else if (wind >= 25) {
            mapped = "windy";
            label = "ลมแรง";
          } else if (code === 0 || temp >= 34) {
            mapped = "hot";
            label = "แดดแรง / อากาศร้อนจัด";
          }

          setSiteWeather({
            weather: mapped,
            weatherLabel: label,
            temperatureC: temp,
            humidityPct: hum,
            windSpeedKmh: wind,
          });
        }
      } catch {
        if (!cancelled) {
          setSiteWeather({
            weather: "hot",
            weatherLabel: "แดดแรง / ท้องฟ้าโปร่ง",
            temperatureC: 32,
            humidityPct: 65,
            windSpeedKmh: 6.5,
          });
        }
      }
    }
    loadWeather();
    return () => {
      cancelled = true;
    };
  }, []);

  // Newest morning report sent in the last 7 days, yesterday first.
  const latestMorningReport = async () => {
    const days = Array.from({ length: 7 }, (_, i) => addDaysIso(date, -(i + 1)));
    const found = await Promise.all(
      days.map((d) => dailyReportApi.current(projectId, d, contractor.id).then((r) => r.data.report).catch(() => null)),
    );
    return found.find((r) => r?.morningStatus === "submitted") ?? null;
  };

  const hasEntries = (v: MorningFormValues) =>
    Object.values(v.equipment).some((n) => n > 0) ||
    DISCIPLINE_CODES.some((d) => crewTotals(v.crews[d]).total > 0 || v.crews[d].allocations.some((a) => a.buildingId || a.workDescription.trim()));

  // Copies people (positions and nationality), work items and machines. Times, plan %, weather and hours stay for today.
  const applyCopy = (source: DailyReport) => {
    const snapshot = structuredClone(getValues());
    const sourceDisciplines = DISCIPLINE_CODES.filter((d) => source.crews.some((c) => c.shift === "morning" && c.discipline === d));
    setValue("disciplines", sourceDisciplines, { shouldDirty: true });
    for (const d of sourceDisciplines) {
      const c = crewDefaults(source, d, true);
      setValue(`crews.${d}.positions`, c.positions, { shouldDirty: true });
      setValue(`crews.${d}.thaiMale`, c.thaiMale, { shouldDirty: true });
      setValue(`crews.${d}.thaiFemale`, c.thaiFemale, { shouldDirty: true });
      setValue(`crews.${d}.foreignMale`, c.foreignMale, { shouldDirty: true });
      setValue(`crews.${d}.foreignFemale`, c.foreignFemale, { shouldDirty: true });
      setValue(`crews.${d}.allocations`, c.allocations, { shouldDirty: true });
    }
    const equipment = { ...emptyCounts(SITE_EQUIPMENT_TYPES), ...Object.fromEntries(source.equipment.map((e) => [e.equipmentType, e.qty])) };
    setValue("equipment", equipment as Record<string, number>, { shouldDirty: true });
    setCopied({ date: source.reportDate, snapshot });
    setCopyNotice(null);
    setConfirmCopy(null);
  };

  const startCopy = async () => {
    setCopying(true);
    setCopyNotice(null);
    const source = await latestMorningReport();
    setCopying(false);
    if (!source) {
      setCopyNotice("ไม่พบรายงานเช้าย้อนหลัง 7 วัน — กรอกเองได้ตามปกติ");
      return;
    }
    if (hasEntries(getValues())) setConfirmCopy(source);
    else applyCopy(source);
  };

  const undoCopy = () => {
    if (copied) reset(copied.snapshot, { keepDefaultValues: true });
    setCopied(null);
  };

  const handleApplyWeather = () => {
    if (!siteWeather) return;
    setValue("weather", siteWeather.weather, { shouldValidate: true, shouldDirty: true });
    setValue("temperatureC", siteWeather.temperatureC, { shouldValidate: true, shouldDirty: true });
    setValue("humidityPct", siteWeather.humidityPct, { shouldValidate: true, shouldDirty: true });
    setWeatherAccepted(true);
  };

  const disciplineValues = useWatch({ control, name: "disciplines" });
  const [dayStart, dayEnd] = useWatch({ control, name: ["startTime", "endTime"] });
  const crewValues = useWatch({ control, name: "crews" });
  // Forms follow the chip order CE → ME → EE, not the order they were clicked.
  const picked = DISCIPLINE_CODES.filter((d) => disciplineValues.includes(d));

  // A crew is ready when people are counted, the nationality split matches and, at every time of
  // the day, everyone is placed in an activity (or nobody, e.g. lunch).
  const placementProblem = (d: Discipline) =>
    placementStatus(crewValues[d].allocations ?? [], dayStart, dayEnd, crewTotals(crewValues[d]).total).over;
  const crewReady = (d: Discipline) => crewTotals(crewValues[d]).ok && placementProblem(d) === null;
  const allReady = picked.length > 0 && picked.every(crewReady);

  const onSubmit = handleSubmit(
    (v) => {
      setValidationError(null);
      submit.mutate(
        {
          date,
          contractorId: contractor.id,
          startTime: v.startTime,
          endTime: v.endTime,
          workHours: v.workHours,
          weather: v.weather,
          temperatureC: v.temperatureC ?? undefined,
          humidityPct: v.humidityPct ?? undefined,
          equipment: Object.entries(v.equipment)
            .filter(([, n]) => n > 0)
            .map(([equipmentType, qty]) => ({ equipmentType: equipmentType.trim(), qty })),
          crews: DISCIPLINE_CODES.filter((d) => v.disciplines.includes(d)).map((d) => {
            const c = v.crews[d];
            return {
              discipline: d,
              positions: Object.entries(c.positions)
                .filter(([, n]) => n > 0)
                .map(([position, headcount]) => ({ position: position as PositionCode, headcount })),
              thaiMale: c.thaiMale,
              thaiFemale: c.thaiFemale,
              foreignMale: c.foreignMale,
              foreignFemale: c.foreignFemale,
              allocations: c.allocations.map((a) => ({
                buildingId: a.buildingId,
                headcount: a.headcount,
                workDescription: a.workDescription.trim(),
                ...(a.timed ? { startTime: a.startTime, endTime: a.endTime } : {}),
                ...(a.hasPlan ? { planPercent: a.planPercent } : {}),
              })),
            };
          }),
        },
        { onSuccess: onSubmitted },
      );
    },
    (errors) => {
      const errList = Object.keys(errors);
      if (errList.length > 0) {
        setValidationError("กรุณาตรวจสอบข้อมูลที่ยังไม่ครบถ้วนหรือไม่ถูกต้องก่อนส่ง");
        const first = document.querySelector(`[name="${errList[0]}"]`);
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
  );

  const serverError = submit.error instanceof HttpError ? submit.error : null;
  const canSubmit = allReady && !submit.isPending;
  const syncHours = () => setValue("workHours", hoursBetween(getValues("startTime"), getValues("endTime")));

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      {report?.morningStatus === "submitted" ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          ส่งรายงานเช้าแล้ว — แก้ไขและส่งใหม่ได้ถึง 12:00 น. ของวันถัดไป
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        spacing={1.25}
        sx={{ mb: 2, p: 1.5, border: 1, borderColor: "divider", borderRadius: 2 }}
      >
        <Typography variant="body2" color="text.secondary">
          คัดลอกคน งาน และเครื่องจักรจากเมื่อวาน — ถ้าไม่มี ใช้รายงานล่าสุดภายใน 7 วัน แก้ไขได้ก่อนส่ง
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ContentCopyOutlinedIcon />}
          onClick={startCopy}
          disabled={copying || submit.isPending}
          sx={{ flexShrink: 0, textTransform: "none", fontWeight: 600 }}
        >
          {copying ? "กำลังค้นหา…" : "คัดลอกจากเมื่อวาน"}
        </Button>
      </Stack>
      {copyNotice ? (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setCopyNotice(null)}>
          {copyNotice}
        </Alert>
      ) : null}
      {copied ? (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button color="primary" size="small" onClick={undoCopy}>
              ย้อนกลับ
            </Button>
          }
        >
          คัดลอกจากรายงานวันที่ {formatThaiDate(copied.date)} แล้ว — ตรวจสอบจำนวนคนและงานก่อนส่ง
        </Alert>
      ) : null}
      <Dialog open={Boolean(confirmCopy)} onClose={() => setConfirmCopy(null)} fullWidth maxWidth="xs">
        <DialogTitle>แทนที่ข้อมูลที่กรอกไว้วันนี้?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            คน งาน และเครื่องจักรที่กรอกไว้จะถูกแทนที่ด้วยข้อมูลจากวันที่ {confirmCopy ? formatThaiDate(confirmCopy.reportDate) : ""}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirmCopy(null)}>
            ยกเลิก
          </Button>
          <Button variant="contained" disableElevation onClick={() => confirmCopy && applyCopy(confirmCopy)}>
            คัดลอกและแทนที่
          </Button>
        </DialogActions>
      </Dialog>

      <SectionCard index={1} title="ข้อมูลทั่วไป" subtitle="เวลาทำงานใช้คำนวณชั่วโมงแรงงาน (NMH)">
        <Grid container spacing={1.5}>
          {(["startTime", "endTime"] as const).map((k) => (
            <Grid key={k} size={{ xs: 6, sm: 4 }}>
              <Controller
                name={k}
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      syncHours();
                    }}
                    type="time"
                    label={k === "startTime" ? "เวลาเข้างาน" : "เวลาออกงาน"}
                    size="small"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 900 } }}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
          ))}
          <Grid size={{ xs: 12, sm: 4 }}>
            <Controller
              name="workHours"
              control={control}
              render={({ field }) => (
                <NumberStepper label="ชม.ทำงานปกติ / คน" value={field.value} onChange={field.onChange} max={24} step={0.5} unit="ชม." />
              )}
            />
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, mb: 0.75 }}>
          ประเภทงานวันนี้ — กดเลือกแล้วฟอร์มกำลังคนของประเภทนั้นจะขึ้นมา (เลือกได้หลายประเภท รายงานจะรวมให้เอง)
        </Typography>
        <Controller
          name="disciplines"
          control={control}
          render={({ field }) => (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {DISCIPLINES.map((d) => {
                const on = field.value.includes(d.code);
                return (
                  <Chip
                    key={d.code}
                    label={d.label}
                    color={on ? "primary" : "default"}
                    variant={on ? "filled" : "outlined"}
                    onClick={() => field.onChange(on ? field.value.filter((x) => x !== d.code) : [...field.value, d.code])}
                    sx={{ minHeight: 36 }}
                  />
                );
              })}
            </Stack>
          )}
        />
        {formState.errors.disciplines?.message ? (
          <Typography variant="caption" color="error">
            {formState.errors.disciplines.message}
          </Typography>
        ) : null}
      </SectionCard>

      <SectionCard index={2} title="สภาพอากาศ" subtitle="ใช้เทียบกฎหยุดงาน (ฝน/ลมแรง) และอธิบายผลงานที่ต่ำกว่าแผน">
        {/* Weather Auto-fetch Suggestion Banner */}
        {siteWeather && (
          <Box
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              bgcolor: weatherAccepted ? "success.50" : "action.hover",
              border: "1px solid",
              borderColor: weatherAccepted ? "success.light" : "divider",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5}>
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <WbSunnyOutlinedIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    ข้อมูลสภาพอากาศหน้างานอัตโนมัติ (สถานีตรวจวัด ต.ที่วัง อ.ทุ่งสง)
                  </Typography>
                  <Chip
                    size="small"
                    label="กรมอุตุฯ / Live"
                    color="info"
                    variant="outlined"
                    sx={{ height: 20, fontSize: "0.8rem", fontWeight: 700 }}
                  />
                </Stack>
                <Typography variant="body2" sx={{ color: "text.primary" }}>
                  ตรวจวัดได้: <strong>{siteWeather.weatherLabel}</strong> · อุณหภูมิ <strong>{siteWeather.temperatureC}°C</strong> · ความชื้น <strong>{siteWeather.humidityPct}%</strong> (ลม {siteWeather.windSpeedKmh} km/h)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {weatherAccepted
                    ? "✓ ยืนยันข้อมูลเรียบร้อยแล้ว — บันทึกลงในฟอร์มอัตโนมัติ (สามารถกดเปลี่ยนปุ่มด้านล่างได้หากสภาพอากาศจริงต่างออกไป)"
                    : "สภาพอากาศหน้างานปัจจุบันตรงตามนี้หรือไม่? หากตรงตามนี้กดปุ่มเพื่อกรอกลงฟอร์มอัตโนมัติได้ทันที"}
                </Typography>
              </Stack>

              <Button
                variant={weatherAccepted ? "outlined" : "contained"}
                color={weatherAccepted ? "success" : "primary"}
                startIcon={<CheckCircleOutlineIcon />}
                onClick={handleApplyWeather}
                sx={{ textTransform: "none", fontWeight: 700, minWidth: 210, flexShrink: 0 }}
              >
                {weatherAccepted ? "✓ ข้อมูลตรงตามนี้ (บันทึกแล้ว)" : "ตรงตามนี้ (กรอกอัตโนมัติ)"}
              </Button>
            </Stack>
          </Box>
        )}

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
      </SectionCard>

      {picked.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          เลือกประเภทงาน (CE / ME / EE) ด้านบนก่อน — ฟอร์มกำลังคนและการจัดสรรอาคารของประเภทนั้นจะขึ้นมาให้กรอก
        </Alert>
      ) : null}
      {picked.map((d, i) => (
        <MorningCrewSection
          key={d}
          index={3 + i}
          discipline={d}
          form={form}
          buildings={buildings}
          dayStart={dayStart}
          dayEnd={dayEnd}
          projectId={projectId}
          contractorId={contractor.id}
        />
      ))}

      <SectionCard index={3 + picked.length} title="เครื่องจักร / เครื่องมือในไซต์" subtitle="จำนวนที่นำเข้าไซต์วันนี้ (ไม่ต้องจอง) — ไม่มีในรายการกดเพิ่มเองได้">
        <Controller
          name="equipment"
          control={control}
          render={({ field, fieldState }) => (
            <Stack spacing={1.5}>
              <CountList
                items={EQUIPMENT_ITEMS}
                values={field.value}
                onChange={(key, n) => field.onChange({ ...field.value, [key]: n })}
                unit="เครื่อง"
                max={500}
              />
              <CustomEquipmentList values={field.value} onChange={field.onChange} />
              <StandardItemsPanel
                kind="equipment"
                projectId={projectId}
                contractorId={contractor.id}
                buildings={buildings}
                onApply={(items) => {
                  const next = { ...getValues("equipment") };
                  for (const i of items) next[i.label] = Math.max(next[i.label] ?? 0, i.defaultCount);
                  setValue("equipment", next, { shouldDirty: true });
                }}
                onSaveFromForm={() =>
                  Object.entries(getValues("equipment"))
                    .filter(([, n]) => n > 0)
                    .map(([label, n]) => ({ kind: "equipment" as const, label, defaultCount: n }))
                }
              />
              {fieldState.error?.message ? (
                <Typography variant="caption" color="error">
                  {fieldState.error.message}
                </Typography>
              ) : null}
            </Stack>
          )}
        />
      </SectionCard>

      <SectionCard index={4 + picked.length} title="คำขอสำหรับวันนี้ (ส่งไว้เมื่อวานบ่าย)" subtitle="อ่านอย่างเดียว — ขอใหม่/แก้ไขได้ในรายงานบ่าย (แผนพรุ่งนี้)">
        <PlannedTodayChecklist planned={plannedToday} />
      </SectionCard>

      {validationError ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {validationError}
        </Alert>
      ) : null}

      {serverError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError.message}
        </Alert>
      ) : null}

      <Box
        sx={{
          position: "sticky",
          bottom: { xs: 64, md: 0 },
          zIndex: 3,
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
          mx: { xs: -2, md: 0 },
          px: 2,
          py: 1.5,
        }}
      >
        {picked.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
            ยังไม่ได้เลือกประเภทงาน — ปุ่มส่งถูกล็อก
          </Alert>
        ) : null}
        {picked
          .filter((d) => !crewReady(d))
          .map((d) => {
            const t = crewTotals(crewValues[d]);
            return (
              <Alert key={d} severity="warning" sx={{ mb: 1, py: 0 }}>
                {disciplineLabel(d)}:{" "}
                {t.total === 0
                  ? "ยังไม่ได้กรอกจำนวนคน"
                  : !t.ok
                    ? `สัญชาติ/เพศ ${t.byNationality} คน ไม่ตรงกับตามตำแหน่ง ${t.total} คน`
                    : placementProblem(d)}{" "}
                — ปุ่มส่งถูกล็อก
              </Alert>
            );
          })}
        <Button type="submit" size="large" fullWidth disabled={!canSubmit}>
          {submit.isPending
            ? "กำลังส่ง…"
            : report?.morningStatus === "submitted"
              ? "บันทึกการแก้ไขรายงานเช้า"
              : "บันทึก / ส่งรายงานเช้า"}
        </Button>
      </Box>
    </Box>
  );
}

// Machines beyond the fixed list: free-text name + count, stored under the same
// equipment record keyed by name. Standard rows stay in CountList above.
function CustomEquipmentList({
  values,
  onChange,
}: {
  values: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const standard = new Set<string>(SITE_EQUIPMENT_TYPES);
  const customKeys = Object.keys(values).filter((k) => !standard.has(k));

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("ระบุชื่อเครื่องจักร/อุปกรณ์");
      return;
    }
    if (trimmed.length > 120) {
      setError("ชื่อยาวเกินไป (สูงสุด 120 ตัวอักษร)");
      return;
    }
    const lower = trimmed.toLowerCase();
    if (SITE_EQUIPMENT_TYPES.some((s) => s.toLowerCase() === lower) || customKeys.some((k) => k.toLowerCase() === lower)) {
      setError(`"${trimmed}" มีในรายการแล้ว — เพิ่มจำนวนที่รายการนั้นได้เลย`);
      return;
    }
    if (Object.values(values).filter((n) => (n ?? 0) > 0).length >= 30) {
      setError("ได้สูงสุด 30 รายการ");
      return;
    }
    onChange({ ...values, [trimmed]: 1 });
    setName("");
    setError(null);
  };

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
      <Box sx={{ px: 1.5, pt: 1.25, pb: customKeys.length > 0 ? 0.5 : 1.25 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Other (อื่นๆ)
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          เช่น รถเครนเฉพาะทาง เครื่องปั่นไฟ — พิมพ์ชื่อแล้วกดเพิ่ม
        </Typography>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            label="ชื่อเครื่องจักร/อุปกรณ์"
            placeholder="เช่น เครื่องปั่นไฟ 100 kVA"
            size="small"
            fullWidth
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            error={Boolean(error)}
            helperText={error ?? undefined}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <Button variant="outlined" startIcon={<AddIcon />} onClick={add} sx={{ flexShrink: 0, height: 40 }}>
            เพิ่ม
          </Button>
        </Stack>
      </Box>
      {customKeys.map((key) => (
        <Stack
          key={key}
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ px: 1.5, py: 0.75, borderTop: 1, borderColor: "divider", bgcolor: (values[key] ?? 0) > 0 ? "primary.light" : "background.paper" }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {key}
            </Typography>
          </Box>
          <NumberStepper label={`จำนวน ${key}`} value={values[key] ?? 0} onChange={(n) => onChange({ ...values, [key]: n })} min={0} max={500} unit="เครื่อง" />
          <IconButton
            size="small"
            aria-label={`ลบ ${key}`}
            onClick={() => {
              const next = { ...values };
              delete next[key];
              onChange(next);
            }}
            sx={{ border: 1, borderColor: "divider", width: 32, height: 32 }}
          >
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
    </Box>
  );
}

// Activity times are picked in 30-minute steps (05:00–22:00, covers early starts and OT).
const HALF_HOURS = Array.from({ length: (22 - 5) * 2 + 1 }, (_, i) => {
  const minutes = 5 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
});

const newActivity = (headcount: number): ActivityValues => ({
  buildingId: "",
  headcount,
  workDescription: "",
  timed: false,
  startTime: "08:00",
  endTime: "12:00",
  hasPlan: false,
  planPercent: 0,
});

// A saved work item becomes one Today Activity row: where, what and how many. Times and plan % are set per day.
const activityFromStandard = (i: StandardItem): ActivityValues => ({
  ...newActivity(i.defaultCount),
  buildingId: i.buildingId ?? "",
  workDescription: i.label,
});

// One discipline's morning form: who works (by position + nationality/sex) and Today Activity —
// which building, what work, how many people, optionally when and with a plan %.
function MorningCrewSection({
  index,
  discipline,
  form,
  buildings,
  dayStart,
  dayEnd,
  projectId,
  contractorId,
}: {
  index: number;
  discipline: Discipline;
  form: UseFormReturn<MorningFormValues>;
  buildings: Building[];
  dayStart: string;
  dayEnd: string;
  projectId: string;
  contractorId: string;
}) {
  const { control, setValue, getValues, formState } = form;
  const activities = useFieldArray({ control, name: `crews.${discipline}.allocations` });
  const crew = useWatch({ control, name: `crews.${discipline}` });
  const t = crewTotals(crew);
  const rows = crew.allocations ?? [];
  const placement = placementStatus(rows, dayStart, dayEnd, t.total);
  const problem = t.total > 0 ? placement.over : null;
  const errors = formState.errors.crews?.[discipline];
  const listError = errors?.allocations?.root?.message ?? errors?.allocations?.message;

  // A freshly opened discipline starts with one empty activity.
  useEffect(() => {
    if (getValues(`crews.${discipline}.allocations`).length === 0) activities.append(newActivity(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SectionCard
      index={index}
      title={`${disciplineLabel(discipline)} — ผู้ปฏิบัติงานและ Today Activity`}
      subtitle="จำนวนคนเข้างานวันนี้แยกตามตำแหน่ง แล้วลงรายละเอียดงานว่าทำที่ไหน กี่คน"
    >
      <CrewManpower
        value={crew}
        totalLabel={`${discipline} manpower`}
        error={errors?.positions?.message ?? errors?.thaiMale?.message}
        onPositions={(next) => setValue(`crews.${discipline}.positions`, next, { shouldDirty: true, shouldValidate: formState.isSubmitted })}
        onSplit={(key, n) => setValue(`crews.${discipline}.${key}`, n, { shouldDirty: true, shouldValidate: formState.isSubmitted })}
      />

      <Typography variant="h6" sx={{ mt: 3 }}>
        Today Activity
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        ลงรายละเอียดงานพร้อมจำนวนคนที่ทำ — ถ้าย้ายอาคารระหว่างวัน กด “ระบุเวลา” ได้ (ไม่บังคับ)
      </Typography>

      <Stack spacing={1.5}>
        {activities.fields.map((row, i) => (
          <ActivityRow
            key={row.id}
            index={i}
            discipline={discipline}
            form={form}
            buildings={buildings}
            canRemove={activities.fields.length > 1}
            onRemove={() => activities.remove(i)}
          />
        ))}
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
        <Typography
          variant="body2"
          role="status"
          aria-live="polite"
          sx={{
            fontWeight: 600,
            color: problem ? "error.main" : placement.placed === t.total && t.total > 0 ? "success.dark" : "text.secondary",
          }}
        >
          {t.total === 0
            ? "กรอกจำนวนคนด้านบนก่อน"
            : (problem ?? (placement.placed === t.total ? `ลงงานครบ ${t.total} คนแล้ว` : `ลงงาน ${placement.placed}/${t.total} คน`))}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          size="small"
          disabled={activities.fields.length >= 32}
          onClick={() => activities.append(newActivity(1))}
        >
          เพิ่มกิจกรรม
        </Button>
      </Stack>
      {listError && listError !== problem ? (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
          {listError}
        </Typography>
      ) : null}
      <StandardItemsPanel
        kind="activity"
        projectId={projectId}
        contractorId={contractorId}
        buildings={buildings}
        onApply={(items) => {
          const have = new Set(rows.map((r) => `${r.buildingId}|${r.workDescription.trim().toLowerCase()}`));
          const fresh = items.filter((i) => i.buildingId && !have.has(`${i.buildingId}|${i.label.trim().toLowerCase()}`));
          activities.append(fresh.map(activityFromStandard));
        }}
        onSaveFromForm={() =>
          rows
            .filter((r) => r.buildingId && r.workDescription.trim())
            .map((r) => ({ kind: "activity" as const, label: r.workDescription.trim(), buildingId: r.buildingId, defaultCount: r.headcount }))
        }
      />
    </SectionCard>
  );
}

function ActivityRow({
  index,
  discipline,
  form,
  buildings,
  canRemove,
  onRemove,
}: {
  index: number;
  discipline: Discipline;
  form: UseFormReturn<MorningFormValues>;
  buildings: Building[];
  canRemove: boolean;
  onRemove: () => void;
}) {
  const { control, setValue } = form;
  const path = `crews.${discipline}.allocations.${index}` as const;
  const [timed, hasPlan] = useWatch({ control, name: [`${path}.timed`, `${path}.hasPlan`] });

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Controller
              name={`${path}.buildingId`}
              control={control}
              render={({ field, fieldState }) => (
                <BuildingSelect label="อาคาร" buildings={buildings} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              )}
            />
            <IconButton aria-label="ลบกิจกรรม" onClick={onRemove} disabled={!canRemove} sx={{ mt: 0.5 }}>
              <DeleteOutlineOutlinedIcon />
            </IconButton>
          </Stack>
          <Controller
            name={`${path}.workDescription`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="รายละเอียดงาน"
                placeholder="เช่น ยกติดตั้ง Structure line A–D"
                size="small"
                fullWidth
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Stack direction="row" spacing={2} alignItems="flex-end" flexWrap="wrap" useFlexGap>
            <Controller
              name={`${path}.headcount`}
              control={control}
              render={({ field, fieldState }) => (
                <NumberStepper label="จำนวนคนที่ทำ" value={field.value} onChange={field.onChange} min={1} unit="คน" error={fieldState.error?.message} />
              )}
            />
            {timed ? (
              <Stack direction="row" spacing={1} alignItems="center">
                {(["startTime", "endTime"] as const).map((k) => (
                  <Controller
                    key={k}
                    name={`${path}.${k}`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        select
                        size="small"
                        label={k === "startTime" ? "เริ่ม" : "ถึง"}
                        sx={{ width: 112 }}
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                      >
                        {/* Half-hour steps only; keep an off-grid value from older data selectable. */}
                        {(HALF_HOURS.includes(field.value) ? HALF_HOURS : [field.value, ...HALF_HOURS]).map((t) => (
                          <MenuItem key={t} value={t}>
                            {t}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                ))}
              </Stack>
            ) : null}
            {hasPlan ? (
              <Controller
                name={`${path}.planPercent`}
                control={control}
                render={({ field }) => (
                  <NumberStepper label="แผนงาน (Plan %)" value={field.value} onChange={field.onChange} max={100} step={5} unit="%" />
                )}
              />
            ) : null}
          </Stack>
          {/* Optional extras: time window and plan % */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
            <Button
              size="small"
              variant={timed ? "contained" : "outlined"}
              color={timed ? "primary" : "inherit"}
              startIcon={<ScheduleOutlinedIcon fontSize="small" sx={{ color: timed ? "#fff" : "primary.main" }} />}
              endIcon={timed ? <CloseOutlinedIcon sx={{ fontSize: 16 }} /> : undefined}
              onClick={() => setValue(`${path}.timed`, !timed, { shouldDirty: true, shouldValidate: true })}
              sx={{
                borderRadius: 2,
                px: 1.75,
                py: 0.75,
                fontWeight: 700,
                fontSize: 13,
                textTransform: "none",
                bgcolor: timed ? "primary.main" : "#F8FAFC",
                borderColor: timed ? "primary.main" : "#CBD5E1",
                color: timed ? "#FFFFFF" : "text.primary",
                boxShadow: timed ? "0 2px 4px rgba(11,77,139,0.2)" : "none",
                "&:hover": {
                  bgcolor: timed ? "primary.dark" : "#EFF6FF",
                  borderColor: "primary.main",
                  color: timed ? "#FFFFFF" : "primary.main",
                },
              }}
            >
              {timed ? "ระบุเวลา (คลิกเพื่อยกเลิก)" : "+ ระบุเวลา"}
            </Button>
            <Button
              size="small"
              variant={hasPlan ? "contained" : "outlined"}
              color={hasPlan ? "primary" : "inherit"}
              startIcon={<PercentOutlinedIcon fontSize="small" sx={{ color: hasPlan ? "#fff" : "primary.main" }} />}
              endIcon={hasPlan ? <CloseOutlinedIcon sx={{ fontSize: 16 }} /> : undefined}
              onClick={() => setValue(`${path}.hasPlan`, !hasPlan, { shouldDirty: true })}
              sx={{
                borderRadius: 2,
                px: 1.75,
                py: 0.75,
                fontWeight: 700,
                fontSize: 13,
                textTransform: "none",
                bgcolor: hasPlan ? "primary.main" : "#F8FAFC",
                borderColor: hasPlan ? "primary.main" : "#CBD5E1",
                color: hasPlan ? "#FFFFFF" : "text.primary",
                boxShadow: hasPlan ? "0 2px 4px rgba(11,77,139,0.2)" : "none",
                "&:hover": {
                  bgcolor: hasPlan ? "primary.dark" : "#EFF6FF",
                  borderColor: "primary.main",
                  color: hasPlan ? "#FFFFFF" : "primary.main",
                },
              }}
            >
              {hasPlan ? "แผนงาน % (คลิกเพื่อยกเลิก)" : "+ แผนงาน %"}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
