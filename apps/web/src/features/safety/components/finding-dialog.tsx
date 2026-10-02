import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { FINDING_TYPES, type FindingStatus, type FindingType } from "@sts/shared";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useBuildings } from "@/features/daily-reports/index.js";
import { useProjectContractors } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";
import { useSaveFinding } from "../hooks/use-safety.js";
import type { FindingInput, SafetyFinding } from "../types/safety.types.js";

const today = () => dayjs().format("YYYY-MM-DD");

// Add / edit one line-walk finding (EPS). Photos are picked here and uploaded on Save.
export function FindingDialog({
  projectId,
  finding,
  onClose,
}: {
  projectId: string;
  finding: SafetyFinding | null; // null = new
  onClose: () => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const buildings = useBuildings(projectId).data?.data ?? [];
  const contractors = useProjectContractors(projectId).data?.data ?? [];
  const save = useSaveFinding(projectId);

  const [v, setV] = useState<FindingInput>(() =>
    finding
      ? {
          observation: finding.observation,
          buildingId: finding.buildingId,
          locationDetail: finding.locationDetail ?? "",
          actionToBeTaken: finding.actionToBeTaken,
          contractorId: finding.contractorId,
          inspectionDate: finding.inspectionDate,
          expectedCompleteDate: finding.expectedCompleteDate,
          status: finding.status,
          findingType: finding.findingType,
        }
      : {
          observation: "",
          buildingId: null,
          locationDetail: "",
          actionToBeTaken: "",
          contractorId: null,
          inspectionDate: today(),
          expectedCompleteDate: today(),
          status: "open",
          findingType: "unsafe_condition",
        },
  );
  const [findingPhoto, setFindingPhoto] = useState<File | null>(null);
  const [closePhoto, setClosePhoto] = useState<File | null>(null);
  const [touched, setTouched] = useState(false);

  // Local previews for newly picked files.
  const [previews, setPreviews] = useState<{ finding?: string; close?: string }>({});
  useEffect(() => {
    const next = {
      finding: findingPhoto ? URL.createObjectURL(findingPhoto) : undefined,
      close: closePhoto ? URL.createObjectURL(closePhoto) : undefined,
    };
    setPreviews(next);
    return () => Object.values(next).forEach((u) => u && URL.revokeObjectURL(u));
  }, [findingPhoto, closePhoto]);

  const set = <K extends keyof FindingInput>(k: K, val: FindingInput[K]) => setV((s) => ({ ...s, [k]: val }));
  const missing = !v.observation.trim() || !v.actionToBeTaken.trim();
  const closing = v.status === "done" && !closePhoto && !finding?.closePhotoUrl;

  const submit = () => {
    setTouched(true);
    if (missing) return;
    save.mutate(
      { id: finding?.id ?? null, input: { ...v, locationDetail: v.locationDetail?.trim() || undefined }, findingPhoto, closePhoto },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="md">
      <DialogTitle>{finding ? `Line walk · item ${finding.itemNo}` : "บันทึก Line walk"}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Observations Identified (สิ่งที่พบ)"
              value={v.observation}
              onChange={(e) => set("observation", e.target.value)}
              multiline
              minRows={3}
              fullWidth
              error={touched && !v.observation.trim()}
              helperText={touched && !v.observation.trim() ? "ระบุสิ่งที่พบ" : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Action to be taken (การแก้ไข)"
              value={v.actionToBeTaken}
              onChange={(e) => set("actionToBeTaken", e.target.value)}
              multiline
              minRows={3}
              fullWidth
              error={touched && !v.actionToBeTaken.trim()}
              helperText={touched && !v.actionToBeTaken.trim() ? "ระบุการแก้ไข" : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField select label="Location (อาคาร)" value={v.buildingId ?? ""} onChange={(e) => set("buildingId", e.target.value || null)} fullWidth size="small">
              <MenuItem value="">— ไม่ระบุ —</MenuItem>
              {buildings.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField label="ตำแหน่งเพิ่มเติม" placeholder="เช่น Line A ชั้น 2" value={v.locationDetail ?? ""} onChange={(e) => set("locationDetail", e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField select label="Responsible (ผู้รับเหมา)" value={v.contractorId ?? ""} onChange={(e) => set("contractorId", e.target.value || null)} fullWidth size="small">
              <MenuItem value="">— ไม่ระบุ —</MenuItem>
              {contractors.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DatePicker
              label="Inspection date"
              value={dayjs(v.inspectionDate)}
              onChange={(d) => d?.isValid() && set("inspectionDate", d.format("YYYY-MM-DD"))}
              format="D MMM YYYY"
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DatePicker
              label="Expect complete date"
              value={v.expectedCompleteDate ? dayjs(v.expectedCompleteDate) : null}
              minDate={dayjs(v.inspectionDate)}
              onChange={(d) => set("expectedCompleteDate", d?.isValid() ? d.format("YYYY-MM-DD") : null)}
              format="D MMM YYYY"
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="caption" color="text.secondary">
              Type
            </Typography>
            <ToggleButtonGroup exclusive fullWidth size="small" value={v.findingType} onChange={(_, t: FindingType | null) => t && set("findingType", t)}>
              {FINDING_TYPES.map((t) => (
                <ToggleButton key={t.code} value={t.code}>
                  {t.code === "unsafe_act" ? "Unsafe Act" : "Unsafe Condition"}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <PhotoPick label="Finding Picture (ก่อนแก้)" current={previews.finding ?? finding?.findingPhotoUrl ?? null} onPick={setFindingPhoto} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <PhotoPick label="Close Picture (หลังแก้)" current={previews.close ?? finding?.closePhotoUrl ?? null} onPick={setClosePhoto} />
          </Grid>
          <Grid size={12}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Status
              </Typography>
              <ToggleButtonGroup exclusive size="small" value={v.status} onChange={(_, s: FindingStatus | null) => s && set("status", s)}>
                <ToggleButton value="open" color="warning">
                  OPEN
                </ToggleButton>
                <ToggleButton value="done" color="success">
                  DONE
                </ToggleButton>
              </ToggleButtonGroup>
              {closing ? (
                <Typography variant="caption" color="warning.dark">
                  ปิดงานแล้วแต่ยังไม่มีรูปหลังแก้
                </Typography>
              ) : null}
            </Stack>
          </Grid>
        </Grid>
        {save.error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {save.error instanceof HttpError ? save.error.message : "บันทึกไม่สำเร็จ"}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="text" color="inherit" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button onClick={submit} disabled={save.isPending}>
          {save.isPending ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PhotoPick({ label, current, onPick }: { label: string; current: string | null; onPick: (f: File | null) => void }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Button
        component="label"
        variant="outlined"
        fullWidth
        sx={{ mt: 0.5, height: 180, p: 0, overflow: "hidden", borderStyle: current ? "solid" : "dashed", flexDirection: "column", gap: 0.5 }}
      >
        {current ? (
          <Box component="img" src={current} alt={label} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <>
            <AddAPhotoOutlinedIcon />
            <Typography variant="caption">เลือกรูป / ถ่ายรูป</Typography>
          </>
        )}
        <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      </Button>
    </Box>
  );
}
