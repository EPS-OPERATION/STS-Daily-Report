import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { zodResolver } from "@hookform/resolvers/zod";
import { INSPECTION_TYPES, READINESS, type InspectionType, type Readiness } from "@sts/shared";
import dayjs from "dayjs";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HttpError } from "@/services/http/client.js";
import { useDeleteRequest, useSaveRequest } from "../hooks/use-daily-report-mutations.js";
import { useInspectionRequests } from "../hooks/use-daily-report-queries.js";
import { requestSchema, type RequestFormValues } from "../schemas/daily-report.schema.js";
import type { Building, InspectionRequest } from "../types/daily-report.types.js";
import { addDaysIso } from "../utils/dates.js";
import { RequestStatusChip, ReadinessChip } from "./request-chips.js";

export function inspectionTypeLabel(code: InspectionType) {
  return INSPECTION_TYPES.find((t) => t.code === code)?.label ?? code;
}

// Daily Request (QAQC inspection) for one contractor/day. Requests save
// immediately: draft until the morning shift is sent, then "requested".
export function RequestSection({
  projectId,
  contractorId,
  reportDate,
  buildings,
  eveningSubmitted,
}: {
  projectId: string;
  contractorId: string;
  reportDate: string;
  buildings: Building[];
  eveningSubmitted: boolean;
}) {
  const list = useInspectionRequests(projectId, { from: reportDate, to: reportDate, by: "report" });
  const remove = useDeleteRequest();
  const [editing, setEditing] = useState<InspectionRequest | "new" | null>(null);
  const rows = (list.data?.data ?? []).filter((r) => r.contractorId === contractorId);

  return (
    <Box>
      <Stack spacing={1.25}>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            ยังไม่มีคำขอตรวจ — เพิ่มงานที่ต้องการให้ QAQC ตรวจพรุ่งนี้
          </Typography>
        ) : null}
        {rows.map((r) => {
          const editable = r.status === "draft" || r.status === "requested";
          return (
            <Card key={r.id} variant="outlined">
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box
                    sx={{
                      minWidth: 58,
                      textAlign: "center",
                      borderRadius: 1.5,
                      bgcolor: "primary.light",
                      color: "primary.main",
                      py: 0.5,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "inherit" }}>
                      {r.inspectionTime}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "inherit" }}>
                      {r.inspectionDate === addDaysIso(reportDate, 1) ? "พรุ่งนี้" : dayjs(r.inspectionDate).format("D/M")}
                    </Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {inspectionTypeLabel(r.inspectionType)} · {r.workItem}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {r.buildingName}
                      {r.location ? ` · ${r.location}` : ""}
                      {r.drawingRef ? ` · ${r.drawingRef}` : ""}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                      <RequestStatusChip status={r.status} result={r.result} />
                      <ReadinessChip readiness={r.readiness} />
                    </Stack>
                    {r.epsNote ? (
                      <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "warning.dark" }}>
                        EPS: {r.epsNote}
                      </Typography>
                    ) : null}
                  </Box>
                  {editable ? (
                    <Stack>
                      <IconButton aria-label="แก้ไขคำขอ" size="small" onClick={() => setEditing(r)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label="ลบคำขอ"
                        size="small"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(r.id)}
                      >
                        <DeleteOutlineOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
      <Button
        startIcon={<AddIcon />}
        variant="outlined"
        fullWidth
        sx={{ mt: 1.5, borderStyle: "dashed" }}
        onClick={() => setEditing("new")}
        disabled={buildings.length === 0}
      >
        เพิ่มคำขอตรวจ QAQC
      </Button>
      {!eveningSubmitted && rows.some((r) => r.status === "draft") ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          คำขอที่เป็น Draft จะถูกส่งให้ QAQC อัตโนมัติเมื่อกดส่งรายงานเย็น
        </Typography>
      ) : null}
      {remove.error instanceof HttpError ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {remove.error.message}
        </Alert>
      ) : null}

      {editing ? (
        <RequestDialog
          projectId={projectId}
          contractorId={contractorId}
          reportDate={reportDate}
          buildings={buildings}
          request={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Box>
  );
}

function RequestDialog({
  projectId,
  contractorId,
  reportDate,
  buildings,
  request,
  onClose,
}: {
  projectId: string;
  contractorId: string;
  reportDate: string;
  buildings: Building[];
  request: InspectionRequest | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const save = useSaveRequest(projectId);
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: request
      ? {
          buildingId: request.buildingId,
          inspectionDate: request.inspectionDate,
          inspectionTime: request.inspectionTime,
          inspectionType: request.inspectionType,
          workItem: request.workItem,
          location: request.location ?? "",
          drawingRef: request.drawingRef ?? "",
          readiness: request.readiness,
        }
      : {
          buildingId: "",
          inspectionDate: addDaysIso(reportDate, 1),
          inspectionTime: "09:00",
          inspectionType: "" as InspectionType,
          workItem: "",
          location: "",
          drawingRef: "",
          readiness: "ready" as Readiness,
        },
  });
  const { control, handleSubmit } = form;
  const dateChoices = [1, 2, 3].map((d) => addDaysIso(reportDate, d));

  const onSubmit = handleSubmit((v) => {
    const fields = {
      ...v,
      location: v.location || undefined,
      drawingRef: v.drawingRef || undefined,
    };
    save.mutate(request ? { id: request.id, fields } : { fields, contractorId, reportDate }, { onSuccess: onClose });
  });

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FactCheckOutlinedIcon color="primary" />
        {request ? "แก้ไขคำขอตรวจ" : "คำขอตรวจ QAQC (Daily Request)"}
      </DialogTitle>
      <DialogContent>
        <Box
          component="form"
          id="request-form"
          // React bubbles submit through the portal into the surrounding morning <form>; stop it here.
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.stopPropagation();
            void onSubmit(e);
          }}
          noValidate
          sx={{ pt: 1 }}
        >
          <Grid container spacing={2}>
            <Grid size={12}>
              <Controller
                name="inspectionType"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField select label="ประเภทการตรวจ" fullWidth size="small" {...field} error={Boolean(fieldState.error)} helperText={fieldState.error?.message}>
                    {INSPECTION_TYPES.map((t) => (
                      <MenuItem key={t.code} value={t.code}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={12}>
              <Controller
                name="workItem"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="งานที่ขอตรวจ"
                    placeholder="เช่น Rebar ฐานราก F3 / Formwork wall W2"
                    fullWidth
                    size="small"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 7 }}>
              <Controller
                name="buildingId"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField select label="อาคาร" fullWidth size="small" {...field} error={Boolean(fieldState.error)} helperText={fieldState.error?.message}>
                    {buildings.map((b) => (
                      <MenuItem key={b.id} value={b.id}>
                        {b.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Controller
                name="location"
                control={control}
                render={({ field }) => <TextField {...field} label="ตำแหน่ง (grid/ชั้น)" placeholder="B1 L3" fullWidth size="small" />}
              />
            </Grid>
            <Grid size={12}>
              <Typography variant="caption" color="text.secondary">
                วันที่ให้ตรวจ
              </Typography>
              <Controller
                name="inspectionDate"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup exclusive fullWidth size="small" value={field.value} onChange={(_, v: string | null) => v && field.onChange(v)}>
                    {dateChoices.map((d, i) => (
                      <ToggleButton key={d} value={d}>
                        {i === 0 ? "พรุ่งนี้" : i === 1 ? "มะรืนนี้" : dayjs(d).format("D/M")}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                )}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Controller
                name="inspectionTime"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type="time"
                    label="เวลา"
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 900 } }}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Controller
                name="drawingRef"
                control={control}
                render={({ field }) => <TextField {...field} label="Drawing / Rev." placeholder="Rev.03" fullWidth size="small" />}
              />
            </Grid>
            <Grid size={12}>
              <Typography variant="caption" color="text.secondary">
                ความพร้อมหน้างาน
              </Typography>
              <Controller
                name="readiness"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup exclusive fullWidth size="small" value={field.value} onChange={(_, v: Readiness | null) => v && field.onChange(v)}>
                    {READINESS.map((r) => (
                      <ToggleButton key={r.code} value={r.code}>
                        {r.labelTh}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                )}
              />
            </Grid>
          </Grid>
          {save.error instanceof HttpError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {save.error.message}
            </Alert>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="text" color="inherit" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button type="submit" form="request-form" disabled={save.isPending}>
          {save.isPending ? "กำลังบันทึก…" : "บันทึกคำขอ"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
