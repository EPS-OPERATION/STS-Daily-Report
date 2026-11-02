import { roadPlacesMeet, timeWindowsOverlap } from "@sts/shared";
import { Controller, useController, useFieldArray, useWatch, type Control } from "react-hook-form";
import { RoadPickField, RoadPickMap, useRoadPick } from "@/features/daily-requests/index.js";
import type { EveningFormValues } from "../schemas/daily-report.schema.js";
import type { Building } from "@/features/buildings/index.js";
import AddRoadOutlinedIcon from "@mui/icons-material/AddRoadOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { TomorrowContext } from "./request-fields.js";
import { TimeWindow } from "./request-fields.js";
import { ClashNote } from "./request-fields.js";

export const ROAD_PURPOSES = ["Crane outrigger setup", "Concrete mixer staging", "Material delivery", "Heavy equipment move"];

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

export function RoadRow({
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
  const segmentIds = useController({ control, name: `roadUsage.${index}.segmentIds` });
  const route = useController({ control, name: `roadUsage.${index}.route` });
  const roadName = useController({ control, name: `roadUsage.${index}.roadLocation` });
  const pickState = useRoadPick({
    projectId: ctx.projectId,
    date: ctx.targetDate,
    segmentIds: segmentIds.field.value,
    onChange: (p) => {
      segmentIds.field.onChange(p.segmentIds);
      route.field.onChange(p.route);
      roadName.field.onChange(p.name);
    },
  });
  const hasRegister = pickState.hasRegister;
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
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
        <Grid container spacing={1.5}>
          <Grid size={12} sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
            {hasRegister ? (
              <RoadPickField state={pickState} error={roadName.fieldState.error?.message} />
            ) : (
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
            )}
            <datalist id={`roads-${index}`}>
              {knownRoads.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            </Box>
            <IconButton aria-label="Delete road request" onClick={onRemove} sx={{ flexShrink: 0, mt: 0.25 }}>
              <DeleteOutlineOutlinedIcon />
            </IconButton>
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
        </Box>
        {hasRegister ? (
          <Box sx={{ width: { xs: "100%", md: 360 }, flexShrink: 0 }}>
            <RoadPickMap state={pickState} route={route.field.value} />
          </Box>
        ) : null}
        </Stack>
        {clashes.length ? (
          <ClashNote severe>
            ถนนนี้ถูกขอใช้ช่วงเวลาเดียวกัน: {clashes.map((r) => `${r.contractorCode} ${r.startTime}–${r.endTime} (${r.purpose})`).join(", ")}
          </ClashNote>
        ) : null}
      </CardContent>
    </Card>
  );
}
