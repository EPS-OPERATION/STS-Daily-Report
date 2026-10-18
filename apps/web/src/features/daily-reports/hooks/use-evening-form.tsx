import { zodResolver } from "@hookform/resolvers/zod";
import { DISCIPLINE_CODES, overtimeTotals, type MachineType, type PositionCode } from "@sts/shared";
import { type ProgressItem } from "../components/form-aids.js";
import { draftKey, useFormDraft } from "./use-form-draft.js";
import { useState, type FormEvent } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { HttpError } from "@/services/http/client.js";
import { useSubmitEvening } from "./use-daily-report-mutations.js";
import { useInspectionRequests } from "@/features/qaqc/index.js";
import { useWeeklySummary } from "@/features/report-summaries/index.js";
import { eveningSchema, type EveningFormValues } from "../schemas/daily-report.schema.js";
import type { Building } from "@/features/buildings/index.js";
import type { DailyReport, ReportContractor } from "../types/daily-report.types.js";
import { addDaysIso, mondayOf } from "@/lib/dates.js";
import { firstSection, scrollToSection, sectionTitle } from "../utils/form-sections.js";
import { crewTotals } from "../components/crew-manpower.js";
import { crewDefaults } from "../components/evening-helpers.js";
import { SECTIONS } from "../components/evening-helpers.js";



export function useEveningForm({
  projectId,
  date,
  contractor,
  report,
  buildings,
  onSubmitted,
}: {
  projectId: string;
  date: string;
  contractor: ReportContractor;
  report: DailyReport | null;
  buildings: Building[];
  onSubmitted: () => void;
}) {
  const submit = useSubmitEvening(projectId);
  const tomorrow = addDaysIso(date, 1);
  // Other contractors' bookings for tomorrow → live clash hints on each request row.
  const tomorrowWeek = useWeeklySummary(projectId, mondayOf(tomorrow));
  const ctx = { projectId, targetDate: tomorrow, contractorId: contractor.id, others: tomorrowWeek.data?.data ?? null };
  const allocations = report?.allocations ?? [];
  const form = useForm<EveningFormValues>({
    resolver: zodResolver(eveningSchema),
    defaultValues: {
      overtime: (report?.overtime ?? []).map((o) => ({ buildingId: o.buildingId, task: o.task, workers: o.workers, hours: o.hours })),
      accidentOccurred: report?.accidentOccurred ?? null,
      accidentNote: report?.accidentNote ?? "",
      accidentCategory: report?.accidentCategory ?? null,
      machinery: (report?.machinery ?? []).map((m) => ({
        machineType: m.machineType,
        unitTag: m.unitTag ?? "",
        buildingId: m.buildingId,
        allDay: !m.startTime,
        startTime: m.startTime ?? "08:00",
        endTime: m.endTime ?? "17:00",
        purpose: m.purpose ?? "",
      })),
      equipmentRequests: (report?.equipmentRequests ?? []).map((e) => ({
        equipmentType: e.equipmentType,
        qty: e.qty,
        buildingId: e.buildingId,
        purpose: e.purpose ?? "",
      })),
      permits: [],
      // The contractor's own times. EPS changes stay on the server and carry over when this is re-sent.
      roadUsage: (report?.roadUsage ?? []).map((r) => ({
        roadLocation: r.roadLocation,
        buildingId: r.buildingId ?? "",
        startTime: r.requestedStartTime,
        endTime: r.requestedEndTime,
        purpose: r.purpose,
        segmentIds: r.segmentIds ?? [],
        route: r.route ?? null,
      })),
      materials: (report?.materials ?? []).map((m) => ({
        name: m.materialName,
        qty: m.qty,
        unit: m.unit,
      })),
      forecasts:
        report?.forecasts && report.forecasts.length > 0
          ? report.forecasts.map((f) => ({ description: f.description, buildingId: f.buildingId }))
          : [{ description: "", buildingId: "" }],
      // Disciplines that worked this afternoon: saved evening crews, else the morning's.
      disciplines: DISCIPLINE_CODES.filter((d) =>
        (report?.crews.some((c) => c.shift === "evening") ? report.crews.filter((c) => c.shift === "evening") : (report?.crews ?? [])).some(
          (c) => c.discipline === d,
        ),
      ),
      crews: { CE: crewDefaults(report, "CE"), ME: crewDefaults(report, "ME"), EE: crewDefaults(report, "EE") },
      progress: allocations.map((a) => ({
        allocationId: a.id,
        planPercent: a.planPercent,
        actualPercent: a.actualPercent ?? a.planPercent ?? 0,
        countermeasure: a.countermeasure ?? "",
      })),
      signatureName: report?.signatureName ?? "",
      signatureData: report?.hasSignature ? "existing" : "",
    },
    mode: "onTouched",
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const hasExistingSignature = Boolean(report?.hasSignature);
  const { control, handleSubmit, setValue, formState, watch } = form;
  const draft = useFormDraft(form, draftKey("evening", projectId, contractor.id, date));
  // Yes/No gates: open while the contractor says "มี" or rows already exist (saved report, restored draft).
  const [otAsked, setOtAsked] = useState(false);
  const [requestsAsked, setRequestsAsked] = useState(false);
  const inspectionList = useInspectionRequests(projectId, { from: date, to: date, by: "report" });
  const inspectionRows = (inspectionList.data?.data ?? []).filter((r) => r.contractorId === contractor.id);
  const [qaqcAsked, setQaqcAsked] = useState(false);
  const qaqcOpen = qaqcAsked || inspectionRows.length > 0;
  const overtimeRows = useWatch({ control, name: "overtime" });
  const roadRows = useWatch({ control, name: "roadUsage" });
  const otOpen = otAsked || overtimeRows.length > 0;
  const requestsOpen = requestsAsked || roadRows.length > 0;
  const progress = useFieldArray({ control, name: "progress" });
  const accident = useWatch({ control, name: "accidentOccurred" });
  const disciplineValues = useWatch({ control, name: "disciplines" });
  const crewValues = useWatch({ control, name: "crews" });
  const picked = DISCIPLINE_CODES.filter((d) => disciplineValues.includes(d));
  const crewsOk = picked.length > 0 && picked.every((d) => crewTotals(crewValues[d]).ok);

  const onSubmit = handleSubmit(
    (v) => {
      setValidationError(null);
      submit.mutate(
        {
          date,
          contractorId: contractor.id,
          // Per-person OT on the report header = the longest OT row; NMH uses the rows themselves.
          otHours: overtimeTotals(v.overtime).maxHours,
          overtime: v.overtime.map((o) => ({ ...o, task: o.task.trim() })),
          accidentOccurred: v.accidentOccurred ?? false,
          accidentNote: v.accidentOccurred ? v.accidentNote?.trim() : undefined,
          accidentCategory: v.accidentOccurred ? (v.accidentCategory ?? undefined) : undefined,
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
            };
          }),
          progress: v.progress.map((p) => ({
            allocationId: p.allocationId,
            actualPercent: p.actualPercent,
            countermeasure: p.countermeasure?.trim() || undefined,
          })),
          signatureName: v.signatureName.trim(),
          signatureData: v.signatureData === "existing" ? undefined : v.signatureData,
        machinery: v.machinery.map((m) => ({
          buildingId: m.buildingId,
          machineType: m.machineType as MachineType,
          unitTag: m.unitTag?.trim() || undefined,
          startTime: m.allDay ? undefined : m.startTime,
          endTime: m.allDay ? undefined : m.endTime,
          purpose: m.purpose?.trim() || undefined,
        })),
        equipmentRequests: v.equipmentRequests.map((e) => ({
          buildingId: e.buildingId,
          equipmentType: e.equipmentType.trim(),
          qty: e.qty,
          purpose: e.purpose?.trim() || undefined,
        })),
        permits: [],
        roadUsage: v.roadUsage.map((r) => ({
          buildingId: r.buildingId || undefined,
          roadLocation: r.roadLocation.trim(),
          startTime: r.startTime,
          endTime: r.endTime,
          purpose: r.purpose.trim(),
          segmentIds: r.segmentIds,
          route: r.route,
        })),
        materials: v.materials.map((m) => ({
          name: m.name.trim(),
          qty: m.qty,
          unit: m.unit.trim(),
        })),
        forecasts: v.forecasts.map((f) => ({ buildingId: f.buildingId, description: f.description.trim() })),
      },
      { onSuccess: () => { draft.clear(); onSubmitted(); } },
    );
  },
  (errors) => goTo(firstSection(Object.keys(errors), SECTIONS)));

  const goTo = (id: string | null) => {
    if (!id) {
      setValidationError("กรุณาตรวจสอบข้อมูลที่ยังไม่ครบถ้วนหรือไม่ถูกต้องก่อนส่ง");
      return;
    }
    setValidationError(`ยังกรอกไม่ครบ: ${sectionTitle(id)} — เลื่อนไปที่หัวข้อนั้นแล้ว`);
    scrollToSection(id);
  };

  // The afternoon crew check is outside the schema, so it runs before validation.
  const submitOrShowMissing = (e: FormEvent<HTMLFormElement>) => {
    if (crewsOk) {
      void onSubmit(e);
      return;
    }
    // Validate the rest too, then go to whichever problem is highest on the screen.
    e.preventDefault();
    void form.trigger().then(() => goTo(firstSection([...Object.keys(form.formState.errors), "crews"], SECTIONS)));
  };

  const serverError = submit.error instanceof HttpError ? submit.error : null;

  const errorKeys = Object.keys(formState.errors);
  const hasError = (id: string) => SECTIONS.find(([sid]) => sid === id)?.[1].some((k) => errorKeys.includes(k)) ?? false;
  const accidentNote = useWatch({ control, name: "accidentNote" });
  const accidentCategory = useWatch({ control, name: "accidentCategory" });
  const progressRows = useWatch({ control, name: "progress" });
  const signatureName = useWatch({ control, name: "signatureName" });
  const signatureData = useWatch({ control, name: "signatureData" });
  const forecastRows = useWatch({ control, name: "forecasts" }) ?? [];
  const forecastsOk =
    forecastRows.length > 0 &&
    forecastRows.every((f) => Boolean(f?.description?.trim()) && Boolean(f?.buildingId));
  const state = (id: string, done: boolean, optional = false): ProgressItem["state"] =>
    hasError(id) ? "error" : optional ? "optional" : done ? "done" : "todo";
  const checklist: ProgressItem[] = [
    { id: "sec-safety", label: "ความปลอดภัย", state: state("sec-safety", accident === false || (accident === true && Boolean(accidentNote?.trim()) && Boolean(accidentCategory))) },
    { id: "sec-ot", label: "ล่วงเวลา (OT)", state: state("sec-ot", true, true) },
    { id: "sec-crew", label: "ผู้ปฏิบัติงานช่วงบ่าย", state: crewsOk ? state("sec-crew", true) : hasError("sec-crew") ? "error" : "todo" },
    { id: "sec-progress", label: "ผลงานจริง", state: state("sec-progress", progressRows.every((p) => typeof p.actualPercent === "number"), progressRows.length === 0) },
    { id: "sec-tomorrow", label: "คำขอวันพรุ่งนี้", state: state("sec-tomorrow", forecastsOk, false) },
    { id: "sec-sign", label: "ลงนามยืนยัน", state: state("sec-sign", Boolean(signatureName.trim()) && Boolean(signatureData)) },
  ];
  return {
    submit,
    tomorrow,
    tomorrowWeek,
    ctx,
    allocations,
    form,
    validationError,
    setValidationError,
    hasExistingSignature,
    control,
    handleSubmit,
    setValue,
    formState,
    watch,
    draft,
    otAsked,
    setOtAsked,
    requestsAsked,
    setRequestsAsked,
    inspectionList,
    inspectionRows,
    qaqcAsked,
    setQaqcAsked,
    qaqcOpen,
    overtimeRows,
    roadRows,
    otOpen,
    requestsOpen,
    progress,
    accident,
    disciplineValues,
    crewValues,
    picked,
    crewsOk,
    onSubmit,
    goTo,
    submitOrShowMissing,
    serverError,
    errorKeys,
    hasError,
    accidentNote,
    accidentCategory,
    progressRows,
    signatureName,
    signatureData,
    forecastRows,
    forecastsOk,
    state,
    checklist,
    projectId,
    date,
    contractor,
    report,
    buildings,
    onSubmitted,
  };
}

export type UseEveningFormState = ReturnType<typeof useEveningForm>;
