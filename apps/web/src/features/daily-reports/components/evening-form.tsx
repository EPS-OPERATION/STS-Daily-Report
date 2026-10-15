import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ACCIDENT_CATEGORIES,
  DISCIPLINES,
  DISCIPLINE_CODES,
  type Discipline,
  type MachineType,
  type PermitType,
  type PositionCode,
} from "@sts/shared";
import MenuItem from "@mui/material/MenuItem";
import { useState, type FormEvent } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control, type UseFormReturn } from "react-hook-form";
import { HttpError } from "@/services/http/client.js";
import { useSubmitEvening } from "../hooks/use-daily-report-mutations.js";
import { useWeeklySummary } from "../hooks/use-daily-report-queries.js";
import { eveningSchema, type EveningFormValues } from "../schemas/daily-report.schema.js";
import type { Building, DailyReport, ReportContractor } from "../types/daily-report.types.js";
import { addDaysIso, formatThaiDate, mondayOf } from "../utils/dates.js";
import { firstSection, scrollToSection, sectionTitle, type SectionMap } from "../utils/form-sections.js";
import { CrewManpower, crewTotals, emptyPositions } from "./crew-manpower.js";
import { NumberStepper } from "./number-stepper.js";
import { RequestSection } from "./request-section.js";
import { SectionCard } from "./section-card.js";
import { SignaturePad } from "./signature-pad.js";
import { EquipmentRequests, ForecastActivities, MachineryRequests, PermitRequests, RoadUsageRequests } from "./tomorrow-requests.js";

const disciplineLabel = (d: Discipline) => DISCIPLINES.find((x) => x.code === d)?.label ?? d;

type EveningCrew = EveningFormValues["crews"][Discipline];

// Afternoon crew of one discipline: the saved evening values, else the morning crew to edit.
function crewDefaults(report: DailyReport | null, d: Discipline): EveningCrew {
  const crew =
    report?.crews.find((c) => c.shift === "evening" && c.discipline === d) ??
    report?.crews.find((c) => c.shift === "morning" && c.discipline === d);
  return {
    positions: {
      ...emptyPositions(),
      ...Object.fromEntries((crew?.positions ?? []).map((p) => [p.position, p.headcount])),
    },
    thaiMale: crew?.thaiMale ?? 0,
    thaiFemale: crew?.thaiFemale ?? 0,
    foreignMale: crew?.foreignMale ?? 0,
    foreignFemale: crew?.foreignFemale ?? 0,
  };
}

// Evening check-out. Independent of the morning shift: without a morning report there
// is simply no plan to report actuals against. Also where tomorrow's requests are made.
// Sections in screen order with the fields each one holds (first one with an error gets the scroll).
const SECTIONS: SectionMap = [
  ["sec-safety", ["accidentOccurred", "accidentNote", "accidentCategory"]],
  ["sec-ot", ["otHours"]],
  ["sec-crew", ["disciplines", "crews"]],
  ["sec-progress", ["progress"]],
  ["sec-tomorrow", ["forecasts", "machinery", "equipmentRequests", "permits", "roadUsage", "materials"]],
  ["sec-sign", ["signatureName", "signatureData"]],
];

export function EveningForm({
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
      otHours: report?.otHours ?? 0,
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
      permits: (report?.permits ?? []).map((p) => ({
        permitType: p.permitType,
        otherLabel: p.otherLabel ?? "",
        buildingId: p.buildingId,
        workers: p.workers,
        highRisk: p.highRisk ?? false,
        taskName: p.taskName ?? "",
        supervisorName: p.supervisorName ?? "",
      })),
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
      forecasts: (report?.forecasts ?? []).map((f) => ({ description: f.description, buildingId: f.buildingId })),
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
          otHours: v.otHours,
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
        permits: v.permits.map((p) => ({
          buildingId: p.buildingId,
          permitType: p.permitType as PermitType,
          otherLabel: p.permitType === "other" ? p.otherLabel?.trim() : undefined,
          workers: p.workers,
          highRisk: p.highRisk,
          taskName: p.highRisk ? p.taskName.trim() : undefined,
          supervisorName: p.highRisk ? p.supervisorName.trim() : undefined,
        })),
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
      { onSuccess: onSubmitted },
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

  return (
    <Box component="form" onSubmit={submitOrShowMissing} noValidate>
      <SectionCard id="sec-safety" index={1} tone="navy" title="ความปลอดภัย" subtitle="ใช้นับวันปลอดอุบัติเหตุ">
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <HealthAndSafetyOutlinedIcon color="success" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            เกิดอุบัติเหตุวันนี้หรือไม่
          </Typography>
        </Stack>
        <Controller
          name="accidentOccurred"
          control={control}
          render={({ field, fieldState }) => (
            <>
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={field.value === null ? null : field.value ? "yes" : "no"}
                onChange={(_, v: "yes" | "no" | null) => v && field.onChange(v === "yes")}
                aria-label="Accident today?"
              >
                <ToggleButton value="no" color="success">
                  ไม่เกิด
                </ToggleButton>
                <ToggleButton value="yes" color="error">
                  เกิดอุบัติเหตุ
                </ToggleButton>
              </ToggleButtonGroup>
              {fieldState.error ? (
                <Typography variant="caption" color="error">
                  {fieldState.error.message}
                </Typography>
              ) : null}
            </>
          )}
        />
        {accident ? (
          <Controller
            name="accidentCategory"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                select
                label="Event type"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                fullWidth
                size="small"
                sx={{ mt: 1.5 }}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              >
                {ACCIDENT_CATEGORIES.map((c) => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.labelTh}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        ) : null}
        {accident ? (
          <Controller
            name="accidentNote"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Event details / action"
                multiline
                minRows={2}
                fullWidth
                size="small"
                sx={{ mt: 1.5 }}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
        ) : null}
      </SectionCard>

      <SectionCard id="sec-ot" index={2} tone="navy" title="ชั่วโมงทำงานล่วงเวลา (OT)" subtitle="ต่อคน (ชม.) — ใช้คำนวณ NMH">
        <Controller
          name="otHours"
          control={control}
          render={({ field, fieldState }) => (
            <NumberStepper
              label="OT (ชม.)"
              value={field.value}
              onChange={field.onChange}
              max={24}
              step={0.5}
              unit="ชม."
              error={fieldState.error?.message}
            />
          )}
        />
      </SectionCard>

      <SectionCard
        id="sec-crew"
        index={3}
        tone="navy"
        title="ผู้ปฏิบัติงานช่วงบ่าย (ตามตำแหน่ง)"
        subtitle={
          report?.morningStatus === "submitted"
            ? `จำนวนคนทำงานช่วงบ่ายแยกตามประเภทงาน — เช้า ${report.totalHeadcount} คน (ปรับให้ตรงกับจริง)`
            : "จำนวนคนทำงานช่วงบ่ายแยกตามประเภทงาน — เช้าบ่ายอาจไม่เท่ากัน"
        }
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
          ประเภทงานช่วงบ่าย — กดเลือกแล้วฟอร์มของประเภทนั้นจะขึ้นมา (รายงานจะรวมทุกประเภทให้เอง)
        </Typography>
        <Controller
          name="disciplines"
          control={control}
          render={({ field }) => (
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
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
          <Typography variant="caption" color="error" sx={{ display: "block", mb: 1 }}>
            {formState.errors.disciplines.message}
          </Typography>
        ) : null}
        {picked.length === 0 ? <Alert severity="info">เลือกประเภทงานก่อน แล้วฟอร์มกำลังคนจะขึ้นมา</Alert> : null}
        <Stack spacing={2.5}>
          {picked.map((d) => (
            <EveningCrewBlock key={d} discipline={d} form={form} showTitle={picked.length > 1} />
          ))}
        </Stack>
      </SectionCard>

      <SectionCard id="sec-progress" index={4} tone="navy" title="ผลงานจริงรายอาคาร (Status % vs Plan %)" subtitle="ดึงแผนจากรายงานเช้า">
        {allocations.length === 0 ? (
          <Alert severity="info">
            ไม่มีแผนจากรายงานเช้า — ส่งรายงานบ่ายได้ตามปกติ (ถ้าต้องการบันทึกผลงานรายอาคาร ให้กรอกรายงานเช้าก่อน)
          </Alert>
        ) : (
          <Stack spacing={1.5}>
            {progress.fields.map((row, i) => (
              <ProgressRow key={row.id} index={i} control={control} allocation={allocations[i]!} />
            ))}
          </Stack>
        )}
      </SectionCard>

      <SectionCard
        id="sec-tomorrow"
        index={5}
        tone="navy"
        title="คำขอและแผนงานสำหรับวันพรุ่งนี้ (Tomorrow's Requests)"
        subtitle={`สำหรับ ${formatThaiDate(tomorrow)} — ใช้ในประชุมประสานงาน 17:00 ส่งพร้อมรายงานบ่าย`}
      >
        <SubHeading>แผนงานพรุ่งนี้ (Tomorrow Forecast Activities)</SubHeading>
        <ForecastActivities control={control} buildings={buildings} />
        <Divider sx={{ my: 2.5 }} />
        <SubHeading>ขอตรวจ QAQC</SubHeading>
        <RequestSection
          projectId={projectId}
          contractorId={contractor.id}
          reportDate={date}
          buildings={buildings}
          eveningSubmitted={false}
        />
        <Divider sx={{ my: 2.5 }} />
        <SubHeading>จองเครื่องจักร (Machine request)</SubHeading>
        <MachineryRequests control={control} buildings={buildings} ctx={ctx} />
        <Divider sx={{ my: 2.5 }} />
        <SubHeading>เครื่องมือ / อุปกรณ์ (Equipment request)</SubHeading>
        <EquipmentRequests control={control} buildings={buildings} />
        <Divider sx={{ my: 2.5 }} />
        <SubHeading>ขอใช้ / ปิดถนน (Road Usage)</SubHeading>
        {(report?.roadUsage ?? []).some((r) => r.adjusted) ? (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            EPS ปรับเวลาถนนบางรายการแล้ว ฟอร์มนี้แสดงเวลาที่คุณขอไว้ เมื่อส่งซ้ำ ระบบจะคงเวลาที่ EPS ปรับไว้
          </Alert>
        ) : null}
        <RoadUsageRequests control={control} buildings={buildings} ctx={ctx} />
        <Divider sx={{ my: 2.5 }} />
        <SubHeading>ใบอนุญาตงานเสี่ยง (Work Permits)</SubHeading>
        <PermitRequests control={control} buildings={buildings} projectId={projectId} contractorId={contractor.id} />
      </SectionCard>

      {/* Materials on site — future feature, hidden for now (schema/API/material-inputs kept). */}

      <SectionCard id="sec-sign" index={6} tone="navy" title="ลงนามยืนยัน (Digital Signature)">
        <Stack spacing={1.5}>
          <Controller
            name="signatureName"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Reporter name"
                size="small"
                fullWidth
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <SignaturePad
            hasExistingSignature={hasExistingSignature && watch("signatureData") === "existing"}
            onChange={(url) => setValue("signatureData", url ?? "", { shouldValidate: formState.isSubmitted })}
            error={formState.errors.signatureData?.message}
          />
        </Stack>
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
        <Button type="submit" fullWidth disabled={submit.isPending} sx={{ bgcolor: "navy.main" }}>
          {submit.isPending ? "กำลังส่ง…" : report?.eveningStatus === "submitted" ? "Save evening report changes" : "Submit evening report (Check-out)"}
        </Button>
      </Box>
    </Box>
  );
}

function ProgressRow({
  index,
  control,
  allocation,
}: {
  index: number;
  control: Control<EveningFormValues>;
  allocation: DailyReport["allocations"][number];
}) {
  const actual = useWatch({ control, name: `progress.${index}.actualPercent` });
  const plan = allocation.planPercent;
  // Without a stated plan there is nothing to be behind — actual % only.
  const behind = plan !== null && actual < plan;
  const when = allocation.startTime && allocation.endTime ? ` · ${allocation.startTime}–${allocation.endTime}` : "";
  return (
    <Card variant="outlined" sx={{ borderColor: behind ? "warning.main" : "divider" }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="body1" sx={{ fontWeight: 700 }}>
          {allocation.buildingName}
          <Chip size="small" label={allocation.discipline} sx={{ ml: 1, height: 20 }} />
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {allocation.workDescription} · {allocation.headcount} คน{when}
        </Typography>
        <Box sx={{ position: "relative", my: 1.5 }}>
          <LinearProgress
            variant="determinate"
            value={actual}
            color={behind ? "warning" : "success"}
            sx={{ height: 10, borderRadius: 5 }}
          />
          {plan !== null ? (
            // Plan marker
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                top: -3,
                bottom: -3,
                width: 2,
                bgcolor: "text.primary",
                left: `calc(${plan}% - 1px)`,
              }}
            />
          ) : null}
        </Box>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {plan !== null ? `แผน ${plan}%` : "ไม่ได้ระบุแผน"}
          </Typography>
          <Controller
            name={`progress.${index}.actualPercent`}
            control={control}
            render={({ field }) => (
              <NumberStepper label="ผลจริง (Status %)" value={field.value} onChange={field.onChange} max={100} step={5} unit="%" />
            )}
          />
        </Stack>
        {behind ? (
          <Box
            sx={{
              mt: 1.5,
              p: 1.5,
              border: 1.5,
              borderStyle: "dashed",
              borderColor: "warning.main",
              borderRadius: 2,
              bgcolor: "warning.light",
            }}
          >
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 18, color: "warning.dark" }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "warning.dark" }}>
                ต่ำกว่าแผน {(plan ?? 0) - actual}% — ระบุ Countermeasure
              </Typography>
            </Stack>
            <Controller
              name={`progress.${index}.countermeasure`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  placeholder="สาเหตุ + มาตรการแก้ไข เช่น วัสดุส่งช้า 2 ชม. เพิ่มคนพรุ่งนี้"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  sx={{ bgcolor: "background.paper" }}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
      {children}
    </Typography>
  );
}

// One discipline's afternoon crew: people by position + nationality/sex split.
function EveningCrewBlock({
  discipline,
  form,
  showTitle,
}: {
  discipline: Discipline;
  form: UseFormReturn<EveningFormValues>;
  showTitle: boolean;
}) {
  const { control, setValue, formState } = form;
  const crew = useWatch({ control, name: `crews.${discipline}` });
  const errors = formState.errors.crews?.[discipline];
  return (
    <Box>
      {showTitle ? (
        <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
          {disciplineLabel(discipline)}
        </Typography>
      ) : null}
      <CrewManpower
        value={crew}
        totalLabel={`${discipline} afternoon`}
        error={errors?.positions?.message ?? errors?.thaiMale?.message}
        onPositions={(next) => setValue(`crews.${discipline}.positions`, next, { shouldDirty: true, shouldValidate: formState.isSubmitted })}
        onSplit={(key, n) => setValue(`crews.${discipline}.${key}`, n, { shouldDirty: true, shouldValidate: formState.isSubmitted })}
      />
    </Box>
  );
}
