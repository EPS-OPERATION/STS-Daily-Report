import { Controller, useWatch, type Control } from "react-hook-form";
import { type EveningFormValues } from "../schemas/daily-report.schema.js";
import type { DailyReport } from "../types/daily-report.types.js";
import { NumberStepper } from "./number-stepper.js";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export function ProgressRow({
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
