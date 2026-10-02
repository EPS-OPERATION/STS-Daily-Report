import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Controller, useFieldArray, type Control } from "react-hook-form";
import type { EveningFormValues } from "../schemas/daily-report.schema.js";

// Common site materials (suggestions only — contractors can type anything).
export const MATERIAL_SUGGESTIONS = [
  "ปูนซีเมนต์",
  "ทรายหยาบ",
  "หินคลุก",
  "หิน 3/4",
  "เหล็กเส้น",
  "คอนกรีตผสมเสร็จ",
  "ไม้แบบ",
  "ลวดผูกเหล็ก",
  "อิฐบล็อก",
  "ปูนก่อ",
  "ท่อ PVC",
  "สายไฟ",
] as const;

export const MATERIAL_UNITS = ["pcs", "bag", "ton", "kg", "m", "m³", "liter", "roll", "box", "set", "truck"] as const;

// Paper form "Add Material on site": Items | Material on site / Type | Qty.
export function MaterialInputs({ control }: { control: Control<EveningFormValues> }) {
  const rows = useFieldArray({ control, name: "materials" });
  return (
    <Box>
      <Stack spacing={1.5}>
        {rows.fields.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            ไม่มีวัสดุที่รายงานวันนี้ — กดปุ่มด้านล่างเพื่อเพิ่มรายการ
          </Typography>
        ) : null}
        {rows.fields.map((row, i) => (
          <Card key={row.id} variant="outlined">
            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  รายการที่ {i + 1}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <IconButton size="small" aria-label={`ลบวัสดุรายการที่ ${i + 1}`} onClick={() => rows.remove(i)}>
                  <DeleteOutlineOutlinedIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name={`materials.${i}.name`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Autocomplete
                        freeSolo
                        options={[...MATERIAL_SUGGESTIONS]}
                        value={field.value}
                        onChange={(_, v) => field.onChange(v ?? "")}
                        onInputChange={(_, v) => field.onChange(v)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="วัสดุหน้างาน / Material"
                            size="small"
                            fullWidth
                            error={Boolean(fieldState.error)}
                            helperText={fieldState.error?.message}
                          />
                        )}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Controller
                    name={`materials.${i}.qty`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Qty / ปริมาณ"
                        size="small"
                        fullWidth
                        type="number"
                        inputProps={{ min: 0, step: "any" }}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        onBlur={field.onBlur}
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Controller
                    name={`materials.${i}.unit`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        select
                        label="หน่วย"
                        size="small"
                        fullWidth
                        value={field.value}
                        onChange={field.onChange}
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                      >
                        {MATERIAL_UNITS.map((u) => (
                          <MenuItem key={u} value={u}>
                            {u}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
      </Stack>
      <Button
        startIcon={<AddIcon />}
        variant="outlined"
        fullWidth
        sx={{ mt: 1.5, borderStyle: "dashed" }}
        onClick={() => rows.append({ name: "", qty: 1, unit: "pcs" })}
      >
        เพิ่มวัสดุ (Add Material)
      </Button>
    </Box>
  );
}
