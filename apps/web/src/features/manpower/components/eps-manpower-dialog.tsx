import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PositionCode } from "@sts/shared";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/form-dialog.js";
import { TimeSelect } from "@/components/ui/time-select.js";
import { BuildingSelect, useBuildings } from "@/features/buildings/index.js";
import { CrewManpower } from "@/features/daily-reports/index.js";
import { formatThaiDate, todayIso } from "@/lib/dates.js";
import { HttpError } from "@/services/http/client.js";
import { useEpsManpowerEntry, useSaveEpsManpower } from "../hooks/use-eps-manpower.js";
import {
  emptyEpsPositions,
  epsManpowerSchema,
  isBlankEpsAllocation,
  type EpsAllocationValues,
  type EpsManpowerFormValues,
} from "../schemas/eps-manpower.schema.js";
import { Figure } from "./manpower-parts.js";

const DEFAULT_START = "08:00";
const DEFAULT_END = "17:00";

function hoursBetween(start: string, end: string) {
  const [sh = 0, sm = 0] = start.split(":").map(Number);
  const [eh = 0, em = 0] = end.split(":").map(Number);
  const diff = (eh * 60 + em - (sh * 60 + sm)) / 60;
  // Same rule as the contractor form: a full day loses the 1 h lunch break.
  return diff <= 0 ? 0 : Math.round((diff > 5 ? diff - 1 : diff) * 2) / 2;
}

const blankAllocation = (): EpsAllocationValues => ({ buildingId: "", headcount: 0, workDescription: "" });

function blankValues(): EpsManpowerFormValues {
  return {
    startTime: DEFAULT_START,
    endTime: DEFAULT_END,
    workHours: hoursBetween(DEFAULT_START, DEFAULT_END),
    otHours: 0,
    positions: emptyEpsPositions(),
    thaiMale: 0,
    thaiFemale: 0,
    foreignMale: 0,
    foreignFemale: 0,
    allocations: [blankAllocation()],
  };
}

// EPS owner company does not send contractor Daily Reports/Requests. This dialog writes one daily
// manpower entry for EPS so it appears in the same Manpower charts as every contractor.
export function EpsManpowerDialog({
  open,
  projectId,
  defaultDate,
  onClose,
}: {
  open: boolean;
  projectId: string | null;
  defaultDate: string;
  onClose: () => void;
}) {
  const [date, setDate] = useState(defaultDate || todayIso());
  const [validationError, setValidationError] = useState<string | null>(null);
  const buildings = useBuildings(projectId);
  const entryQuery = useEpsManpowerEntry(projectId, date, open);
  const save = useSaveEpsManpower(projectId);
  const form = useForm<EpsManpowerFormValues>({
    resolver: zodResolver(epsManpowerSchema),
    defaultValues: blankValues(),
    mode: "onTouched",
  });
  const { control, handleSubmit, reset, setValue, formState } = form;
  const allocations = useFieldArray({ control, name: "allocations" });
  const positions = useWatch({ control, name: "positions" }) ?? emptyEpsPositions();
  const split = useWatch({ control, name: ["thaiMale", "thaiFemale", "foreignMale", "foreignFemale"] });
  const startTime = useWatch({ control, name: "startTime" });
  const endTime = useWatch({ control, name: "endTime" });
  const workHours = useWatch({ control, name: "workHours" });
  const otHours = useWatch({ control, name: "otHours" });
  const allocationRows = useWatch({ control, name: "allocations" }) ?? [];

  // Start a fresh entry whenever the dialog opens. Loading an existing day is handled below.
  useEffect(() => {
    if (!open) return;
    setDate(defaultDate || todayIso());
    reset(blankValues());
    setValidationError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The GET response always describes the current `date`; fill the form from it.
  useEffect(() => {
    if (!open || !entryQuery.isSuccess) return;
    const entry = entryQuery.data?.data.entry;
    if (!entry) {
      reset(blankValues());
      return;
    }
    reset({
      startTime: entry.startTime ?? DEFAULT_START,
      endTime: entry.endTime ?? DEFAULT_END,
      workHours: entry.workHours ?? hoursBetween(entry.startTime ?? DEFAULT_START, entry.endTime ?? DEFAULT_END),
      otHours: entry.otHours ?? 0,
      positions: { ...emptyEpsPositions(), ...Object.fromEntries(entry.positions.map((p) => [p.position, p.headcount])) },
      thaiMale: entry.thaiMale,
      thaiFemale: entry.thaiFemale,
      foreignMale: entry.foreignMale,
      foreignFemale: entry.foreignFemale,
      allocations: entry.allocations.length
        ? entry.allocations.map((a) => ({
            buildingId: a.buildingId,
            headcount: a.headcount,
            workDescription: a.workDescription,
          }))
        : [blankAllocation()],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date, entryQuery.isSuccess, entryQuery.data]);

  const totalPositions = useMemo(
    () => Object.values(positions).reduce<number>((s, n) => s + (Number.isFinite(n) ? n : 0), 0),
    [positions],
  );
  const manDays = totalPositions;
  const nmh = Math.round(manDays * ((workHours ?? 0) + (otHours ?? 0)) * 10) / 10;
  const loadError = entryQuery.error instanceof HttpError ? entryQuery.error : null;
  const saveError = save.error instanceof HttpError ? save.error : null;

  const changeDate = (next: string) => {
    if (next === date) return;
    setDate(next);
    reset(blankValues());
    setValidationError(null);
  };

  const changeTime = (field: "startTime" | "endTime", value: string) => {
    const nextStart = field === "startTime" ? value : startTime;
    const nextEnd = field === "endTime" ? value : endTime;
    setValue(field, value, { shouldDirty: true, shouldValidate: true });
    if (nextStart && nextEnd && nextStart < nextEnd) {
      setValue("workHours", hoursBetween(nextStart, nextEnd), { shouldDirty: true, shouldValidate: true });
    }
  };

  const onSubmit = handleSubmit(
    async (v) => {
      if (!projectId) return;
      setValidationError(null);
      try {
        await save.mutateAsync({
          date,
          startTime: v.startTime,
          endTime: v.endTime,
          workHours: v.workHours,
          otHours: v.otHours,
          positions: Object.entries(v.positions)
            .filter(([, n]) => n > 0)
            .map(([position, headcount]) => ({ position: position as PositionCode, headcount })),
          thaiMale: v.thaiMale,
          thaiFemale: v.thaiFemale,
          foreignMale: v.foreignMale,
          foreignFemale: v.foreignFemale,
          allocations: v.allocations
            .filter((a) => !isBlankEpsAllocation(a))
            .map((a) => ({
              buildingId: a.buildingId,
              headcount: a.headcount,
              workDescription: a.workDescription.trim(),
            })),
        });
        toast.success(entryQuery.data?.data.entry ? "บันทึกการแก้ไขกำลังคน EPS แล้ว" : "บันทึกกำลังคน EPS แล้ว");
        onClose();
      } catch {
        // The mutation error is shown inline below.
      }
    },
    () => setValidationError("กรุณาตรวจสอบข้อมูลที่ยังไม่ครบหรือไม่ถูกต้อง"),
  );

  const busy = save.isPending || entryQuery.isFetching;
  const disabled = busy || Boolean(loadError);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      busy={save.isPending}
      maxWidth="md"
      dividers
      mobileFullScreen
      title={
        <Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            {entryQuery.data?.data.entry ? "แก้ไขกำลังคน EPS" : "บันทึกกำลังคน EPS"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {formatThaiDate(date)} · หนึ่งรายการต่อวัน (ใช้ในกราฟ Manpower)
          </Typography>
        </Box>
      }
      onSubmit={onSubmit}
      actions={
        <>
          <Button color="inherit" variant="outlined" onClick={onClose} disabled={save.isPending}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" disabled={disabled}>
            {save.isPending ? "กำลังบันทึก…" : "บันทึกกำลังคน EPS"}
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        {loadError ? (
          <Alert severity="error">
            โหลดข้อมูลกำลังคน EPS ไม่สำเร็จ: {loadError.message}
          </Alert>
        ) : null}
        {saveError ? <Alert severity="error">บันทึกไม่สำเร็จ: {saveError.message}</Alert> : null}
        {validationError ? <Alert severity="warning">{validationError}</Alert> : null}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <DatePicker
            label="วันที่"
            value={dayjs(date)}
            onChange={(v) => v?.isValid() && changeDate(v.format("YYYY-MM-DD"))}
            format="D MMM YYYY"
            slotProps={{ textField: { size: "small", sx: { width: 190 } } }}
          />
          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
            <Figure label="Man-days" value={manDays} />
            <Figure label="NMH" value={nmh} />
            <Figure label="คน" value={totalPositions} />
          </Stack>
        </Stack>

        <Box>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            1. เวลาทำงาน
          </Typography>
          <Grid container spacing={1.5} alignItems="flex-start">
            <Grid size={{ xs: 6, sm: 3 }}>
              <TimeSelect label="เริ่ม" value={startTime} onChange={(v) => changeTime("startTime", v)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TimeSelect label="สิ้นสุด" value={endTime} onChange={(v) => changeTime("endTime", v)} after={startTime} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="ชั่วโมงปกติ / คน"
                type="number"
                size="small"
                fullWidth
                value={workHours}
                onChange={(e) => setValue("workHours", Math.min(24, Math.max(0, Number(e.target.value))), { shouldDirty: true, shouldValidate: true })}
                slotProps={{ htmlInput: { min: 0, max: 24, step: 0.5 } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                label="OT / คน (ชม.)"
                type="number"
                size="small"
                fullWidth
                value={otHours}
                onChange={(e) => setValue("otHours", Math.min(24, Math.max(0, Number(e.target.value))), { shouldDirty: true, shouldValidate: true })}
                slotProps={{ htmlInput: { min: 0, max: 24, step: 0.5 } }}
              />
            </Grid>
          </Grid>
          {formState.errors.endTime ? (
            <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.75 }}>
              {formState.errors.endTime.message}
            </Typography>
          ) : null}
        </Box>

        <Divider />

        <Box>
          <Typography variant="h6">2. กำลังคนตามตำแหน่ง</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            จำนวนตามตำแหน่งต้องเท่ากับผลรวมสัญชาติ/เพศ
          </Typography>
          <CrewManpower
            value={{
              positions,
              thaiMale: split[0] ?? 0,
              thaiFemale: split[1] ?? 0,
              foreignMale: split[2] ?? 0,
              foreignFemale: split[3] ?? 0,
            }}
            onPositions={(next) =>
              setValue("positions", { ...emptyEpsPositions(), ...next }, { shouldDirty: true, shouldValidate: true })
            }
            onSplit={(key, n) => setValue(key, n, { shouldDirty: true, shouldValidate: true })}
            totalLabel="รวมกำลังคน EPS"
          />
          {formState.errors.positions ? (
            <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.75 }}>
              {formState.errors.positions.message}
            </Typography>
          ) : null}
          {formState.errors.thaiMale ? (
            <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.75 }}>
              {formState.errors.thaiMale.message}
            </Typography>
          ) : null}
        </Box>

        <Divider />

        <Box>
          <Typography variant="h6">3. อาคารที่ทำงาน (ไม่บังคับ)</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            ใช้สำหรับกราฟแยกอาคาร — ถ้าทำงานทั้งไซต์ ไม่ต้องเพิ่มอาคาร
          </Typography>
          <Stack spacing={1.5}>
            {allocations.fields.map((row, i) => (
              <Grid container spacing={1.5} alignItems="flex-start" key={row.id}>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <BuildingSelect
                    label="อาคาร"
                    buildings={buildings.data?.data ?? []}
                    value={allocationRows[i]?.buildingId ?? ""}
                    onChange={(id) => setValue(`allocations.${i}.buildingId`, id, { shouldDirty: true, shouldValidate: true })}
                    error={formState.errors.allocations?.[i]?.buildingId?.message}
                  />
                </Grid>
                <Grid size={{ xs: 8, sm: 4 }}>
                  <TextField
                    label="รายละเอียดงาน"
                    size="small"
                    fullWidth
                    value={allocationRows[i]?.workDescription ?? ""}
                    onChange={(e) => setValue(`allocations.${i}.workDescription`, e.target.value, { shouldDirty: true, shouldValidate: true })}
                    error={Boolean(formState.errors.allocations?.[i]?.workDescription)}
                    helperText={formState.errors.allocations?.[i]?.workDescription?.message}
                  />
                </Grid>
                <Grid size={{ xs: 4, sm: 2 }}>
                  <TextField
                    label="คน"
                    type="number"
                    size="small"
                    fullWidth
                    value={allocationRows[i]?.headcount ?? 0}
                    onChange={(e) =>
                      setValue(`allocations.${i}.headcount`, Math.min(5000, Math.max(0, Number(e.target.value))), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    slotProps={{ htmlInput: { min: 0, max: 5000, step: 1 } }}
                    error={Boolean(formState.errors.allocations?.[i]?.headcount)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 1 }} sx={{ display: "flex", justifyContent: { xs: "flex-end", sm: "flex-start" } }}>
                  <IconButton
                    aria-label="ลบแถวอาคาร"
                    onClick={() => {
                      if (allocations.fields.length > 1) allocations.remove(i);
                      else setValue(`allocations.${i}`, blankAllocation(), { shouldDirty: true });
                    }}
                  >
                    <DeleteOutlineOutlinedIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
          </Stack>
          <Button
            variant="text"
            startIcon={<AddOutlinedIcon />}
            onClick={() => allocations.append(blankAllocation())}
            disabled={allocations.fields.length >= 32}
            sx={{ mt: 1, justifyContent: "flex-start", border: 1, borderStyle: "dashed", borderColor: "divider", minHeight: 44 }}
          >
            เพิ่มอาคาร
          </Button>
          {formState.errors.allocations?.message ? (
            <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.75 }}>
              {formState.errors.allocations.message}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </FormDialog>
  );
}
