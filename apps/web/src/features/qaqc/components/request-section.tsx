import AddIcon from "@mui/icons-material/AddOutlined";
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
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { zodResolver } from "@hookform/resolvers/zod";
import { INSPECTION_TYPES, type InspectionType, type Readiness } from "@sts/shared";
import dayjs from "dayjs";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { HttpError } from "@/services/http/client.js";
import { useDeleteRequest, useSaveRequest } from "../hooks/use-inspection-request-mutations.js";
import { useInspectionRequests } from "../hooks/use-inspection-requests.js";
import { requestSchema, type RequestFormValues } from "../schemas/request.schema.js";
import type { Building } from "@/features/buildings/index.js";
import type { InspectionRequest } from "../types/inspection-request.types.js";
import { BuildingSelect } from "@/features/buildings/index.js";
import { RequestStatusChip } from "./request-chips.js";
import { TimeSelect } from "@/components/ui/time-select.js";

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
  const [deleteTarget, setDeleteTarget] = useState<InspectionRequest | null>(null);
  const rows = (list.data?.data ?? []).filter((r) => r.contractorId === contractorId);

  return (
    <Box>
      <Stack spacing={1.25}>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            ยังไม่มีคำขอนัดตรวจ — กดปุ่มด้านล่างเพื่อเพิ่มคำขอตรวจ QAQC (RFI)
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
                      minWidth: 64,
                      textAlign: "center",
                      borderRadius: 1.5,
                      bgcolor: "primary.light",
                      color: "primary.main",
                      py: 0.5,
                      px: 0.75,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "inherit" }}>
                      {r.inspectionTime}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "inherit", fontWeight: 600 }}>
                      {dayjs(r.inspectionDate).format("DD/MM/YY")}
                    </Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {r.inspectionType && r.inspectionType !== "other"
                        ? `${inspectionTypeLabel(r.inspectionType)} · ${r.workItem}`
                        : r.workItem}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {r.buildingName}
                      {r.location ? ` · ${r.location}` : ""}
                      {r.drawingRef ? ` · ${r.drawingRef}` : ""}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                      <RequestStatusChip status={r.status} result={r.result} />
                    </Stack>
                    {r.epsNote ? (
                      <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "warning.dark" }}>
                        EPS: {r.epsNote}
                      </Typography>
                    ) : null}
                  </Box>
                  {editable ? (
                    <Stack>
                      <IconButton aria-label="Edit request" size="small" onClick={() => setEditing(r)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label="Delete request"
                        size="small"
                        disabled={remove.isPending}
                        onClick={() => setDeleteTarget(r)}
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
        Add QAQC inspection request
      </Button>
      {!eveningSubmitted && rows.some((r) => r.status === "draft") ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          คำขอที่เป็น Draft จะถูกส่งให้ QAQC อัตโนมัติเมื่อกดส่งรายงานบ่าย
        </Typography>
      ) : null}
      {remove.error instanceof HttpError ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {remove.error.message}
        </Alert>
      ) : null}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete request?"
        description={deleteTarget ? `คำขอ "${deleteTarget.workItem}" จะถูกลบ` : undefined}
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          remove.mutate(deleteTarget.id, {
            onSuccess: () => toast.success("ลบคำขอแล้ว"),
            onSettled: () => setDeleteTarget(null),
          });
        }}
      />

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
          inspectionDate: reportDate,
          inspectionTime: "09:00",
          inspectionType: "other" as InspectionType,
          workItem: "",
          location: "",
          drawingRef: "",
          readiness: "ready" as Readiness,
        },
  });
  const { control, handleSubmit } = form;

  const onSubmit = handleSubmit((v) => {
    const fields = {
      ...v,
      inspectionType: (request?.inspectionType || v.inspectionType || "other") as InspectionType,
      readiness: "ready" as Readiness,
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
                name="workItem"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Work item"
                    placeholder="เช่น Rebar ฐานราก F3 / Formwork wall W2"
                    fullWidth
                    size="small"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Controller
                name="buildingId"
                control={control}
                render={({ field, fieldState }) => (
                  <BuildingSelect
                    label="Building"
                    buildings={buildings}
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="inspectionDate"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type="date"
                    label="Inspection date"
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="inspectionTime"
                control={control}
                render={({ field, fieldState }) => (
                  <TimeSelect
                    label="เวลาที่ขอตรวจ"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Controller
                name="drawingRef"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Document no."
                    placeholder="เช่น STSBPP-EB-C-023 Rev.03"
                    fullWidth
                    size="small"
                  />
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
          Cancel
        </Button>
        <Button type="submit" form="request-form" disabled={save.isPending}>
          {save.isPending ? "กำลังบันทึก…" : "บันทึกคำขอ"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

