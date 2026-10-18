import { zodResolver } from "@hookform/resolvers/zod";
import { DISCIPLINE_CODES, SITE_EQUIPMENT_TYPES, type Discipline, type PermitType, type PositionCode, weatherCodeLabel, weatherConditionOf } from "@sts/shared";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { HttpError } from "@/services/http/client.js";
import { dailyReportApi } from "../api/daily-report.api.js";
import { useSubmitMorning } from "./use-daily-report-mutations.js";
import { morningSchema, placementStatus, type MorningFormValues } from "../schemas/daily-report.schema.js";
import type { Building } from "@/features/buildings/index.js";
import type { DailyReport, ReportContractor } from "../types/daily-report.types.js";
import { crewTotals } from "../components/crew-manpower.js";
import { useWeatherAt } from "@/features/weather/index.js";
import { type ProgressItem } from "../components/form-aids.js";
import { draftKey, useFormDraft } from "./use-form-draft.js";
import { formatThaiDate } from "@/lib/dates.js";
import { firstSection, scrollToSection, sectionTitle, type SectionMap } from "../utils/form-sections.js";
import { emptyCounts } from "../components/morning-helpers.js";
import { hoursBetween } from "../components/morning-helpers.js";
import { crewDefaults } from "../components/morning-helpers.js";
import { toDefaults } from "../components/morning-helpers.js";

export interface MorningFormProps {
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

export function useMorningForm({ projectId, date, contractor, buildings, report, onSubmitted, autoCopyFrom, onAutoCopyStarted }: MorningFormProps) {
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
  return {
    submit,
    form,
    control,
    handleSubmit,
    formState,
    setValue,
    getValues,
    reset,
    draft,
    validationError,
    setValidationError,
    copying,
    setCopying,
    copyNotice,
    setCopyNotice,
    copied,
    setCopied,
    confirmCopy,
    setConfirmCopy,
    morningReportOf,
    hasEntries,
    applyCopy,
    startCopy,
    undoCopy,
    autoCopied,
    weatherStart,
    weatherAt,
    recorded,
    siteWeather,
    weatherFilled,
    weatherOpen,
    setWeatherOpen,
    weatherValue,
    tempValue,
    humidityValue,
    weatherError,
    weatherShown,
    matchesRecorded,
    handleApplyWeather,
    disciplineValues,
    dayStart,
    dayEnd,
    crewValues,
    picked,
    placementProblem,
    crewReady,
    onSubmit,
    sections,
    goTo,
    submitOrShowMissing,
    serverError,
    canSubmit,
    syncHours,
    errorKeys,
    hasError,
    startTime,
    endTime,
    weather,
    state,
    checklist,
    projectId,
    date,
    contractor,
    buildings,
    report,
    onSubmitted,
    autoCopyFrom,
    onAutoCopyStarted,
  };
}

export type UseMorningFormState = ReturnType<typeof useMorningForm>;
