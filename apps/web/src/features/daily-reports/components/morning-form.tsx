import AddIcon from "@mui/icons-material/Add";
import AirOutlinedIcon from "@mui/icons-material/AirOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import FilterDramaOutlinedIcon from "@mui/icons-material/FilterDramaOutlined";
import ThunderstormOutlinedIcon from "@mui/icons-material/ThunderstormOutlined";
import UmbrellaOutlinedIcon from "@mui/icons-material/UmbrellaOutlined";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DISCIPLINES,
  POSITIONS,
  SITE_EQUIPMENT_TYPES,
  WEATHER_CONDITIONS,
  type PositionCode,
  type SiteEquipmentType,
  type WeatherCondition,
} from "@sts/shared";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { ComponentType } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { HttpError } from "@/services/http/client.js";
import { useSubmitMorning } from "../hooks/use-daily-report-mutations.js";
import { morningSchema, sumCounts, type MorningFormValues } from "../schemas/daily-report.schema.js";
import type { Building, DailyReport, PlannedToday, ReportContractor } from "../types/daily-report.types.js";
import { AllocationTracker } from "./allocation-tracker.js";
import { BuildingSelect } from "./building-select.js";
import { CountList } from "./count-list.js";
import { NumberStepper } from "./number-stepper.js";
import { PlannedTodayChecklist } from "./planned-today.js";
import { SectionCard } from "./section-card.js";

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

const POSITION_ITEMS = POSITIONS.map((p) => ({ key: p.code, label: p.label, sub: p.labelTh, primary: p.common }));
const EQUIPMENT_ITEMS = SITE_EQUIPMENT_TYPES.map((e, i) => ({ key: e, label: e, primary: i < 7 }));

const emptyCounts = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

// Normal working hours from the shift window, minus a 1 h lunch break for full days.
function hoursBetween(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(":").map(Number);
  const [eh = 0, em = 0] = end.split(":").map(Number);
  const diff = (eh * 60 + em - (sh * 60 + sm)) / 60;
  if (diff <= 0) return 0;
  return Math.round((diff > 5 ? diff - 1 : diff) * 2) / 2;
}

function toDefaults(report: DailyReport | null): MorningFormValues {
  const base = {
    startTime: report?.startTime ?? "08:00",
    endTime: report?.endTime ?? "17:00",
    workHours: report?.workHours ?? 8,
    disciplines: report?.disciplines ?? [],
    weather: (report?.weather ?? "") as WeatherCondition,
    temperatureC: report?.temperatureC ?? null,
    humidityPct: report?.humidityPct ?? null,
    positions: {
      ...emptyCounts(POSITIONS.map((p) => p.code)),
      ...Object.fromEntries((report?.positions ?? []).map((p) => [p.position, p.headcount])),
    } as Record<PositionCode, number>,
    equipment: {
      ...emptyCounts(SITE_EQUIPMENT_TYPES),
      ...Object.fromEntries((report?.equipment ?? []).map((e) => [e.equipmentType, e.qty])),
    } as Record<SiteEquipmentType, number>,
  };
  if (!report) {
    return {
      ...base,
      thaiMale: 0,
      thaiFemale: 0,
      foreignMale: 0,
      foreignFemale: 0,
      allocations: [{ buildingId: "", headcount: 1, workDescription: "", planPercent: 0 }],
    };
  }
  return {
    ...base,
    thaiMale: report.thaiMale,
    thaiFemale: report.thaiFemale,
    foreignMale: report.foreignMale,
    foreignFemale: report.foreignFemale,
    allocations: report.allocations.map((a) => ({
      buildingId: a.buildingId,
      headcount: a.headcount,
      workDescription: a.workDescription,
      planPercent: a.planPercent,
    })),
  };
}

const NATIONALITY_FIELDS = [
  { name: "thaiMale", label: "ไทย ชาย" },
  { name: "thaiFemale", label: "ไทย หญิง" },
  { name: "foreignMale", label: "ต่างชาติ ชาย" },
  { name: "foreignFemale", label: "ต่างชาติ หญิง" },
] as const;

export function MorningForm({ projectId, date, contractor, buildings, report, plannedToday, onSubmitted }: MorningFormProps) {
  const submit = useSubmitMorning(projectId);
  const form = useForm<MorningFormValues>({
    resolver: zodResolver(morningSchema),
    defaultValues: toDefaults(report),
    mode: "onTouched",
  });
  const { control, handleSubmit, formState, setValue, getValues } = form;
  const allocations = useFieldArray({ control, name: "allocations" });

  const [thaiMale, thaiFemale, foreignMale, foreignFemale, allocValues, positionValues] = useWatch({
    control,
    name: ["thaiMale", "thaiFemale", "foreignMale", "foreignFemale", "allocations", "positions"],
  });
  // Position headcount is the primary total; nationality/sex must describe the same people.
  const total = sumCounts(positionValues);
  const byNationality = thaiMale + thaiFemale + foreignMale + foreignFemale;
  const nationalityOk = total > 0 && byNationality === total;
  const allocated = (allocValues ?? []).reduce((s, a) => s + (Number.isFinite(a.headcount) ? a.headcount : 0), 0);
  const remaining = total - allocated;
  const chosenBuildings = (allocValues ?? []).map((a) => a.buildingId).filter(Boolean);

  const onSubmit = handleSubmit((v) => {
    submit.mutate({
      date,
      contractorId: contractor.id,
      startTime: v.startTime,
      endTime: v.endTime,
      workHours: v.workHours,
      disciplines: v.disciplines,
      weather: v.weather,
      temperatureC: v.temperatureC ?? undefined,
      humidityPct: v.humidityPct ?? undefined,
      positions: Object.entries(v.positions)
        .filter(([, n]) => n > 0)
        .map(([position, headcount]) => ({ position: position as PositionCode, headcount })),
      equipment: Object.entries(v.equipment)
        .filter(([, n]) => n > 0)
        .map(([equipmentType, qty]) => ({ equipmentType: equipmentType as SiteEquipmentType, qty })),
      thaiMale: v.thaiMale,
      thaiFemale: v.thaiFemale,
      foreignMale: v.foreignMale,
      foreignFemale: v.foreignFemale,
      allocations: v.allocations.map((a) => ({ ...a, workDescription: a.workDescription.trim() })),
    }, { onSuccess: onSubmitted });
  });

  const serverError = submit.error instanceof HttpError ? submit.error : null;
  const canSubmit = total > 0 && remaining === 0 && nationalityOk && !submit.isPending;
  const syncHours = () => setValue("workHours", hoursBetween(getValues("startTime"), getValues("endTime")));

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      {report?.morningStatus === "submitted" ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          ส่งรายงานเช้าแล้ว — แก้ไขและส่งใหม่ได้จนกว่าจะส่งครบทั้งเช้าและเย็น
        </Alert>
      ) : null}

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
          ประเภทงาน
        </Typography>
        <Controller
          name="disciplines"
          control={control}
          render={({ field }) => (
            <Stack direction="row" spacing={1}>
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
      </SectionCard>

      <SectionCard index={2} title="สภาพอากาศ" subtitle="ใช้เทียบกฎหยุดงาน (ฝน/ลมแรง) และอธิบายผลงานที่ต่ำกว่าแผน">
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
                        minWidth: 0,
                        borderWidth: on ? 2 : 1,
                        borderColor: on ? "warning.main" : "divider",
                        bgcolor: on ? "warning.light" : "background.paper",
                        color: on ? "warning.dark" : "text.secondary",
                        "&:hover": { borderWidth: on ? 2 : 1 },
                      }}
                    >
                      <Icon />
                      <Typography variant="caption" sx={{ color: "inherit", lineHeight: 1.2 }}>
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

      <SectionCard index={3} title="ผู้ปฏิบัติงาน (ตามตำแหน่ง)" subtitle="จำนวนคนเข้างานวันนี้แยกตามตำแหน่ง — ยอดรวมใช้เป็นกำลังคนหลัก">
        <Controller
          name="positions"
          control={control}
          render={({ field, fieldState }) => (
            <>
              <CountList
                items={POSITION_ITEMS}
                values={field.value}
                onChange={(key, n) => field.onChange({ ...field.value, [key]: n })}
                unit="คน"
                totalLabel="Today manpower"
              />
              {fieldState.error ? (
                <Typography variant="caption" color="error">
                  {fieldState.error.message}
                </Typography>
              ) : null}
            </>
          )}
        />
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 2,
            border: 1.5,
            borderColor: nationalityOk ? "success.main" : "warning.main",
            bgcolor: nationalityOk ? "success.light" : "warning.light",
          }}
        >
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
            {nationalityOk ? (
              <CheckCircleOutlineIcon sx={{ fontSize: 18, color: "success.dark" }} />
            ) : (
              <WarningAmberOutlinedIcon sx={{ fontSize: 18, color: "warning.dark" }} />
            )}
            <Typography variant="body2" sx={{ fontWeight: 700, color: nationalityOk ? "success.dark" : "warning.dark" }}>
              สัญชาติ / เพศ (บังคับกรอก) — {byNationality} / {total} คน
            </Typography>
          </Stack>
          <Grid container spacing={1.5}>
            {NATIONALITY_FIELDS.map((f) => (
              <Grid key={f.name} size={{ xs: 6, sm: 3 }}>
                <Controller
                  name={f.name}
                  control={control}
                  render={({ field }) => <NumberStepper label={f.label} value={field.value} onChange={field.onChange} />}
                />
              </Grid>
            ))}
          </Grid>
          {!nationalityOk && total > 0 ? (
            <Typography variant="caption" sx={{ display: "block", mt: 1, color: "warning.dark" }}>
              {byNationality < total
                ? `ยังขาดอีก ${total - byNationality} คน ให้ตรงกับจำนวนตามตำแหน่ง`
                : `เกิน ${byNationality - total} คน จากจำนวนตามตำแหน่ง`}
            </Typography>
          ) : null}
        </Box>
      </SectionCard>

      <SectionCard index={4} title="จัดสรรคนงานลงอาคาร (Building Allocation)" subtitle="ทุกคนต้องลงอาคารครบพอดี">
        <AllocationTracker total={total} allocated={allocated} />
        {formState.errors.allocations?.root?.message || formState.errors.allocations?.message ? (
          <Typography variant="caption" color="error" sx={{ display: "block", mb: 1 }}>
            {formState.errors.allocations?.root?.message ?? formState.errors.allocations?.message}
          </Typography>
        ) : null}
        <Stack spacing={1.5}>
          {allocations.fields.map((row, i) => (
            <Card key={row.id} variant="outlined">
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Controller
                      name={`allocations.${i}.buildingId`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <BuildingSelect
                          label="อาคาร"
                          buildings={buildings}
                          value={field.value}
                          onChange={field.onChange}
                          disabledIds={chosenBuildings.filter((id) => id !== field.value)}
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                    <IconButton
                      aria-label="ลบอาคาร"
                      onClick={() => allocations.remove(i)}
                      disabled={allocations.fields.length === 1}
                      sx={{ mt: 0.5 }}
                    >
                      <DeleteOutlineOutlinedIcon />
                    </IconButton>
                  </Stack>
                  <Controller
                    name={`allocations.${i}.workDescription`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="ลักษณะงาน"
                        placeholder="เช่น ยกติดตั้ง Structure line A–D"
                        size="small"
                        fullWidth
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                    <Controller
                      name={`allocations.${i}.headcount`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <NumberStepper
                          label="จำนวนคนในอาคาร"
                          value={field.value}
                          onChange={field.onChange}
                          min={1}
                          unit="คน"
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                    <Controller
                      name={`allocations.${i}.planPercent`}
                      control={control}
                      render={({ field }) => (
                        <NumberStepper
                          label="แผนงาน (Plan %)"
                          value={field.value}
                          onChange={field.onChange}
                          max={100}
                          step={5}
                          unit="%"
                        />
                      )}
                    />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          fullWidth
          sx={{ mt: 1.5, borderStyle: "dashed" }}
          disabled={allocations.fields.length >= buildings.length}
          onClick={() =>
            allocations.append({ buildingId: "", headcount: Math.max(1, remaining), workDescription: "", planPercent: 0 })
          }
        >
          เพิ่มอาคาร
        </Button>
      </SectionCard>

      <SectionCard index={5} title="เครื่องจักร / เครื่องมือในไซต์" subtitle="จำนวนที่นำเข้าไซต์วันนี้ (ไม่ต้องจอง)">
        <Controller
          name="equipment"
          control={control}
          render={({ field }) => (
            <CountList
              items={EQUIPMENT_ITEMS}
              values={field.value}
              onChange={(key, n) => field.onChange({ ...field.value, [key]: n })}
              unit="เครื่อง"
              max={500}
            />
          )}
        />
      </SectionCard>

      <SectionCard index={6} title="คำขอสำหรับวันนี้ (ส่งไว้เมื่อวานเย็น)" subtitle="อ่านอย่างเดียว — ขอใหม่/แก้ไขได้ในรายงานเย็น (แผนพรุ่งนี้)">
        <PlannedTodayChecklist planned={plannedToday} />
      </SectionCard>

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
        {total > 0 && !nationalityOk ? (
          <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
            สัญชาติ/เพศ {byNationality} คน ไม่ตรงกับตามตำแหน่ง {total} คน — ปุ่มส่งถูกล็อก
          </Alert>
        ) : null}
        {remaining !== 0 && total > 0 ? (
          <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
            {remaining > 0 ? `ยังไม่ได้ลงอาคาร ${remaining} คน` : `จัดสรรเกิน ${-remaining} คน`} — ปุ่มส่งถูกล็อก
          </Alert>
        ) : null}
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
