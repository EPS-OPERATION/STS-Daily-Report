import { PERMIT_TYPES, type PermitType } from "@sts/shared";
import { getPermitIcon, usePermitTypes } from "@/features/permit-types/index.js";
import { Controller, useFieldArray, useWatch, type Control } from "react-hook-form";
import type { MorningFormValues } from "../schemas/daily-report.schema.js";
import type { Building } from "@/features/buildings/index.js";
import { BuildingSelect } from "@/features/buildings/index.js";
import { NumberStepper } from "./number-stepper.js";
import { StandardItemsPanel, type StandardItem } from "@/features/report-standard-items/index.js";
import { permitLabel } from "@/features/daily-requests/index.js";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

// A saved permit becomes one request row. A custom ("other") permit keeps its name in otherLabel.
export const permitFromStandard = (i: StandardItem) => ({
  permitType: i.permitType ?? "other",
  otherLabel: i.permitType === "other" ? i.label : "",
  buildingId: i.buildingId ?? "",
  workers: i.defaultCount,
  highRisk: i.highRisk,
  taskName: i.taskName,
  supervisorName: i.supervisorName,
  photoKey: crypto.randomUUID(),
});

export function PermitRequests({
  control,
  buildings,
  projectId,
  contractorId,
  renderPhotos,
}: {
  control: Control<MorningFormValues>;
  buildings: Building[];
  projectId: string;
  contractorId: string;
  /** Optional site photos at the foot of each permit card (by the card's photoKey). */
  renderPhotos?: (photoKey: string | undefined) => ReactNode;
}) {
  const rows = useFieldArray({ control, name: "permits" });
  const permits = useWatch({ control, name: "permits" });
  // Project permit types (EPS can add more); the built-in list until the project has its own.
  const { data: dynamicPermitTypes } = usePermitTypes(projectId);
  const permitTypesList = dynamicPermitTypes && dynamicPermitTypes.length > 0 ? dynamicPermitTypes : PERMIT_TYPES;
  return (
    <Box>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 1.5 }}>
        {permitTypesList.map((p) => {
          const Icon = getPermitIcon("iconKey" in p ? p.iconKey : p.code);
          return (
            <Chip
              key={p.code}
              icon={<Icon style={{ fontSize: 16 }} />}
              label={p.label}
              variant="outlined"
              onClick={() => rows.append({ permitType: p.code as PermitType, otherLabel: "", buildingId: "", workers: 1, highRisk: false, taskName: "", supervisorName: "", photoKey: crypto.randomUUID() })}
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
              permitType: p.permitType as PermitType,
              highRisk: p.highRisk,
              taskName: p.taskName?.trim() ?? "",
              supervisorName: p.supervisorName?.trim() ?? "",
            }))
        }
      />
      <Stack spacing={1.5} sx={{ mt: rows.fields.length ? 2 : 0 }}>
        {rows.fields.map((row, i) => (
          <PermitRow key={row.id} index={i} control={control} buildings={buildings} permitTypesList={permitTypesList} onRemove={() => rows.remove(i)}
            footer={renderPhotos?.(permits?.[i]?.photoKey)} />
        ))}
      </Stack>
    </Box>
  );
}

export function PermitRow({
  index,
  control,
  buildings,
  permitTypesList = PERMIT_TYPES,
  onRemove,
  footer,
}: {
  index: number;
  control: Control<MorningFormValues>;
  buildings: Building[];
  permitTypesList?: readonly { code: string; label: string; labelTh?: string; iconKey?: string }[];
  onRemove: () => void;
  footer?: ReactNode;
}) {
  const type = useWatch({ control, name: `permits.${index}.permitType` }) as PermitType;
  const highRisk = useWatch({ control, name: `permits.${index}.highRisk` });
  const allPermits = useWatch({ control, name: "permits" }) ?? [];
  // Same task name on several permits = one job on the Safety page (e.g. Lifting + Work at Height).
  const taskOptions = [...new Set(allPermits.filter((p, i) => i !== index && p.highRisk && p.taskName?.trim()).map((p) => p.taskName!.trim()))];
  const supervisorOptions = [...new Set(allPermits.filter((p, i) => i !== index && p.supervisorName?.trim()).map((p) => p.supervisorName!.trim()))];
  const meta = permitTypesList.find((p) => p.code === type);
  const Icon = getPermitIcon(meta?.iconKey ?? type);
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
          {footer}
        </Stack>
      </CardContent>
    </Card>
  );
}
