import { Controller, useController, useFieldArray, type Control } from "react-hook-form";
import type { EveningFormValues } from "../schemas/daily-report.schema.js";
import type { Building } from "@/features/buildings/index.js";
import { BuildingSelect } from "@/features/buildings/index.js";
import AddIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

// Tomorrow Forecast Activities (paper form R003 table): what the crew will work on tomorrow and where.
export function ForecastActivities({ control, buildings }: { control: Control<EveningFormValues>; buildings: Building[] }) {
  const rows = useFieldArray({ control, name: "forecasts" });
  const { fieldState } = useController({ control, name: "forecasts" });
  const errorMsg = fieldState.error?.message;
  return (
    <Box>
      {rows.fields.length === 0 ? (
        <Typography variant="body2" color={errorMsg ? "error" : "text.secondary"} sx={{ mb: 1, fontWeight: errorMsg ? 600 : 400 }}>
          {errorMsg ?? "ยังไม่มีแผนงาน — เพิ่มงานที่จะทำพรุ่งนี้และพื้นที่ (บังคับ)"}
        </Typography>
      ) : null}
      <Stack spacing={1.5}>
        {rows.fields.map((row, i) => (
          <Card key={row.id} variant="outlined">
            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Grid container spacing={1.5} alignItems="flex-start">
                <Grid size={{ xs: 10, sm: 7 }}>
                  <Controller
                    name={`forecasts.${i}.description`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label={`Item ${i + 1} — work details`}
                        placeholder="เช่น Scaffolding erection"
                        size="small"
                        fullWidth
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 2, sm: 1 }} sx={{ display: "flex", justifyContent: "flex-end" }} order={{ sm: 3 }}>
                  <IconButton aria-label={`Delete plan item ${i + 1}`} onClick={() => rows.remove(i)}>
                    <DeleteOutlineOutlinedIcon />
                  </IconButton>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }} order={{ sm: 2 }}>
                  <Controller
                    name={`forecasts.${i}.buildingId`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <BuildingSelect label="Area" buildings={buildings} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
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
        disabled={rows.fields.length >= 20}
        onClick={() => rows.append({ description: "", buildingId: "" })}
      >
        Add tomorrow's plan
      </Button>
    </Box>
  );
}
