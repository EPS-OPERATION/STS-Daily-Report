import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { zodResolver } from "@hookform/resolvers/zod";
import { ACCIDENT_CATEGORIES, type MachineType, type PermitType, type SiteEquipmentType } from "@sts/shared";
import MenuItem from "@mui/material/MenuItem";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { HttpError } from "@/services/http/client.js";
import { useEnsureDraft, useSubmitEvening } from "../hooks/use-daily-report-mutations.js";
import { useWeeklySummary } from "../hooks/use-daily-report-queries.js";
import { eveningSchema, type EveningFormValues } from "../schemas/daily-report.schema.js";
import type { Building, DailyReport, ReportContractor } from "../types/daily-report.types.js";
import { addDaysIso, formatThaiDate, mondayOf } from "../utils/dates.js";
import { NumberStepper } from "./number-stepper.js";
import { PhotoSection } from "./photo-section.js";
import { RequestSection } from "./request-section.js";
import { SectionCard } from "./section-card.js";
import { SignaturePad } from "./signature-pad.js";
import { EquipmentRequests, MachineryRequests, PermitRequests, RoadUsageRequests } from "./tomorrow-requests.js";
import { MaterialInputs } from "./material-inputs.js";

// Evening check-out. Independent of the morning shift: without a morning report there
// is simply no plan to report actuals against. Also where tomorrow's requests are made.
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
  const ensureDraft = useEnsureDraft(projectId);
  const tomorrow = addDaysIso(date, 1);
  // Other contractors' bookings for tomorrow → live clash hints on each request row.
  const tomorrowWeek = useWeeklySummary(projectId, mondayOf(tomorrow));
  const ctx = { targetDate: tomorrow, contractorId: contractor.id, others: tomorrowWeek.data?.data ?? null };
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
        equipmentType: e.equipmentType as SiteEquipmentType,
        qty: e.qty,
        buildingId: e.buildingId,
        purpose: e.purpose ?? "",
      })),
      permits: (report?.permits ?? []).map((p) => ({
        permitType: p.permitType,
        otherLabel: p.otherLabel ?? "",
        buildingId: p.buildingId,
        workers: p.workers,
      })),
      roadUsage: (report?.roadUsage ?? []).map((r) => ({
        roadLocation: r.roadLocation,
        buildingId: r.buildingId,
        startTime: r.startTime,
        endTime: r.endTime,
        purpose: r.purpose,
      })),
      materials: (report?.materials ?? []).map((m) => ({
        name: m.materialName,
        qty: m.qty,
        unit: m.unit,
      })),
      progress: allocations.map((a) => ({
        allocationId: a.id,
        planPercent: a.planPercent,
        actualPercent: a.actualPercent ?? a.planPercent,
        countermeasure: a.countermeasure ?? "",
      })),
      signatureName: "",
      signatureData: "",
    },
    mode: "onTouched",
  });
  const { control, handleSubmit, setValue, formState } = form;
  const progress = useFieldArray({ control, name: "progress" });
  const accident = useWatch({ control, name: "accidentOccurred" });

  const onSubmit = handleSubmit((v) => {
    submit.mutate(
      {
        date,
        contractorId: contractor.id,
        otHours: v.otHours,
        accidentOccurred: v.accidentOccurred ?? false,
        accidentNote: v.accidentOccurred ? v.accidentNote?.trim() : undefined,
        accidentCategory: v.accidentOccurred ? (v.accidentCategory ?? undefined) : undefined,
        progress: v.progress.map((p) => ({
          allocationId: p.allocationId,
          actualPercent: p.actualPercent,
          countermeasure: p.countermeasure?.trim() || undefined,
        })),
        signatureName: v.signatureName.trim(),
        signatureData: v.signatureData,
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
          equipmentType: e.equipmentType as SiteEquipmentType,
          qty: e.qty,
          purpose: e.purpose?.trim() || undefined,
        })),
        permits: v.permits.map((p) => ({
          buildingId: p.buildingId,
          permitType: p.permitType as PermitType,
          otherLabel: p.permitType === "other" ? p.otherLabel?.trim() : undefined,
          workers: p.workers,
        })),
        roadUsage: v.roadUsage.map((r) => ({
          buildingId: r.buildingId,
          roadLocation: r.roadLocation.trim(),
          startTime: r.startTime,
          endTime: r.endTime,
          purpose: r.purpose.trim(),
        })),
        materials: v.materials.map((m) => ({
          name: m.name.trim(),
          qty: m.qty,
          unit: m.unit.trim(),
        })),
      },
      { onSuccess: onSubmitted },
    );
  });

  const serverError = submit.error instanceof HttpError ? submit.error : null;

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <SectionCard index={1} tone="navy" title="ความปลอดภัย" subtitle="ใช้นับวันปลอดอุบัติเหตุ">
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
                aria-label="เกิดอุบัติเหตุวันนี้หรือไม่"
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
                label="ประเภทเหตุการณ์"
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
                label="รายละเอียดเหตุการณ์ / การดำเนินการ"
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

      <SectionCard index={2} tone="navy" title="ชั่วโมงทำงานล่วงเวลา (OT)" subtitle="ต่อคน (ชม.) — ใช้คำนวณ NMH">
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

      <SectionCard index={3} tone="navy" title="ผลงานจริงรายอาคาร (Status % vs Plan %)" subtitle="ดึงแผนจากรายงานเช้า">
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

      <SectionCard index={4} tone="navy" title="รูปถ่ายหน้างาน" subtitle="แยกหมวด Progress / Safety — อัปโหลดทันทีที่เลือก">
        <PhotoSection
          reportId={report?.id ?? null}
          photos={report?.photos ?? []}
          locked={false}
          ensureReportId={async () => (await ensureDraft.mutateAsync({ date, contractorId: contractor.id })).data.id}
        />
      </SectionCard>

      <SectionCard
        index={5}
        tone="navy"
        title="คำขอและแผนงานสำหรับวันพรุ่งนี้ (Tomorrow's Requests)"
        subtitle={`สำหรับ ${formatThaiDate(tomorrow)} — ใช้ในประชุมประสานงาน 17:00 ส่งพร้อมรายงานบ่าย`}
      >
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
        <RoadUsageRequests control={control} buildings={buildings} ctx={ctx} />
        <Divider sx={{ my: 2.5 }} />
        <SubHeading>ใบอนุญาตงานเสี่ยง (Work Permits)</SubHeading>
        <PermitRequests control={control} buildings={buildings} />
      </SectionCard>

      <SectionCard
        index={6}
        tone="navy"
        title="วัสดุหน้างาน (Materials on site)"
        subtitle="วัสดุที่รับเข้าหรือใช้ไปวันนี้ — กรอกเฉพาะที่มี"
      >
        <MaterialInputs control={control} />
      </SectionCard>

      <SectionCard index={7} tone="navy" title="ลงนามยืนยัน (Digital Signature)">
        <Stack spacing={1.5}>
          <Controller
            name="signatureName"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="ชื่อผู้รายงาน"
                size="small"
                fullWidth
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <SignaturePad
            onChange={(url) => setValue("signatureData", url ?? "", { shouldValidate: formState.isSubmitted })}
            error={formState.errors.signatureData?.message}
          />
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
        <Button type="submit" size="large" fullWidth disabled={submit.isPending} sx={{ bgcolor: "navy.main" }}>
          {submit.isPending ? "กำลังส่ง…" : "ส่งรายงานบ่าย (Check-out)"}
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
  const behind = actual < allocation.planPercent;
  return (
    <Card variant="outlined" sx={{ borderColor: behind ? "warning.main" : "divider" }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="body1" sx={{ fontWeight: 700 }}>
          {allocation.buildingName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {allocation.workDescription} · {allocation.headcount} คน
        </Typography>
        <Box sx={{ position: "relative", my: 1.5 }}>
          <LinearProgress
            variant="determinate"
            value={actual}
            color={behind ? "warning" : "success"}
            sx={{ height: 10, borderRadius: 5 }}
          />
          {/* Plan marker */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              top: -3,
              bottom: -3,
              width: 2,
              bgcolor: "text.primary",
              left: `calc(${allocation.planPercent}% - 1px)`,
            }}
          />
        </Box>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={2}>
          <Typography variant="body2" color="text.secondary">
            แผน {allocation.planPercent}%
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
                ต่ำกว่าแผน {allocation.planPercent - actual}% — ระบุ Countermeasure
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
