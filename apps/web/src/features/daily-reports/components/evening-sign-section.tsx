import { Controller, useWatch } from "react-hook-form";
import { SectionCard } from "./section-card.js";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { UseEveningFormState } from "../hooks/use-evening-form.js";

// Electronic confirmation instead of a drawn signature (PDPA): typed name + a tick, required on EVERY save, also
// when editing a report already sent. Accounts may be shared, so the typed name says who confirmed; the report keeps
// that name, the time and the sending account. No signature image is collected.
export function EveningSignSection({ ed }: { ed: UseEveningFormState }) {
  const { control } = ed;
  const name = useWatch({ control, name: "signatureName" })?.trim();
  return (
    <SectionCard id="sec-sign" index={6} tone="navy" title="ยืนยันรายงาน (Confirmation)">
      <Stack spacing={1.5}>
        <Controller
          name="signatureName"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="ชื่อผู้ยืนยันรายงาน (ชื่อ-นามสกุลของคุณ)"
              size="small"
              fullWidth
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message ?? "หลายคนใช้บัญชีเดียวกันได้ — ใส่ชื่อของคนที่ยืนยันครั้งนี้"}
            />
          )}
        />
        <Controller
          name="confirmed"
          control={control}
          render={({ field: { value, onChange, ref }, fieldState }) => (
            <div>
              <FormControlLabel
                control={<Checkbox checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} inputRef={ref} />}
                label={`ข้าพเจ้า${name ? ` ${name}` : ""} ยืนยันว่าข้อมูลในรายงานนี้ถูกต้อง`}
                sx={{ alignItems: "flex-start", "& .MuiCheckbox-root": { pt: 0.5 } }}
              />
              {fieldState.error ? <FormHelperText error>{fieldState.error.message}</FormHelperText> : null}
            </div>
          )}
        />
        <Typography variant="caption" color="text.secondary">
          ต้องติ๊กยืนยันทุกครั้งที่ส่งหรือแก้ไข · ระบบเก็บชื่อผู้ยืนยัน บัญชี และเวลา เป็นหลักฐาน — ไม่เก็บภาพลายเซ็น
        </Typography>
      </Stack>
    </SectionCard>
  );
}
