import { ACCIDENT_CATEGORIES } from "@sts/shared";
import { Controller } from "react-hook-form";
import { SectionCard } from "./section-card.js";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import type { UseEveningFormState } from "../hooks/use-evening-form.js";

export function EveningSafetySection({ ed }: { ed: UseEveningFormState }) {
  const { control, accident } = ed;
  return (
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
  );
}
