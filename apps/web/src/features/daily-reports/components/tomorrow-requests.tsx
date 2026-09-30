import AddIcon from "@mui/icons-material/Add";
import AddRoadOutlinedIcon from "@mui/icons-material/AddRoadOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { MACHINE_TYPES, PERMIT_TYPES, timeWindowsOverlap, type MachineType, type PermitType } from "@sts/shared";
import { Controller, useFieldArray, useWatch, type Control } from "react-hook-form";
import type { EveningFormValues } from "../schemas/daily-report.schema.js";
import type { Building, WeeklySummary } from "../types/daily-report.types.js";
import { BuildingSelect } from "./building-select.js";
import { NumberStepper } from "./number-stepper.js";
import { PERMIT_ICONS } from "./permit-meta.js";

const ROAD_PURPOSES = ["Crane outrigger setup", "Concrete mixer staging", "Material delivery", "Heavy equipment move"];

const norm = (s: string | null | undefined) => (s ?? "").trim().toUpperCase().replace(/\s+/g, " ");

// Other contractors' bookings for the same target date, so clashes show before
// the evening report is sent (the server re-checks after).
export interface TomorrowContext {
  targetDate: string;
  contractorId: string;
  others: Pick<WeeklySummary, "machinery" | "roads"> | null;
}

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
          rows.append({ machineType: "" as MachineType, unitTag: "", buildingId: "", startTime: "08:00", endTime: "17:00" })
        }
      >
        จองเครื่องจักร
      </Button>
    </Box>
  );
}

function MachineryRow({
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
  const clashes = (ctx.others?.machinery ?? []).filter(
    (b) =>
      b.targetDate === ctx.targetDate &&
      b.contractorId !== ctx.contractorId &&
      b.machineType === v?.machineType &&
      v.startTime < v.endTime &&
      timeWindowsOverlap(v.startTime, v.endTime, b.startTime, b.endTime) &&
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
                <TextField select label="ประเภทเครื่องจักร" size="small" fullWidth {...field} error={Boolean(fieldState.error)} helperText={fieldState.error?.message}>
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
              render={({ field }) => <TextField {...field} label="หมายเลขเครื่อง" placeholder="CR-01" size="small" fullWidth />}
            />
          </Grid>
          <Grid size={{ xs: 2, sm: 1 }} sx={{ display: "flex", justifyContent: "flex-end" }}>
            <IconButton aria-label="ลบการจอง" onClick={onRemove}>
              <DeleteOutlineOutlinedIcon />
            </IconButton>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name={`machinery.${index}.buildingId`}
              control={control}
              render={({ field, fieldState }) => (
                <BuildingSelect label="อาคารที่ใช้งาน" buildings={buildings} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              )}
            />
          </Grid>
          <TimeWindow control={control} base={`machinery.${index}`} />
        </Grid>
        {clashes.length ? (
          <ClashNote severe={sameUnit}>
            {sameUnit ? "ชนกับการจองเครื่องเดียวกัน: " : "เวลาเหลื่อมกับ (ไม่ระบุหมายเลขเครื่อง): "}
            {clashes.map((b) => `${b.contractorCode} @ ${b.buildingCode} ${b.startTime}–${b.endTime}`).join(", ")}
          </ClashNote>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function RoadUsageRequests({
  control,
  buildings,
  ctx,
}: {
  control: Control<EveningFormValues>;
  buildings: Building[];
  ctx: TomorrowContext;
}) {
  const rows = useFieldArray({ control, name: "roadUsage" });
  return (
    <Box>
      <Stack spacing={1.5}>
        {rows.fields.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            ไม่มีการขอใช้/ปิดถนนสำหรับพรุ่งนี้
          </Typography>
        ) : null}
        {rows.fields.map((row, i) => (
          <RoadRow key={row.id} index={i} control={control} buildings={buildings} ctx={ctx} onRemove={() => rows.remove(i)} />
        ))}
      </Stack>
      <Button
        startIcon={<AddRoadOutlinedIcon />}
        variant="outlined"
        fullWidth
        sx={{ mt: 1.5, borderStyle: "dashed" }}
        onClick={() => rows.append({ roadLocation: "", buildingId: "", startTime: "08:00", endTime: "10:00", purpose: "" })}
      >
        ขอใช้ / ปิดถนน
      </Button>
    </Box>
  );
}

function RoadRow({
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
  const v = useWatch({ control, name: `roadUsage.${index}` });
  const knownRoads = [...new Set((ctx.others?.roads ?? []).map((r) => r.roadLocation))];
  const clashes = (ctx.others?.roads ?? []).filter(
    (r) =>
      r.targetDate === ctx.targetDate &&
      r.contractorId !== ctx.contractorId &&
      norm(v?.roadLocation) !== "" &&
      norm(r.roadLocation) === norm(v?.roadLocation) &&
      v.startTime < v.endTime &&
      timeWindowsOverlap(v.startTime, v.endTime, r.startTime, r.endTime),
  );
  return (
    <Card variant="outlined" sx={{ borderColor: clashes.length ? "error.main" : "divider" }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 10, sm: 6 }}>
            <Controller
              name={`roadUsage.${index}.roadLocation`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="ถนน / ช่องทาง"
                  placeholder="เช่น Road R2 (Boiler–ACC)"
                  size="small"
                  fullWidth
                  slotProps={{ htmlInput: { list: `roads-${index}` } }}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
            <datalist id={`roads-${index}`}>
              {knownRoads.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Grid>
          <Grid size={{ xs: 2, sm: 1 }} sx={{ display: "flex", justifyContent: "flex-end" }} order={{ sm: 3 }}>
            <IconButton aria-label="ลบคำขอใช้ถนน" onClick={onRemove}>
              <DeleteOutlineOutlinedIcon />
            </IconButton>
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }} order={{ sm: 2 }}>
            <Controller
              name={`roadUsage.${index}.buildingId`}
              control={control}
              render={({ field, fieldState }) => (
                <BuildingSelect label="อาคารที่อยู่ติด" buildings={buildings} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              )}
            />
          </Grid>
          <Grid size={12} order={{ sm: 4 }}>
            <Controller
              name={`roadUsage.${index}.purpose`}
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <TextField
                    {...field}
                    label="วัตถุประสงค์"
                    size="small"
                    fullWidth
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                    {ROAD_PURPOSES.map((p) => (
                      <Chip key={p} size="small" label={p} variant="outlined" onClick={() => field.onChange(p)} />
                    ))}
                  </Stack>
                </>
              )}
            />
          </Grid>
          <Box sx={{ display: "contents" }}>
            <TimeWindow control={control} base={`roadUsage.${index}`} order={5} />
          </Box>
        </Grid>
        {clashes.length ? (
          <ClashNote severe>
            ถนนนี้ถูกขอใช้ช่วงเวลาเดียวกัน: {clashes.map((r) => `${r.contractorCode} ${r.startTime}–${r.endTime} (${r.purpose})`).join(", ")}
          </ClashNote>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function PermitRequests({ control, buildings }: { control: Control<EveningFormValues>; buildings: Building[] }) {
  const rows = useFieldArray({ control, name: "permits" });
  return (
    <Box>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 1.5 }}>
        {PERMIT_TYPES.map((p) => {
          const Icon = PERMIT_ICONS[p.code];
          return (
            <Chip
              key={p.code}
              icon={<Icon style={{ fontSize: 16 }} />}
              label={p.label}
              variant="outlined"
              onClick={() => rows.append({ permitType: p.code, otherLabel: "", buildingId: "", workers: 1 })}
              sx={{ minHeight: 36 }}
            />
          );
        })}
      </Stack>
      <Stack spacing={1.5}>
        {rows.fields.map((row, i) => (
          <PermitRow key={row.id} index={i} control={control} buildings={buildings} onRemove={() => rows.remove(i)} />
        ))}
      </Stack>
    </Box>
  );
}

function PermitRow({
  index,
  control,
  buildings,
  onRemove,
}: {
  index: number;
  control: Control<EveningFormValues>;
  buildings: Building[];
  onRemove: () => void;
}) {
  const type = useWatch({ control, name: `permits.${index}.permitType` }) as PermitType;
  const meta = PERMIT_TYPES.find((p) => p.code === type);
  const Icon = PERMIT_ICONS[type] ?? PERMIT_ICONS.other;
  return (
    <Card variant="outlined" sx={{ borderColor: "warning.main" }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Icon sx={{ color: "warning.dark" }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {meta?.label ?? type}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {meta?.labelTh}
              </Typography>
            </Box>
            <IconButton aria-label="ลบใบอนุญาต" onClick={onRemove}>
              <DeleteOutlineOutlinedIcon />
            </IconButton>
          </Stack>
          {type === "other" ? (
            <Controller
              name={`permits.${index}.otherLabel`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} label="ชื่องานเสี่ยง" size="small" fullWidth error={Boolean(fieldState.error)} helperText={fieldState.error?.message} />
              )}
            />
          ) : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-end" }}>
            <Controller
              name={`permits.${index}.buildingId`}
              control={control}
              render={({ field, fieldState }) => (
                <BuildingSelect label="อาคาร" buildings={buildings} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              )}
            />
            <Controller
              name={`permits.${index}.workers`}
              control={control}
              render={({ field, fieldState }) => (
                <NumberStepper label="จำนวนคน" value={field.value} onChange={field.onChange} min={1} unit="คน" error={fieldState.error?.message} />
              )}
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function TimeWindow({
  control,
  base,
  order,
}: {
  control: Control<EveningFormValues>;
  base: `machinery.${number}` | `roadUsage.${number}`;
  order?: number;
}) {
  return (
    <>
      {(["startTime", "endTime"] as const).map((k) => (
        <Grid key={k} size={{ xs: 6, sm: 3 }} order={order ? { sm: order } : undefined}>
          <Controller
            name={`${base}.${k}`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                value={field.value as string}
                onChange={field.onChange}
                onBlur={field.onBlur}
                type="time"
                label={k === "startTime" ? "เริ่ม" : "สิ้นสุด"}
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 900 } }}
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

function ClashNote({ severe, children }: { severe?: boolean; children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ mt: 1.25 }}>
      <WarningAmberOutlinedIcon sx={{ fontSize: 18, color: severe ? "error.main" : "warning.dark", mt: 0.1 }} />
      <Typography variant="caption" sx={{ color: severe ? "error.main" : "warning.dark", fontWeight: 600 }}>
        {children}
      </Typography>
    </Stack>
  );
}
