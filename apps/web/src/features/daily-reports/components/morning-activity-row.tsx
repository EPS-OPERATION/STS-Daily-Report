import { type Discipline } from "@sts/shared";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { type MorningFormValues } from "../schemas/daily-report.schema.js";
import type { Building } from "@/features/buildings/index.js";
import { BuildingSelect } from "@/features/buildings/index.js";
import { NumberStepper } from "./number-stepper.js";
import { TimeSelect } from "@/components/ui/time-select.js";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

export function ActivityRow({
  index,
  discipline,
  form,
  buildings,
  canRemove,
  onRemove,
}: {
  index: number;
  discipline: Discipline;
  form: UseFormReturn<MorningFormValues>;
  buildings: Building[];
  canRemove: boolean;
  onRemove: () => void;
}) {
  const { control, setValue } = form;
  const path = `crews.${discipline}.allocations.${index}` as const;
  const [timed, hasPlan, activityStart] = useWatch({ control, name: [`${path}.timed`, `${path}.hasPlan`, `${path}.startTime`] });

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Controller
              name={`${path}.buildingId`}
              control={control}
              render={({ field, fieldState }) => (
                <BuildingSelect label="Building" buildings={buildings} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              )}
            />
            <IconButton aria-label="Delete activity" onClick={onRemove} disabled={!canRemove} sx={{ mt: 0.5 }}>
              <DeleteOutlineOutlinedIcon />
            </IconButton>
          </Stack>
          <Controller
            name={`${path}.workDescription`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Work details"
                placeholder="เช่น ยกติดตั้ง Structure line A–D"
                size="small"
                fullWidth
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Stack direction="row" spacing={2} alignItems="flex-end" flexWrap="wrap" useFlexGap>
            <Controller
              name={`${path}.headcount`}
              control={control}
              render={({ field, fieldState }) => (
                <NumberStepper label="Headcount" value={field.value} onChange={field.onChange} min={1} unit="คน" error={fieldState.error?.message} />
              )}
            />
            {timed ? (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.25}
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {(["startTime", "endTime"] as const).map((k) => (
                  <Controller
                    key={k}
                    name={`${path}.${k}`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <TimeSelect
                        label={k === "startTime" ? "เวลาเริ่ม" : "เวลาสิ้นสุด"}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        step={30}
                        after={k === "endTime" ? activityStart : undefined}
                        sx={{ width: { xs: "100%", sm: 155 }, minWidth: { xs: 0, sm: 155 } }}
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                ))}
              </Stack>
            ) : null}
            {hasPlan ? (
              <Controller
                name={`${path}.planPercent`}
                control={control}
                render={({ field }) => (
                  <NumberStepper label="แผนงาน (Plan %)" value={field.value} onChange={field.onChange} max={100} step={5} unit="%" />
                )}
              />
            ) : null}
          </Stack>
          {/* Optional extras: time window and plan % */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
            <Button
              variant={timed ? "contained" : "outlined"}
              color={timed ? "primary" : "inherit"}
              startIcon={<ScheduleOutlinedIcon fontSize="small" sx={{ color: timed ? "common.white" : "primary.main" }} />}
              endIcon={timed ? <CloseOutlinedIcon sx={{ fontSize: 16 }} /> : undefined}
              onClick={() => setValue(`${path}.timed`, !timed, { shouldDirty: true, shouldValidate: true })}
              sx={{
                borderRadius: 2,
                px: 1.75,
                py: 0.75,
                fontWeight: 700,
                fontSize: 13,
                textTransform: "none",
                bgcolor: timed ? "primary.main" : "grey.50",
                borderColor: timed ? "primary.main" : "grey.300",
                color: timed ? "common.white" : "text.primary",
                boxShadow: timed ? "0 2px 4px rgba(11,77,139,0.2)" : "none",
                "&:hover": {
                  bgcolor: timed ? "primary.dark" : "primary.light",
                  borderColor: "primary.main",
                  color: timed ? "common.white" : "primary.main",
                },
              }}
            >
              {timed ? "ระบุเวลา (คลิกเพื่อยกเลิก)" : "+ ระบุเวลา"}
            </Button>
            <Button
              variant={hasPlan ? "contained" : "outlined"}
              color={hasPlan ? "primary" : "inherit"}
              startIcon={<PercentOutlinedIcon fontSize="small" sx={{ color: hasPlan ? "common.white" : "primary.main" }} />}
              endIcon={hasPlan ? <CloseOutlinedIcon sx={{ fontSize: 16 }} /> : undefined}
              onClick={() => setValue(`${path}.hasPlan`, !hasPlan, { shouldDirty: true })}
              sx={{
                borderRadius: 2,
                px: 1.75,
                py: 0.75,
                fontWeight: 700,
                fontSize: 13,
                textTransform: "none",
                bgcolor: hasPlan ? "primary.main" : "grey.50",
                borderColor: hasPlan ? "primary.main" : "grey.300",
                color: hasPlan ? "common.white" : "text.primary",
                boxShadow: hasPlan ? "0 2px 4px rgba(11,77,139,0.2)" : "none",
                "&:hover": {
                  bgcolor: hasPlan ? "primary.dark" : "primary.light",
                  borderColor: "primary.main",
                  color: hasPlan ? "common.white" : "primary.main",
                },
              }}
            >
              {hasPlan ? "แผนงาน % (คลิกเพื่อยกเลิก)" : "+ แผนงาน %"}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
