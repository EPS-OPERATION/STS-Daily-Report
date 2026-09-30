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
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DISCIPLINES,
  MACHINE_TYPES,
  PERMIT_TYPES,
  POSITIONS,
  SITE_EQUIPMENT_TYPES,
  WEATHER_CONDITIONS,
  type MachineType,
  type PermitType,
  type PositionCode,
  type SiteEquipmentType,
  type WeatherCondition,
} from "@sts/shared";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { ComponentType } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { HttpError } from "@/services/http/client.js";
import { useSubmitMorning } from "../hooks/use-daily-report-mutations.js";
import { morningSchema, sumCounts, type MorningFormValues } from "../schemas/daily-report.schema.js";
import type { Building, DailyReport, ReportContractor } from "../types/daily-report.types.js";
import { AllocationTracker } from "./allocation-tracker.js";
import { CountList } from "./count-list.js";
import { NumberStepper } from "./number-stepper.js";
import { PERMIT_ICONS } from "./permit-meta.js";
import { RequestSection } from "./request-section.js";
import { SectionCard } from "./section-card.js";

interface MorningFormProps {
  projectId: string;
  date: string;
  contractor: ReportContractor;
  buildings: Building[];
  report: DailyReport | null;
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
      machinery: [],
      permits: [],
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
    machinery: report.machinery.map((m) => ({
      machineType: m.machineType,
      unitTag: m.unitTag ?? "",
      buildingId: m.buildingId,
      startTime: m.startTime,
      endTime: m.endTime,
    })),
    permits: report.permits.map((p) => ({
      permitType: p.permitType,
      otherLabel: p.otherLabel ?? "",
      buildingId: p.buildingId,
      workers: p.workers,
    })),
  };
}

const NATIONALITY_FIELDS = [
  { name: "thaiMale", label: "ไทย ชาย" },
  { name: "thaiFemale", label: "ไทย หญิง" },
  { name: "foreignMale", label: "ต่างชาติ ชาย" },
  { name: "foreignFemale", label: "ต่างชาติ หญิง" },
] as const;

export function MorningForm({ projectId, date, contractor, buildings, report, onSubmitted }: MorningFormProps) {
  const submit = useSubmitMorning(projectId);
  const form = useForm<MorningFormValues>({
    resolver: zodResolver(morningSchema),
    defaultValues: toDefaults(report),
    mode: "onTouched",
  });
  const { control, handleSubmit, formState, setValue, getValues } = form;
  const allocations = useFieldArray({ control, name: "allocations" });
  const machinery = useFieldArray({ control, name: "machinery" });
  const permits = useFieldArray({ control, name: "permits" });

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
  const allocatedBuildings = buildings.filter((b) => chosenBuildings.includes(b.id));

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
      machinery: v.machinery.map((m) => ({
        buildingId: m.buildingId,
        machineType: m.machineType as MachineType,
        unitTag: m.unitTag?.trim() || undefined,
        startTime: m.startTime,
        endTime: m.endTime,
      })),
      permits: v.permits.map((p) => ({
        buildingId: p.buildingId,
        permitType: p.permitType as PermitType,
        otherLabel: p.permitType === "other" ? p.otherLabel?.trim() : undefined,
        workers: p.workers,
      })),
    }, { onSuccess: onSubmitted });
  });

  const serverError = submit.error instanceof HttpError ? submit.error : null;
  const canSubmit = total > 0 && remaining === 0 && nationalityOk && !submit.isPending;
  const syncHours = () => setValue("workHours", hoursBetween(getValues("startTime"), getValues("endTime")));

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      {report?.morningStatus === "submitted" ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          ส่งรายงานเช้าแล้ว — แก้ไขและส่งใหม่ได้จนกว่าจะส่งรายงานเย็น
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

      <SectionCard index={6} title="คำขอประจำวัน (Daily Request)" subtitle="ขอตรวจ QAQC · จองเครื่องจักร · ใบอนุญาตงานเสี่ยง">
        <SubHeading>ขอตรวจ QAQC</SubHeading>
        <RequestSection
          projectId={projectId}
          contractorId={contractor.id}
          reportDate={date}
          buildings={buildings}
          morningSubmitted={report?.morningStatus === "submitted"}
        />
        <Divider sx={{ my: 2.5 }} />
        <SubHeading>จองเครื่องจักร / ยานพาหนะ</SubHeading>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          ระบุหมายเลขเครื่อง (เช่น CR-01) เพื่อตรวจการจองซ้ำ
        </Typography>
        <Stack spacing={1.5}>
          {machinery.fields.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              ไม่มีการจองเครื่องจักรวันนี้
            </Typography>
          ) : null}
          {machinery.fields.map((row, i) => (
            <MachineryRow key={row.id} index={i} control={control} buildings={buildings} onRemove={() => machinery.remove(i)} />
          ))}
        </Stack>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          fullWidth
          sx={{ mt: 1.5, borderStyle: "dashed" }}
          onClick={() =>
            machinery.append({
              machineType: "" as MachineType,
              unitTag: "",
              buildingId: chosenBuildings[0] ?? "",
              startTime: "08:00",
              endTime: "17:00",
            })
          }
        >
          จองเครื่องจักร
        </Button>
        {report?.machineryConflicts.length ? (
          <Alert severity="warning" icon={<WarningAmberOutlinedIcon />} sx={{ mt: 1.5 }}>
            <AlertTitle>พบการจองเครื่องจักรซ้ำซ้อน</AlertTitle>
            {report.machineryConflicts.map((c) => (
              <Typography key={c.bookingIds.join("-")} variant="body2">
                {c.machineType}
                {c.unitTag ? ` (${c.unitTag})` : ""} —{" "}
                {c.with.map((w) => `${w.contractorCode} @ ${w.buildingCode} ${w.startTime}–${w.endTime}`).join(", ")}
                {c.severity === "possible" ? " · ไม่ระบุหมายเลขเครื่อง อาจเป็นคนละคัน" : ""}
              </Typography>
            ))}
          </Alert>
        ) : null}
        <Divider sx={{ my: 2.5 }} />
        <SubHeading>ใบอนุญาตงานเสี่ยง (Work Permits)</SubHeading>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          แตะประเภทเพื่อเพิ่ม แล้วผูกกับอาคารที่ทำงาน
        </Typography>
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 1.5 }}>
          {PERMIT_TYPES.map((p) => {
            const Icon = PERMIT_ICONS[p.code];
            return (
              <Chip
                key={p.code}
                icon={<Icon style={{ fontSize: 16 }} />}
                label={p.label}
                variant="outlined"
                onClick={() =>
                  permits.append({
                    permitType: p.code,
                    otherLabel: "",
                    buildingId: allocatedBuildings.length === 1 ? allocatedBuildings[0]!.id : "",
                    workers: 1,
                  })
                }
                sx={{ minHeight: 36 }}
              />
            );
          })}
        </Stack>
        <Stack spacing={1.5}>
          {permits.fields.map((row, i) => (
            <PermitRow
              key={row.id}
              index={i}
              control={control}
              buildings={allocatedBuildings}
              onRemove={() => permits.remove(i)}
            />
          ))}
        </Stack>
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

// ---- rows ------------------------------------------------------------------

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
      {children}
    </Typography>
  );
}

function BuildingSelect({
  label,
  buildings,
  value,
  onChange,
  disabledIds = [],
  error,
}: {
  label: string;
  buildings: Building[];
  value: string;
  onChange: (id: string) => void;
  disabledIds?: string[];
  error?: string;
}) {
  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      fullWidth
      error={Boolean(error)}
      helperText={error ?? (buildings.length === 0 ? "ยังไม่มีอาคารให้เลือก" : undefined)}
    >
      {buildings.map((b) => (
        <MenuItem key={b.id} value={b.id} disabled={disabledIds.includes(b.id)}>
          <Stack>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {b.name}
            </Typography>
            {b.nameTh ? (
              <Typography variant="caption" color="text.secondary">
                {b.nameTh}
              </Typography>
            ) : null}
          </Stack>
        </MenuItem>
      ))}
    </TextField>
  );
}

function MachineryRow({
  index,
  control,
  buildings,
  onRemove,
}: {
  index: number;
  control: Control<MorningFormValues>;
  buildings: Building[];
  onRemove: () => void;
}) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <Controller
              name={`machinery.${index}.machineType`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  select
                  label="ประเภทเครื่องจักร"
                  size="small"
                  fullWidth
                  {...field}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                >
                  {MACHINE_TYPES.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={{ xs: 10, sm: 4 }}>
            <Controller
              name={`machinery.${index}.unitTag`}
              control={control}
              render={({ field }) => (
                <TextField {...field} label="หมายเลขเครื่อง" placeholder="CR-01" size="small" fullWidth />
              )}
            />
          </Grid>
          <Grid size={{ xs: 2, sm: 1 }} sx={{ display: "flex", justifyContent: "flex-end" }}>
            <IconButton aria-label="ลบการจอง" onClick={onRemove}>
              <DeleteOutlineOutlinedIcon />
            </IconButton>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name={`machinery.${index}.buildingId`}
              control={control}
              render={({ field, fieldState }) => (
                <BuildingSelect
                  label="อาคารที่ใช้งาน"
                  buildings={buildings}
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          </Grid>
          {(["startTime", "endTime"] as const).map((k) => (
            <Grid key={k} size={{ xs: 6, sm: 3 }}>
              <Controller
                name={`machinery.${index}.${k}`}
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type="time"
                    label={k === "startTime" ? "เริ่ม" : "สิ้นสุด"}
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
        </Grid>
      </CardContent>
    </Card>
  );
}

function PermitRow({
  index,
  control,
  buildings,
  onRemove,
}: {
  index: number;
  control: Control<MorningFormValues>;
  buildings: Building[];
  onRemove: () => void;
}) {
  const type = useWatch({ control, name: `permits.${index}.permitType` }) as PermitType;
  const meta = PERMIT_TYPES.find((p) => p.code === type);
  const Icon = PERMIT_ICONS[type] ?? PERMIT_ICONS.other;
  return (
    <Card variant="outlined" sx={{ borderColor: "warning.main" }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Icon sx={{ color: "warning.dark" }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {meta?.label ?? type}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {meta?.labelTh}
              </Typography>
            </Box>
            <IconButton aria-label="ลบใบอนุญาต" onClick={onRemove}>
              <DeleteOutlineOutlinedIcon />
            </IconButton>
          </Stack>
          {type === "other" ? (
            <Controller
              name={`permits.${index}.otherLabel`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="ชื่องานเสี่ยง"
                  size="small"
                  fullWidth
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          ) : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-end" }}>
            <Controller
              name={`permits.${index}.buildingId`}
              control={control}
              render={({ field, fieldState }) => (
                <BuildingSelect
                  label="อาคาร (จากที่จัดสรรคนแล้ว)"
                  buildings={buildings}
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name={`permits.${index}.workers`}
              control={control}
              render={({ field, fieldState }) => (
                <NumberStepper
                  label="จำนวนคน"
                  value={field.value}
                  onChange={field.onChange}
                  min={1}
                  unit="คน"
                  error={fieldState.error?.message}
                />
              )}
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
