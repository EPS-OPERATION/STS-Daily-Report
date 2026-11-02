import { MACHINE_TYPES, timeWindowsOverlap, type MachineType } from "@sts/shared";
import { Controller, useFieldArray, useWatch, type Control } from "react-hook-form";
import type { EveningFormValues } from "../schemas/daily-report.schema.js";
import type { Building } from "@/features/buildings/index.js";
import { BuildingSelect } from "@/features/buildings/index.js";
import AddIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { norm } from "./request-fields.js";
import type { TomorrowContext } from "./request-fields.js";
import { TimeWindow } from "./request-fields.js";
import { ClashNote } from "./request-fields.js";

export function MachineryRequests({
  control,
  buildings,
  ctx,
}: {
  control: Control<EveningFormValues>;
  buildings: Building[];
  ctx: TomorrowContext;
}) {
  const rows = useFieldArray({ control, name: "machinery" });
  return (
    <Box>
      <Stack spacing={1.5}>
        {rows.fields.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            ไม่มีการจองเครื่องจักรสำหรับพรุ่งนี้
          </Typography>
        ) : null}
        {rows.fields.map((row, i) => (
          <MachineryRow key={row.id} index={i} control={control} buildings={buildings} ctx={ctx} onRemove={() => rows.remove(i)} />
        ))}
      </Stack>
      <Button
        startIcon={<AddIcon />}
        variant="outlined"
        fullWidth
        sx={{ mt: 1.5, borderStyle: "dashed" }}
        onClick={() =>
          rows.append({
            machineType: "" as MachineType,
            unitTag: "",
            buildingId: "",
            allDay: true,
            startTime: "08:00",
            endTime: "17:00",
            purpose: "",
          })
        }
      >
        จองเครื่องจักร
      </Button>
    </Box>
  );
}

export function MachineryRow({
  index,
  control,
  buildings,
  ctx,
  onRemove,
}: {
  index: number;
  control: Control<EveningFormValues>;
  buildings: Building[];
  ctx: TomorrowContext;
  onRemove: () => void;
}) {
  const v = useWatch({ control, name: `machinery.${index}` });
  // No window = whole day (same rule as the server).
  const [vs, ve] = v?.allDay ? ["00:00", "23:59"] : [v?.startTime ?? "", v?.endTime ?? ""];
  const clashes = (ctx.others?.machinery ?? []).filter(
    (b) =>
      b.targetDate === ctx.targetDate &&
      b.contractorId !== ctx.contractorId &&
      b.machineType === v?.machineType &&
      vs < ve &&
      timeWindowsOverlap(vs, ve, b.startTime ?? "00:00", b.endTime ?? "23:59") &&
      (!norm(v.unitTag) || !b.unitTag || norm(v.unitTag) === norm(b.unitTag)),
  );
  const sameUnit = clashes.some((b) => norm(v?.unitTag) && norm(b.unitTag) === norm(v?.unitTag));
  return (
    <Card variant="outlined" sx={{ borderColor: clashes.length ? (sameUnit ? "error.main" : "warning.main") : "divider" }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <Controller
              name={`machinery.${index}.machineType`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField select label="Machinery type" size="small" fullWidth {...field} error={Boolean(fieldState.error)} helperText={fieldState.error?.message}>
                  {MACHINE_TYPES.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={{ xs: 10, sm: 4 }}>
            <Controller
              name={`machinery.${index}.unitTag`}
              control={control}
              render={({ field }) => <TextField {...field} label="Machine no." placeholder="CR-01" size="small" fullWidth />}
            />
          </Grid>
          <Grid size={{ xs: 2, sm: 1 }} sx={{ display: "flex", justifyContent: "flex-end" }}>
            <IconButton aria-label="Delete booking" onClick={onRemove}>
              <DeleteOutlineOutlinedIcon />
            </IconButton>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name={`machinery.${index}.buildingId`}
              control={control}
              render={({ field, fieldState }) => (
                <BuildingSelect label="Building in use" buildings={buildings} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex", alignItems: "center" }}>
            <Controller
              name={`machinery.${index}.allDay`}
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label={field.value ? "All day (no time)" : "Set time range"}
                />
              )}
            />
          </Grid>
          {v?.allDay ? null : <TimeWindow control={control} base={`machinery.${index}`} />}
          <Grid size={12}>
            <Controller
              name={`machinery.${index}.purpose`}
              control={control}
              render={({ field }) => <TextField {...field} label="Purpose" placeholder="เช่น ยก Structure line A–D" size="small" fullWidth />}
            />
          </Grid>
        </Grid>
        {clashes.length ? (
          <ClashNote severe={sameUnit}>
            {sameUnit ? "ชนกับการจองเครื่องเดียวกัน: " : "เวลาเหลื่อมกับ (ไม่ระบุหมายเลขเครื่อง): "}
            {clashes.map((b) => `${b.contractorCode} @ ${b.buildingCode} ${b.startTime ? `${b.startTime}–${b.endTime}` : "ทั้งวัน"}`).join(", ")}
          </ClashNote>
        ) : null}
      </CardContent>
    </Card>
  );
}
