import { TimeSelect } from "@/components/ui/time-select.js";
import { Controller, useWatch, type Control } from "react-hook-form";
import type { EveningFormValues } from "../schemas/daily-report.schema.js";
import type { WeeklySummary } from "@/features/report-summaries/index.js";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export const norm = (s: string | null | undefined) => (s ?? "").trim().toUpperCase().replace(/\s+/g, " ");

// Other contractors' bookings for the same target date, so clashes show before
// the evening report is sent (the server re-checks after).
export interface TomorrowContext {
  projectId: string;
  targetDate: string;
  contractorId: string;
  others: Pick<WeeklySummary, "machinery" | "roads"> | null;
}

export function TimeWindow({
  control,
  base,
  order,
}: {
  control: Control<EveningFormValues>;
  base: `machinery.${number}` | `roadUsage.${number}`;
  order?: number;
}) {
  const start = useWatch({ control, name: `${base}.startTime` }) as string | undefined;
  return (
    <>
      {(["startTime", "endTime"] as const).map((k) => (
        <Grid key={k} size={6} order={order ? { sm: order } : undefined}>
          <Controller
            name={`${base}.${k}`}
            control={control}
            render={({ field, fieldState }) => (
              <TimeSelect
                label={k === "startTime" ? "เวลาเริ่ม" : "เวลาสิ้นสุด"}
                value={(field.value as string) ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                after={k === "endTime" ? start : undefined}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
        </Grid>
      ))}
    </>
  );
}

export function ClashNote({ severe, children }: { severe?: boolean; children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ mt: 1.25 }}>
      <WarningAmberOutlinedIcon sx={{ fontSize: 18, color: severe ? "error.main" : "warning.dark", mt: 0.1 }} />
      <Typography variant="caption" sx={{ color: severe ? "error.main" : "warning.dark", fontWeight: 600 }}>
        {children}
      </Typography>
    </Stack>
  );
}
