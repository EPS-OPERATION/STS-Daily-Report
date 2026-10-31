import { isSectionValue } from "../utils/location.js";
import { type Discipline } from "@sts/shared";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { Controller, useWatch, type UseFieldArrayReturn, type UseFormReturn } from "react-hook-form";
import { type MorningFormValues } from "../schemas/daily-report.schema.js";
import type { Building } from "@/features/buildings/index.js";
import { BuildingSelect } from "@/features/buildings/index.js";
import { TimeSelect } from "@/components/ui/time-select.js";
import { newActivity } from "./morning-helpers.js";
import AddIcon from "@mui/icons-material/AddOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

type Activities = UseFieldArrayReturn<MorningFormValues, `crews.${Discipline}.allocations`>;

// One line per activity, like a spreadsheet: building · work · people · time · plan %.
// Desktop = table columns; phone = two compact lines per row. Enter in the last row adds the next one.
const GRID = {
  display: "grid",
  columnGap: 1,
  rowGap: 0.75,
  alignItems: "start",
  gridTemplateColumns: { xs: "minmax(0, 1fr) 64px 40px 40px", sm: "minmax(130px, 1fr) minmax(0, 1.7fr) 60px 70px 40px 40px" },
  gridTemplateAreas: {
    xs: `"bld ppl clk del" "work plan plan plan" "time time time time"`,
    sm: `"bld work ppl plan clk del" "time time time time time time"`,
  },
} as const;

const digits = (raw: string) => raw.replace(/\D/g, "").slice(0, 4);

export function ActivityTable({
  discipline,
  form,
  buildings,
  activities,
}: {
  discipline: Discipline;
  form: UseFormReturn<MorningFormValues>;
  buildings: Building[];
  activities: Activities;
}) {
  const { getValues, setFocus } = form;
  const count = activities.fields.length;

  // Enter moves down a row; on the last row it adds one (same building) and puts the cursor in its work cell.
  // A new row's input exists only after the re-render, so its focus waits for the row count to change.
  const focusRow = useRef<number | null>(null);
  useEffect(() => {
    const target = focusRow.current;
    if (target === null || target >= count) return;
    focusRow.current = null;
    setFocus(`crews.${discipline}.allocations.${target}.workDescription`);
  }, [count, discipline, setFocus]);
  const nextRow = (i: number) => {
    if (i < count - 1) return setFocus(`crews.${discipline}.allocations.${i + 1}.workDescription`);
    if (count >= 32) return;
    const where = getValues(`crews.${discipline}.allocations.${i}.buildingId`);
    focusRow.current = i + 1;
    activities.append({ ...newActivity(0), buildingId: isSectionValue(where) ? "" : where }, { shouldFocus: false });
  };
  const onEnter = (i: number) => (e: KeyboardEvent) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault(); // never submit the form from a cell
    nextRow(i);
  };

  return (
    <Box>
      <Box
        sx={{
          ...GRID,
          display: { xs: "none", sm: "grid" },
          px: 1,
          pb: 0.75,
          borderBottom: 1,
          borderColor: "divider",
          "& > *": { typography: "caption", fontWeight: 700, color: "text.secondary" },
        }}
      >
        <Box sx={{ gridArea: "bld" }}>อาคาร (Building)</Box>
        <Box sx={{ gridArea: "work" }}>รายละเอียดงาน (Work details)</Box>
        <Box sx={{ gridArea: "ppl" }}>คน</Box>
        <Box sx={{ gridArea: "plan" }}>แผน %</Box>
        <Box sx={{ gridArea: "clk" }}>เวลา</Box>
      </Box>
      <Stack divider={<Box sx={{ borderBottom: 1, borderColor: "divider" }} />}>
        {/* Route-section rows (33 kV …) live in their own block under the table. */}
        {activities.fields.map((row, i) => isSectionValue(row.buildingId) ? null : (
          <ActivityLine
            key={row.id}
            index={i}
            discipline={discipline}
            form={form}
            buildings={buildings}
            canRemove={activities.fields.filter((f) => !isSectionValue(f.buildingId)).length > 1}
            onRemove={() => activities.remove(i)}
            onEnter={onEnter(i)}
          />
        ))}
      </Stack>
      <Button
        fullWidth
        variant="text"
        startIcon={<AddIcon />}
        disabled={count >= 32}
        onClick={() => nextRow(count - 1)}
        sx={{ mt: 1, justifyContent: "flex-start", border: 1, borderStyle: "dashed", borderColor: "divider", minHeight: 44 }}
      >
        เพิ่มแถว (Add activity) — หรือกด Enter ในแถวสุดท้าย
      </Button>
    </Box>
  );
}

function ActivityLine({
  index,
  discipline,
  form,
  buildings,
  canRemove,
  onRemove,
  onEnter,
}: {
  index: number;
  discipline: Discipline;
  form: UseFormReturn<MorningFormValues>;
  buildings: Building[];
  canRemove: boolean;
  onRemove: () => void;
  onEnter: (e: KeyboardEvent) => void;
}) {
  const { control, setValue, formState } = form;
  const path = `crews.${discipline}.allocations.${index}` as const;
  const [timed, hasPlan, start] = useWatch({ control, name: [`${path}.timed`, `${path}.hasPlan`, `${path}.startTime`] });
  const rowErrors = formState.errors.crews?.[discipline]?.allocations?.[index];
  const message = rowErrors?.buildingId?.message ?? rowErrors?.workDescription?.message ?? rowErrors?.headcount?.message ?? rowErrors?.endTime?.message;
  const validate = formState.isSubmitted;

  return (
    <Box sx={{ py: 1, px: { sm: 1 } }}>
      <Box sx={GRID}>
        <Box sx={{ gridArea: "bld", minWidth: 0 }}>
          <Controller
            name={`${path}.buildingId`}
            control={control}
            render={({ field, fieldState }) => (
              <BuildingSelect dense label={`อาคาร แถว ${index + 1}`} buildings={buildings} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />
        </Box>
        <Box sx={{ gridArea: "work", minWidth: 0 }}>
          <Controller
            name={`${path}.workDescription`}
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField
                {...field}
                inputRef={ref}
                placeholder="งานที่ทำ เช่น ยกติดตั้ง Structure line A–D"
                size="small"
                fullWidth
                onKeyDown={onEnter}
                error={Boolean(fieldState.error)}
                slotProps={{ htmlInput: { "aria-label": `รายละเอียดงาน แถว ${index + 1}`, maxLength: 500 } }}
              />
            )}
          />
        </Box>
        <Box sx={{ gridArea: "ppl" }}>
          <Controller
            name={`${path}.headcount`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                value={field.value ? String(field.value) : ""}
                onChange={(e) => field.onChange(Number(digits(e.target.value)) || 0)}
                onBlur={field.onBlur}
                inputRef={field.ref}
                onKeyDown={onEnter}
                onFocus={(e) => e.target.select()}
                placeholder="คน"
                size="small"
                error={Boolean(fieldState.error)}
                slotProps={{ htmlInput: { inputMode: "numeric", "aria-label": `จำนวนคน แถว ${index + 1}`, style: { textAlign: "center" } } }}
              />
            )}
          />
        </Box>
        <Box sx={{ gridArea: "clk", display: "flex", justifyContent: "center" }}>
          <IconButton
            aria-label={timed ? `ทั้งวัน (ไม่ระบุเวลา) แถว ${index + 1}` : `ระบุเวลา แถว ${index + 1}`}
            aria-pressed={timed}
            color={timed ? "primary" : "default"}
            onClick={() => setValue(`${path}.timed`, !timed, { shouldDirty: true, shouldValidate: validate })}
          >
            <ScheduleOutlinedIcon />
          </IconButton>
        </Box>
        <Box sx={{ gridArea: "time", minWidth: 0, display: timed ? "block" : "none" }}>
          {timed ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
              sx={{ pt: 0.5, width: { xs: "100%", sm: "auto" } }}
            >
              <Typography variant="caption" color="text.secondary">
                เวลา
              </Typography>
              {(["startTime", "endTime"] as const).map((k) => (
                <Controller
                  key={k}
                  name={`${path}.${k}`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <TimeSelect
                      label={k === "startTime" ? "เริ่ม" : "ถึง"}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      step={30}
                      after={k === "endTime" ? start : undefined}
                      fullWidth
                      sx={{ minWidth: 0, width: { xs: "100%", sm: 116 }, "& .MuiAutocomplete-inputRoot": { pr: "10px !important" } }}
                      error={Boolean(fieldState.error)}
                    />
                  )}
                />
              ))}
              <IconButton size="small" aria-label="ทั้งวัน (ไม่ระบุเวลา)" onClick={() => setValue(`${path}.timed`, false, { shouldDirty: true, shouldValidate: validate })} sx={{ alignSelf: { xs: "flex-end", sm: "center" } }}>
                <CloseOutlinedIcon fontSize="small" />
              </IconButton>
            </Stack>
          ) : null}
        </Box>
        <Box sx={{ gridArea: "plan" }}>
          <Controller
            name={`${path}.planPercent`}
            control={control}
            render={({ field }) => (
              <TextField
                value={hasPlan ? String(field.value) : ""}
                onChange={(e) => {
                  const raw = digits(e.target.value);
                  setValue(`${path}.hasPlan`, raw !== "", { shouldDirty: true });
                  field.onChange(Math.min(100, Number(raw) || 0));
                }}
                onBlur={field.onBlur}
                onFocus={(e) => e.target.select()}
                placeholder="—"
                size="small"
                slotProps={{
                  htmlInput: { inputMode: "numeric", "aria-label": `แผน % แถว ${index + 1}`, style: { textAlign: "center" } },
                  input: { endAdornment: hasPlan ? <Typography variant="caption">%</Typography> : undefined },
                }}
              />
            )}
          />
        </Box>
        <Box sx={{ gridArea: "del", display: "flex", justifyContent: "center" }}>
          <IconButton aria-label={`ลบแถว ${index + 1}`} onClick={onRemove} disabled={!canRemove}>
            <DeleteOutlineOutlinedIcon />
          </IconButton>
        </Box>
      </Box>
      {message ? (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
          แถว {index + 1}: {message}
        </Typography>
      ) : null}
    </Box>
  );
}
