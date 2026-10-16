import AddIcon from "@mui/icons-material/AddOutlined";
import AddRoadOutlinedIcon from "@mui/icons-material/AddRoadOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  MACHINE_TYPES,
  PERMIT_TYPES,
  SITE_EQUIPMENT_TYPES,
  roadPlacesMeet,
  timeWindowsOverlap,
  type MachineType,
  type PermitType,
} from "@sts/shared";
import { useState } from "react";
import { Controller, useController, useFieldArray, useWatch, type Control } from "react-hook-form";
import { RoadRoutePicker } from "./road-route-picker.js";
import type { EveningFormValues, MorningFormValues } from "../schemas/daily-report.schema.js";
import type { Building, WeeklySummary } from "../types/daily-report.types.js";
import { BuildingSelect } from "./building-select.js";
import { NumberStepper } from "./number-stepper.js";
import { StandardItemsPanel, type StandardItem } from "@/features/report-standard-items/index.js";
import { PERMIT_ICONS, permitLabel } from "./permit-meta.js";

const ROAD_PURPOSES = ["Crane outrigger setup", "Concrete mixer staging", "Material delivery", "Heavy equipment move"];

const norm = (s: string | null | undefined) => (s ?? "").trim().toUpperCase().replace(/\s+/g, " ");

// Other contractors' bookings for the same target date, so clashes show before
// the evening report is sent (the server re-checks after).
export interface TomorrowContext {
  projectId: string;
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

export function RoadUsageRequests({
  control,
  buildings: _buildings,
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
          <RoadRow key={row.id} index={i} control={control} ctx={ctx} onRemove={() => rows.remove(i)} />
        ))}
      </Stack>
      <Button
        startIcon={<AddRoadOutlinedIcon />}
        variant="outlined"
        fullWidth
        sx={{ mt: 1.5, borderStyle: "dashed" }}
        onClick={() => rows.append({ roadLocation: "", buildingId: "", startTime: "08:00", endTime: "10:00", purpose: "", segmentIds: [], route: null })}
      >
        ขอใช้ / ปิดถนน
      </Button>
    </Box>
  );
}

function RoadRow({
  index,
  control,
  ctx,
  onRemove,
}: {
  index: number;
  control: Control<EveningFormValues>;
  ctx: TomorrowContext;
  onRemove: () => void;
}) {
  const v = useWatch({ control, name: `roadUsage.${index}` });
  const [picking, setPicking] = useState(false);
  const segmentIds = useController({ control, name: `roadUsage.${index}.segmentIds` });
  const route = useController({ control, name: `roadUsage.${index}.route` });
  const roadName = useController({ control, name: `roadUsage.${index}.roadLocation` });
  const knownRoads = [...new Set((ctx.others?.roads ?? []).map((r) => r.roadLocation))];
  const clashes = (ctx.others?.roads ?? []).filter(
    (r) =>
      r.targetDate === ctx.targetDate &&
      r.contractorId !== ctx.contractorId &&
      Boolean(v) &&
      roadPlacesMeet({ roadLocation: v.roadLocation, segmentIds: v.segmentIds, route: v.route }, r) &&
      v.startTime < v.endTime &&
      timeWindowsOverlap(v.startTime, v.endTime, r.startTime, r.endTime),
  );
  return (
    <Card variant="outlined" sx={{ borderColor: clashes.length ? "error.main" : "divider" }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 10, sm: 11 }}>
            <Controller
              name={`roadUsage.${index}.roadLocation`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Road / lane"
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
          <Grid size={{ xs: 2, sm: 1 }} sx={{ display: "flex", justifyContent: "flex-end" }}>
            <IconButton aria-label="Delete road request" onClick={onRemove}>
              <DeleteOutlineOutlinedIcon />
            </IconButton>
          </Grid>
          <Grid size={12}>
            {/* Where on the map: register segments in driving order, or a temporary road drawn by hand. */}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button size="small" variant={route.field.value ? "outlined" : "contained"} disableElevation startIcon={<AddRoadOutlinedIcon />} onClick={() => setPicking(true)}>
                {route.field.value ? "แก้เส้นทางบนแผนที่" : "เลือกเส้นทางบนแผนที่"}
              </Button>
              <Typography variant="caption" color={route.field.value ? "text.primary" : "text.secondary"}>
                {route.field.value
                  ? segmentIds.field.value.length ? `${segmentIds.field.value.length} ช่วงจากทะเบียนถนน · มีลูกศรบอกทาง` : "ถนนชั่วคราว (วาดเอง)"
                  : "ยังไม่ได้ระบุบนแผนที่"}
              </Typography>
            </Stack>
            {picking ? (
              <RoadRoutePicker
                open
                projectId={ctx.projectId}
                date={ctx.targetDate}
                color="#0B4D8B"
                initial={{ segmentIds: segmentIds.field.value, route: route.field.value }}
                onClose={() => setPicking(false)}
                onApply={(c) => {
                  segmentIds.field.onChange(c.segmentIds);
                  route.field.onChange(c.route);
                  if (c.name) roadName.field.onChange(c.name);
                }}
              />
            ) : null}
          </Grid>
          <Grid size={12}>
            <Controller
              name={`roadUsage.${index}.purpose`}
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <TextField
                    {...field}
                    label="Purpose"
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

// A saved permit becomes one request row. A custom ("other") permit keeps its name in otherLabel.
const permitFromStandard = (i: StandardItem) => ({
  permitType: i.permitType ?? "other",
  otherLabel: i.permitType === "other" ? i.label : "",
  buildingId: i.buildingId ?? "",
  workers: i.defaultCount,
  highRisk: i.highRisk,
  taskName: i.taskName,
  supervisorName: i.supervisorName,
});

export function PermitRequests({
  control,
  buildings,
  projectId,
  contractorId,
}: {
  control: Control<MorningFormValues>;
  buildings: Building[];
  projectId: string;
  contractorId: string;
}) {
  const rows = useFieldArray({ control, name: "permits" });
  const permits = useWatch({ control, name: "permits" });
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
              onClick={() => rows.append({ permitType: p.code, otherLabel: "", buildingId: "", workers: 1, highRisk: false, taskName: "", supervisorName: "" })}
              sx={{ minHeight: 36 }}
            />
          );
        })}
      </Stack>
      <StandardItemsPanel
        kind="permit"
        projectId={projectId}
        contractorId={contractorId}
        buildings={buildings}
        onApply={(items) => items.forEach((i) => rows.append(permitFromStandard(i)))}
        onSaveFromForm={() =>
          (permits ?? [])
            .filter((p) => p.buildingId && (p.permitType !== "other" || (p.otherLabel ?? "").trim()))
            .map((p) => ({
              kind: "permit" as const,
              label: p.permitType === "other" ? (p.otherLabel ?? "").trim() : permitLabel(p.permitType),
              buildingId: p.buildingId,
              defaultCount: p.workers,
              permitType: p.permitType,
              highRisk: p.highRisk,
              taskName: p.taskName?.trim() ?? "",
              supervisorName: p.supervisorName?.trim() ?? "",
            }))
        }
      />
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
  control: Control<MorningFormValues>;
  buildings: Building[];
  onRemove: () => void;
}) {
  const type = useWatch({ control, name: `permits.${index}.permitType` }) as PermitType;
  const highRisk = useWatch({ control, name: `permits.${index}.highRisk` });
  const allPermits = useWatch({ control, name: "permits" }) ?? [];
  // Same task name on several permits = one job on the Safety page (e.g. Lifting + Work at Height).
  const taskOptions = [...new Set(allPermits.filter((p, i) => i !== index && p.highRisk && p.taskName?.trim()).map((p) => p.taskName!.trim()))];
  const supervisorOptions = [...new Set(allPermits.filter((p, i) => i !== index && p.supervisorName?.trim()).map((p) => p.supervisorName!.trim()))];
  const meta = PERMIT_TYPES.find((p) => p.code === type);
  const Icon = PERMIT_ICONS[type] ?? PERMIT_ICONS.other;
  return (
    <Card variant="outlined" sx={{ borderColor: highRisk ? "error.main" : "warning.main", borderWidth: highRisk ? 2 : 1 }}>
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
            <IconButton aria-label="Delete permit" onClick={onRemove}>
              <DeleteOutlineOutlinedIcon />
            </IconButton>
          </Stack>
          {type === "other" ? (
            <Controller
              name={`permits.${index}.otherLabel`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} label="Hazard work" size="small" fullWidth error={Boolean(fieldState.error)} helperText={fieldState.error?.message} />
              )}
            />
          ) : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-end" }}>
            <Controller
              name={`permits.${index}.buildingId`}
              control={control}
              render={({ field, fieldState }) => (
                <BuildingSelect label="Building" buildings={buildings} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              )}
            />
            <Controller
              name={`permits.${index}.workers`}
              control={control}
              render={({ field, fieldState }) => (
                <NumberStepper label="Headcount" value={field.value} onChange={field.onChange} min={1} unit="คน" error={fieldState.error?.message} />
              )}
            />
          </Stack>
          <Controller
            name={`permits.${index}.highRisk`}
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} color="error" />}
                label={
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    เป็นงานความเสี่ยงสูง (ต้องมีผู้ควบคุมงาน)
                  </Typography>
                }
              />
            )}
          />
          {highRisk ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Controller
                name={`permits.${index}.taskName`}
                control={control}
                render={({ field, fieldState }) => (
                  <Autocomplete
                    freeSolo
                    fullWidth
                    options={taskOptions}
                    inputValue={field.value}
                    onInputChange={(_, v) => field.onChange(v)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="High-risk work"
                        placeholder="เช่น ยกและงานสูงที่อาคาร Boiler"
                        size="small"
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message ?? "งานเดียวกันหลายใบอนุญาต ให้ใช้ชื่อเดียวกัน"}
                      />
                    )}
                  />
                )}
              />
              <Controller
                name={`permits.${index}.supervisorName`}
                control={control}
                render={({ field, fieldState }) => (
                  <Autocomplete
                    freeSolo
                    fullWidth
                    options={supervisorOptions}
                    inputValue={field.value}
                    onInputChange={(_, v) => field.onChange(v)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Supervisor (EPS)"
                        placeholder="เช่น นายสุชิต"
                        size="small"
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                )}
              />
            </Stack>
          ) : null}
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
                label={k === "startTime" ? "Start" : "End"}
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

// Tomorrow Forecast Activities (paper form R003 table): what the crew will work on tomorrow and where.
export function ForecastActivities({ control, buildings }: { control: Control<EveningFormValues>; buildings: Building[] }) {
  const rows = useFieldArray({ control, name: "forecasts" });
  return (
    <Box>
      {rows.fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ยังไม่มีแผนงาน — เพิ่มงานที่จะทำพรุ่งนี้และพื้นที่ (ไม่บังคับ)
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
