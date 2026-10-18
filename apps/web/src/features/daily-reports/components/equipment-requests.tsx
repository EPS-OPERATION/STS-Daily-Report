import { SITE_EQUIPMENT_TYPES } from "@sts/shared";
import { Controller, useFieldArray, type Control } from "react-hook-form";
import type { EveningFormValues } from "../schemas/daily-report.schema.js";
import type { Building } from "@/features/buildings/index.js";
import { BuildingSelect } from "@/features/buildings/index.js";
import { NumberStepper } from "./number-stepper.js";
import AddIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

// Equipment / tools for tomorrow: quantity only, no time window.
export function EquipmentRequests({ control, buildings }: { control: Control<EveningFormValues>; buildings: Building[] }) {
  const rows = useFieldArray({ control, name: "equipmentRequests" });
  return (
    <Box>
      <Stack spacing={1.5}>
        {rows.fields.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            ไม่มีการขอเครื่องมือ/อุปกรณ์สำหรับพรุ่งนี้
          </Typography>
        ) : null}
        {rows.fields.map((row, i) => (
          <Card key={row.id} variant="outlined">
            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name={`equipmentRequests.${i}.equipmentType`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Autocomplete
                        freeSolo
                        options={[...SITE_EQUIPMENT_TYPES]}
                        value={field.value}
                        onChange={(_, v) => field.onChange(v ?? "")}
                        onInputChange={(_, v) => field.onChange(v)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Tools / equipment (type to add)"
                            size="small"
                            fullWidth
                            error={Boolean(fieldState.error)}
                            helperText={fieldState.error?.message}
                            slotProps={{ htmlInput: { maxLength: 120 } }}
                          />
                        )}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 10, sm: 5 }}>
                  <Controller
                    name={`equipmentRequests.${i}.qty`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <NumberStepper label="Qty" value={field.value} onChange={field.onChange} min={1} max={500} error={fieldState.error?.message} />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 2, sm: 1 }} sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <IconButton aria-label="Delete equipment request" onClick={() => rows.remove(i)}>
                    <DeleteOutlineOutlinedIcon />
                  </IconButton>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name={`equipmentRequests.${i}.buildingId`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <BuildingSelect label="Building" buildings={buildings} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name={`equipmentRequests.${i}.purpose`}
                    control={control}
                    render={({ field }) => <TextField {...field} label="Purpose" size="small" fullWidth />}
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
        onClick={() => rows.append({ equipmentType: "", qty: 1, buildingId: "", purpose: "" })}
      >
        ขอเครื่องมือ / อุปกรณ์
      </Button>
    </Box>
  );
}
