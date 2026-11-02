import { Controller } from "react-hook-form";
import { NumberStepper } from "./number-stepper.js";
import { SectionCard } from "./section-card.js";
import { DisciplineChips } from "./discipline-picker.js";
import { TimeSelect } from "@/components/ui/time-select.js";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import type { UseMorningFormState } from "../hooks/use-morning-form.js";

export function MorningGeneralSection({ ed }: { ed: UseMorningFormState }) {
  const { control, formState, dayStart, picked, syncHours } = ed;
  return (
    <SectionCard id="sec-general" index={1} title="ข้อมูลทั่วไป" subtitle="เวลาทำงานใช้คำนวณชั่วโมงแรงงาน (NMH)">
      <Grid container spacing={1.5} alignItems="flex-end">
        {(["startTime", "endTime"] as const).map((k) => (
          <Grid key={k} size={{ xs: 6, sm: 4 }}>
            <Controller
              name={k}
              control={control}
              render={({ field, fieldState }) => (
                <TimeSelect
                  label={k === "startTime" ? "เวลาเริ่ม" : "เวลาสิ้นสุด"}
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    syncHours();
                  }}
                  onBlur={field.onBlur}
                  after={k === "endTime" ? dayStart : undefined}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>
        ))}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Controller
            name="workHours"
            control={control}
            render={({ field }) => (
              <NumberStepper label="Normal hours / person" value={field.value} onChange={field.onChange} max={24} step={0.5} unit="ชม." />
            )}
          />
        </Grid>
      </Grid>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, mb: 0.75 }}>
        ประเภทงานวันนี้ (เลือกได้หลายอย่าง)
      </Typography>
      <Controller
        name="disciplines"
        control={control}
        render={({ field }) => <DisciplineChips value={field.value} onChange={field.onChange} attention={picked.length === 0} />}
      />
      {formState.errors.disciplines?.message ? (
        <Typography variant="caption" color="error">
          {formState.errors.disciplines.message}
        </Typography>
      ) : null}
    </SectionCard>
  );
}
