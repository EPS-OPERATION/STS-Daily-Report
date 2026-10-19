import { DISCIPLINE_CODES, type Discipline } from "@sts/shared";
import { Controller, useWatch, type Control } from "react-hook-form";
import { type EveningFormValues } from "../schemas/daily-report.schema.js";
import type { Building } from "@/features/buildings/index.js";
import { BuildingSelect } from "@/features/buildings/index.js";
import { NumberStepper } from "./number-stepper.js";
import { TimeSelect } from "@/components/ui/time-select.js";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export function AdditionalWorkRow({
  index,
  control,
  buildings,
  onRemove,
  activeDisciplines,
}: {
  index: number;
  control: Control<EveningFormValues>;
  buildings: Building[];
  onRemove: () => void;
  activeDisciplines: Discipline[];
}) {
  const path = `additionalAllocations.${index}` as const;
  const [actual, timed, activityStart] = useWatch({
    control,
    name: [`${path}.actualPercent`, `${path}.timed`, `${path}.startTime`],
  });

  const availableDisciplines = activeDisciplines.length > 0 ? activeDisciplines : DISCIPLINE_CODES;

  return (
    <Card variant="outlined" sx={{ borderColor: "info.main", bgcolor: "background.paper" }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack spacing={1.5}>
          {/* Header row: Discipline + Building + Tag + Delete */}
          <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ flexGrow: 1, gap: 1 }}>
              <Chip
                label="งานเพิ่มเติม / นอกแผน"
                size="small"
                color="info"
                variant="filled"
                sx={{ fontWeight: 600, fontSize: "0.75rem" }}
              />
              <Controller
                name={`${path}.discipline`}
                control={control}
                render={({ field }) => (
                  <Select
                    size="small"
                    value={field.value ?? availableDisciplines[0]}
                    onChange={field.onChange}
                    sx={{ minWidth: 80, height: 32 }}
                  >
                    {availableDisciplines.map((d) => (
                      <MenuItem key={d} value={d}>
                        {d}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </Stack>
            <IconButton aria-label="ลบงานเพิ่มเติม" onClick={onRemove} size="small" sx={{ color: "text.secondary" }}>
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>

          {/* Building select */}
          <Controller
            name={`${path}.buildingId`}
            control={control}
            render={({ field, fieldState }) => (
              <BuildingSelect
                label="อาคาร / พื้นที่"
                buildings={buildings}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          {/* Work description */}
          <Controller
            name={`${path}.workDescription`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="รายละเอียดงานที่ทำเพิ่ม"
                placeholder="เช่น ติดตั้งท่อ Conduit เพิ่มเติม Line B–C"
                size="small"
                fullWidth
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />

          {/* Headcount and Time window */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
            <Controller
              name={`${path}.headcount`}
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
            {timed ? (
              <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                <Controller
                  name={`${path}.startTime`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <TimeSelect
                      label="เวลาเริ่ม"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      step={30}
                      fullWidth={false}
                      sx={{ width: 155 }}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  name={`${path}.endTime`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <TimeSelect
                      label="เวลาสิ้นสุด"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      step={30}
                      after={activityStart}
                      fullWidth={false}
                      sx={{ width: 155 }}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <IconButton
                  size="small"
                  aria-label="เอาเวลาออก"
                  onClick={() => {
                    control._reset({
                      ...control._formValues,
                      additionalAllocations: control._formValues.additionalAllocations.map((a: any, i: number) =>
                        i === index ? { ...a, timed: false, startTime: "", endTime: "" } : a,
                      ),
                    });
                  }}
                >
                  <CloseOutlinedIcon fontSize="small" />
                </IconButton>
              </Stack>
            ) : (
              <Controller
                name={`${path}.timed`}
                control={control}
                render={({ field }) => (
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<ScheduleOutlinedIcon fontSize="small" />}
                    onClick={() => field.onChange(true)}
                    sx={{ color: "text.secondary" }}
                  >
                    ระบุเวลาทำงาน
                  </Button>
                )}
              />
            )}
          </Stack>

          {/* Progress bar and actual percent stepper */}
          <Box sx={{ mt: 1 }}>
            <Box sx={{ my: 1 }}>
              <LinearProgress
                variant="determinate"
                value={typeof actual === "number" ? actual : 0}
                color="info"
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                (ไม่มีแผนเช้า — บันทึกผลจริง)
              </Typography>
              <Controller
                name={`${path}.actualPercent`}
                control={control}
                render={({ field }) => (
                  <NumberStepper
                    label="ผลจริง (Status %)"
                    value={field.value ?? 100}
                    onChange={field.onChange}
                    max={100}
                    step={5}
                    unit="%"
                  />
                )}
              />
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
