import AddIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Controller, useFieldArray, type Control } from "react-hook-form";
import type { EveningFormValues } from "../schemas/daily-report.schema.js";
import type { Building, ReportAllocation } from "../types/daily-report.types.js";
import { BuildingSelect } from "./building-select.js";
import { NumberStepper } from "./number-stepper.js";

// Evening OT, itemised: one row per building + task with its people and hours. No rows = no OT.
// Today's morning activities are offered as one-tap rows (building + task already filled).
export function OvertimeRows({
  control,
  buildings,
  activities,
}: {
  control: Control<EveningFormValues>;
  buildings: Building[];
  activities: ReportAllocation[];
}) {
  const rows = useFieldArray({ control, name: "overtime" });
  const add = (buildingId = "", task = "") => rows.append({ buildingId, task, workers: 1, hours: 2 });
  // One suggestion per building + task, in the morning's order.
  const suggestions = [...new Map(activities.map((a) => [`${a.buildingId}|${a.workDescription}`, a])).values()].slice(0, 8);

  return (
    <Stack spacing={1.5}>
      {rows.fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          ไม่มี OT วันนี้ — ถ้ามีคนทำต่อหลังเลิกงาน กด «เพิ่มรายการ OT»
        </Typography>
      ) : null}
      {rows.fields.map((row, i) => (
        <Card key={row.id} variant="outlined">
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  OT รายการที่ {i + 1}
                </Typography>
                <IconButton aria-label={`ลบ OT รายการที่ ${i + 1}`} onClick={() => rows.remove(i)}>
                  <DeleteOutlineOutlinedIcon />
                </IconButton>
              </Stack>
              <Controller
                name={`overtime.${i}.buildingId`}
                control={control}
                render={({ field, fieldState }) => (
                  <BuildingSelect label="อาคารที่ทำ" buildings={buildings} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
                )}
              />
              <Controller
                name={`overtime.${i}.task`}
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="งานที่ทำ"
                    placeholder="เช่น เทคอนกรีตฐานราก"
                    size="small"
                    fullWidth
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Controller
                  name={`overtime.${i}.workers`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <NumberStepper label="จำนวนคนที่ทำ OT" value={field.value} onChange={field.onChange} min={1} max={1000} unit="คน" error={fieldState.error?.message} />
                  )}
                />
                <Controller
                  name={`overtime.${i}.hours`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <NumberStepper label="ชั่วโมง OT (ต่อคน)" value={field.value} onChange={field.onChange} min={0.5} max={24} step={0.5} unit="ชม." error={fieldState.error?.message} />
                  )}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}

      {suggestions.length > 0 ? (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
            ทำ OT ต่อจากงานวันนี้? แตะเพื่อเพิ่ม
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {suggestions.map((a) => (
              <Chip
                key={a.id}
                variant="outlined"
                icon={<AddIcon />}
                label={`${a.buildingCode} · ${a.workDescription}`}
                onClick={() => add(a.buildingId, a.workDescription)}
                sx={{ maxWidth: "100%" }}
              />
            ))}
          </Stack>
        </Box>
      ) : null}

      <Button variant="outlined" startIcon={<AddIcon />} onClick={() => add()} sx={{ alignSelf: "flex-start" }}>
        เพิ่มรายการ OT
      </Button>
    </Stack>
  );
}
