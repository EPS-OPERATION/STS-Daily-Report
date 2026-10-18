import { zodResolver } from "@hookform/resolvers/zod";
import { DISCIPLINE_CODES, SITE_EQUIPMENT_TYPES, WEATHER_CONDITIONS, type Discipline, type PermitType, type PositionCode, weatherCodeLabel, weatherConditionOf } from "@sts/shared";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { HttpError } from "@/services/http/client.js";
import { StandardItemsPanel } from "@/features/report-standard-items/index.js";
import { dailyReportApi } from "../api/daily-report.api.js";
import { useSubmitMorning } from "../hooks/use-daily-report-mutations.js";
import { morningSchema, placementStatus, type MorningFormValues } from "../schemas/daily-report.schema.js";
import type { Building } from "@/features/buildings/index.js";
import type { DailyReport, ReportContractor } from "../types/daily-report.types.js";
import { CopySourcePanel } from "./copy-source-button.js";
import { CountList } from "./count-list.js";
import { crewTotals } from "./crew-manpower.js";
import { NumberStepper } from "./number-stepper.js";
import { SectionCard } from "./section-card.js";
import { DisciplineChips } from "./discipline-picker.js";
import { TimeSelect } from "@/components/ui/time-select.js";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { useWeatherAt } from "@/features/weather/index.js";
import { DraftBanner, DraftSavedNote, FormProgress, type ProgressItem } from "./form-aids.js";
import { draftKey, useFormDraft } from "../hooks/use-form-draft.js";
import { PermitRequests } from "./permit-requests.js";
import { formatThaiDate } from "@/lib/dates.js";
import { firstSection, scrollToSection, sectionTitle, type SectionMap } from "../utils/form-sections.js";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { WEATHER_ICONS } from "./morning-helpers.js";
import { EQUIPMENT_ITEMS } from "./morning-helpers.js";
import { emptyCounts } from "./morning-helpers.js";
import { disciplineLabel } from "./morning-helpers.js";
import { hoursBetween } from "./morning-helpers.js";
import { crewDefaults } from "./morning-helpers.js";
import { toDefaults } from "./morning-helpers.js";
import { CustomEquipmentList } from "./morning-equipment-list.js";
import { MorningCrewSection } from "./morning-crew-section.js";

interface MorningFormProps {
  projectId: string;
  date: string;
  contractor: ReportContractor;
  buildings: Building[];
  report: DailyReport | null;
  onSubmitted: () => void;
  /** Opened from the home page copy button: copy this sent morning report once on open. */
  autoCopyFrom?: string;
  onAutoCopyStarted?: () => void;
}

export function MorningForm({ projectId, date, contractor, buildings, report, onSubmitted, autoCopyFrom, onAutoCopyStarted }: MorningFormProps) {
  const submit = useSubmitMorning(projectId);
  const form = useForm<MorningFormValues>({
    resolver: zodResolver(morningSchema),
    defaultValues: toDefaults(report),
    mode: "onTouched",
  });
  const { control, handleSubmit, formState, setValue, getValues, reset } = form;
  const draft = useFormDraft(form, draftKey("morning", projectId, contractor.id, date));

  const [validationError, setValidationError] = useState<string | null>(null);
  // Copy from the latest morning report: `copied` keeps the form as it was, for undo.
  const [copying, setCopying] = useState(false);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<{ date: string; snapshot: MorningFormValues } | null>(null);
  const [confirmCopy, setConfirmCopy] = useState<DailyReport | null>(null);


  // The sent morning report of the day the contractor picked (null if it is gone or not sent).
  const morningReportOf = (day: string) =>
    dailyReportApi
      .current(projectId, day, contractor.id)
      .then((r) => (r.data.report?.morningStatus === "submitted" ? r.data.report : null))
      .catch(() => null);

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
    const sourcePermits = (source.permits ?? []).map((p) => ({
      permitType: p.permitType,
      otherLabel: p.otherLabel ?? "",
      buildingId: p.buildingId,
      workers: p.workers,
      highRisk: p.highRisk ?? false,
      taskName: p.taskName ?? "",
      supervisorName: p.supervisorName ?? "",
    }));
    setValue("permits", sourcePermits, { shouldDirty: true });
    setCopied({ date: source.reportDate, snapshot });
    setCopyNotice(null);
    setConfirmCopy(null);
  };

  const startCopy = async (day: string) => {
    setCopying(true);
    setCopyNotice(null);
    const source = await morningReportOf(day);
    setCopying(false);
    if (!source) {
      setCopyNotice(`โหลดรายงานเช้าวันที่ ${formatThaiDate(day)} ไม่ได้ — กรอกเองได้ตามปกติ`);
      return;
    }
    if (hasEntries(getValues())) setConfirmCopy(source);
    else applyCopy(source);
  };

  const undoCopy = () => {
    if (copied) reset(copied.snapshot, { keepDefaultValues: true });
    setCopied(null);
  };

  // Once per open, even when React runs effects twice in development.
  const autoCopied = useRef(false);
  useEffect(() => {
    if (!autoCopyFrom || autoCopied.current) return;
    autoCopied.current = true;
    onAutoCopyStarted?.();
    void startCopy(autoCopyFrom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recorded site weather (API, hourly) at the report's start time — real data or nothing, never a guess.
  const weatherStart = useWatch({ control, name: "startTime" }) || "08:00";
  const weatherAt = useWeatherAt(projectId, date, weatherStart);
  const recorded = weatherAt.data?.data.hour ?? null;
  const siteWeather = recorded
    ? {
        weather: weatherConditionOf(recorded),
        weatherLabel: weatherCodeLabel(recorded.weatherCode),
        temperatureC: Math.round(recorded.temperatureC ?? 0),
        humidityPct: recorded.humidityPct ?? 0,
        windSpeedKmh: recorded.windKmh ?? 0,
        at: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(recorded.hour)),
      }
    : null;
  // Auto-fill once, only into an empty weather section of a report not sent yet (never over the contractor's choice).
  const weatherFilled = useRef(false);
  useEffect(() => {
    if (!siteWeather || weatherFilled.current || report?.morningStatus === "submitted") return;
    weatherFilled.current = true;
    if (getValues("weather") || getValues("temperatureC")) return;
    setValue("weather", siteWeather.weather, { shouldValidate: true });
    setValue("temperatureC", siteWeather.temperatureC, { shouldValidate: true });
    setValue("humidityPct", siteWeather.humidityPct, { shouldValidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteWeather?.weather, siteWeather?.temperatureC]);

  // Weather section shows a one-line snapshot; the controls open on "แก้ไข", with no value, or on an error.
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [weatherValue, tempValue, humidityValue] = useWatch({ control, name: ["weather", "temperatureC", "humidityPct"] });
  const weatherError = Boolean(formState.errors.weather || formState.errors.temperatureC || formState.errors.humidityPct);
  const weatherShown = weatherOpen || !weatherValue || weatherError;
  const matchesRecorded = Boolean(
    siteWeather && weatherValue === siteWeather.weather && tempValue === siteWeather.temperatureC && humidityValue === siteWeather.humidityPct,
  );

  const handleApplyWeather = () => {
    if (!siteWeather) return;
    setValue("weather", siteWeather.weather, { shouldValidate: true, shouldDirty: true });
    setValue("temperatureC", siteWeather.temperatureC, { shouldValidate: true, shouldDirty: true });
    setValue("humidityPct", siteWeather.humidityPct, { shouldValidate: true, shouldDirty: true });
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
          permits: v.permits.map((p) => ({
            buildingId: p.buildingId,
            permitType: p.permitType as PermitType,
            otherLabel: p.permitType === "other" ? p.otherLabel?.trim() : undefined,
            workers: p.workers,
            highRisk: p.highRisk,
            taskName: p.highRisk ? p.taskName.trim() : undefined,
            supervisorName: p.highRisk ? p.supervisorName.trim() : undefined,
          })),
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
        { onSuccess: () => { draft.clear(); onSubmitted(); } },
      );
    },
    (errors) => {
      // A crew error is reported per discipline so the jump lands on that discipline's section.
      const keys = Object.keys(errors).flatMap((k) =>
        k === "crews" ? Object.keys(errors.crews ?? {}).map((d) => `crews.${d}`) : [k],
      );
      goTo(firstSection(keys, sections()));
    },
  );

  // Sections in screen order with the fields each one holds.
  const sections = (): SectionMap => [
    ["sec-general", ["startTime", "endTime", "workHours", "disciplines"]],
    ["sec-weather", ["weather", "temperatureC", "humidityPct"]],
    ...picked.map((d) => [`sec-crew-${d}`, [`crews.${d}`]] as const),
    ["sec-equipment", ["equipment"]],
    ["sec-permits", ["permits"]],
  ];

  const goTo = (id: string | null) => {
    if (!id) {
      setValidationError("กรุณาตรวจสอบข้อมูลที่ยังไม่ครบถ้วนหรือไม่ถูกต้องก่อนส่ง");
      return;
    }
    setValidationError(`ยังกรอกไม่ครบ: ${sectionTitle(id)} — เลื่อนไปที่หัวข้อนั้นแล้ว`);
    scrollToSection(id);
  };

  // Checks the zod schema does not cover (pick a discipline, headcount split, placement) come first.
  const submitOrShowMissing = (e: FormEvent<HTMLFormElement>) => {
    if (picked.length === 0) {
      e.preventDefault();
      goTo("sec-general");
      return;
    }
    const notReady = picked.filter((d) => !crewReady(d));
    if (notReady.length === 0) {
      void onSubmit(e);
      return;
    }
    // Validate the rest too, then go to whichever problem is highest on the screen.
    e.preventDefault();
    void form.trigger().then(() => {
      const errors = form.formState.errors;
      const keys = [
        ...Object.keys(errors).flatMap((k) => (k === "crews" ? Object.keys(errors.crews ?? {}).map((d) => `crews.${d}`) : [k])),
        ...notReady.map((d) => `crews.${d}`),
      ];
      goTo(firstSection(keys, sections()));
    });
  };

  const serverError = submit.error instanceof HttpError ? submit.error : null;
  const canSubmit = !submit.isPending;
  const syncHours = () => setValue("workHours", hoursBetween(getValues("startTime"), getValues("endTime")));

  // Checklist over the form: required sections ✓ / ○ / !, optional ones never block.
  const errorKeys = Object.keys(formState.errors).flatMap((k) => (k === "crews" ? Object.keys(formState.errors.crews ?? {}).map((d) => `crews.${d}`) : [k]));
  const hasError = (id: string) => sections().find(([sid]) => sid === id)?.[1].some((k) => errorKeys.includes(k)) ?? false;
  const startTime = useWatch({ control, name: "startTime" });
  const endTime = useWatch({ control, name: "endTime" });
  const weather = useWatch({ control, name: "weather" });
  const state = (id: string, done: boolean, optional = false): ProgressItem["state"] =>
    hasError(id) ? "error" : optional ? "optional" : done ? "done" : "todo";
  const checklist: ProgressItem[] = [
    { id: "sec-general", label: "ข้อมูลทั่วไป", state: state("sec-general", picked.length > 0 && Boolean(startTime) && Boolean(endTime)) },
    { id: "sec-weather", label: "สภาพอากาศ", state: state("sec-weather", Boolean(weather)) },
    ...picked.map((d) => ({ id: `sec-crew-${d}`, label: `กำลังคน ${d}`, state: state(`sec-crew-${d}`, crewReady(d)) })),
    { id: "sec-equipment", label: "เครื่องจักร / เครื่องมือ", state: state("sec-equipment", true, true) },
    { id: "sec-permits", label: "ใบอนุญาตงานเสี่ยง", state: state("sec-permits", true, true) },
  ];

  return (
    <Box component="form" onSubmit={submitOrShowMissing} noValidate>
      {draft.pending ? <DraftBanner savedAt={draft.pending.savedAt} onRestore={draft.restore} onDiscard={draft.discard} /> : null}
      <FormProgress items={checklist} />
      {report?.morningStatus === "submitted" ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          ส่งรายงานเช้าแล้ว — แก้ไขและส่งใหม่ได้ถึง 12:00 น. ของวันถัดไป
        </Alert>
      ) : null}

      <CopySourcePanel
        projectId={projectId}
        contractorId={contractor.id}
        date={date}
        disabled={copying || submit.isPending}
        onPick={(day) => void startCopy(day)}
      />
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
      <ConfirmDialog
        open={Boolean(confirmCopy)}
        title="แทนที่ข้อมูลที่กรอกไว้วันนี้?"
        description={`คน งาน และเครื่องจักรที่กรอกไว้จะถูกแทนที่ด้วยข้อมูลจากวันที่ ${confirmCopy ? formatThaiDate(confirmCopy.reportDate) : ""}`}
        confirmLabel="คัดลอกและแทนที่"
        cancelLabel="ยกเลิก"
        tone="primary"
        onConfirm={() => confirmCopy && applyCopy(confirmCopy)}
        onClose={() => setConfirmCopy(null)}
      />

      <SectionCard id="sec-general" index={1} title="ข้อมูลทั่วไป" subtitle="เวลาทำงานใช้คำนวณชั่วโมงแรงงาน (NMH)">
        <Grid container spacing={1.5} alignItems="flex-end">
          {(["startTime", "endTime"] as const).map((k) => (
            <Grid key={k} size={{ xs: 6, sm: 4 }}>
              <Controller
                name={k}
                control={control}
                render={({ field, fieldState }) => (
                  <TimeSelect
                    label={k === "startTime" ? "เวลาเริ่ม" : "เวลาสิ้นสุด"}
                    value={field.value}
                    onChange={(v) => {
                      field.onChange(v);
                      syncHours();
                    }}
                    onBlur={field.onBlur}
                    after={k === "endTime" ? dayStart : undefined}
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
                <NumberStepper label="Normal hours / person" value={field.value} onChange={field.onChange} max={24} step={0.5} unit="ชม." />
              )}
            />
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, mb: 0.75 }}>
          ประเภทงานวันนี้ (เลือกได้หลายอย่าง)
        </Typography>
        <Controller
          name="disciplines"
          control={control}
          render={({ field }) => <DisciplineChips value={field.value} onChange={field.onChange} attention={picked.length === 0} />}
        />
        {formState.errors.disciplines?.message ? (
          <Typography variant="caption" color="error">
            {formState.errors.disciplines.message}
          </Typography>
        ) : null}
      </SectionCard>

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
                ? `อัตโนมัติจากข้อมูลอากาศ ${siteWeather.at} น.`
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

      <SectionCard id="sec-equipment" index={3 + picked.length} title="เครื่องจักร / เครื่องมือในไซต์" subtitle="จำนวนที่นำเข้าไซต์วันนี้ (ไม่ต้องจอง) — ไม่มีในรายการกดเพิ่มเองได้">
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

      <SectionCard
        id="sec-permits"
        index={4 + picked.length}
        title="ใบอนุญาตงานเสี่ยง (Work Permits)"
        subtitle="สำหรับงานเสี่ยงที่จะทำวันนี้ (Hot Work, Work at Height, Lifting ฯลฯ)"
      >
        <PermitRequests control={control} buildings={buildings} projectId={projectId} contractorId={contractor.id} />
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
          <Alert severity="warning" sx={{ mb: 1, py: 0 }} action={<GoToButton onClick={() => scrollToSection("sec-general")} />}>
            ยังไม่ได้เลือกประเภทงาน
          </Alert>
        ) : null}
        {picked
          .filter((d) => !crewReady(d))
          .map((d) => {
            const t = crewTotals(crewValues[d]);
            return (
              <Alert key={d} severity="warning" sx={{ mb: 1, py: 0 }} action={<GoToButton onClick={() => scrollToSection(`sec-crew-${d}`)} />}>
                {disciplineLabel(d)}:{" "}
                {t.total === 0
                  ? "ยังไม่ได้กรอกจำนวนคน"
                  : !t.ok
                    ? `สัญชาติ/เพศ ${t.byNationality} คน ไม่ตรงกับตามตำแหน่ง ${t.total} คน`
                    : placementProblem(d)}
              </Alert>
            );
          })}
        <Button type="submit" fullWidth disabled={!canSubmit}>
          {submit.isPending
            ? "กำลังส่ง…"
            : report?.morningStatus === "submitted"
              ? "บันทึกการแก้ไขรายงานเช้า"
              : "บันทึก / ส่งรายงานเช้า"}
        </Button>
        <DraftSavedNote savedAt={draft.savedAt} />
      </Box>
    </Box>
  );
}

// Small "go there" action on the footer warnings.
function GoToButton({ onClick }: { onClick: () => void }) {
  return (
    <Button color="inherit" size="small" onClick={onClick} sx={{ py: 0, whiteSpace: "nowrap" }}>
      ไปที่หัวข้อ
    </Button>
  );
}
