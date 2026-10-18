import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useEffect, useState, type ReactNode } from "react";
import { addDaysIso, todayIso } from "@/features/daily-reports/index.js";
import type { RainLogEntry, RainLogInput } from "../types/rain-log.types.js";
import { TimeSelect } from "@/components/ui/time-select.js";

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const nowSlot = () => {
  const m = dayjs().hour() * 60 + dayjs().minute();
  return fromMin(Math.min(toMin("20:45"), Math.max(toMin("05:00"), Math.floor(m / 15) * 15)));
};
const REASONS = ["ฝนตกหนัก", "ฟ้าคะนอง / ฟ้าผ่า", "ลมแรง", "พื้นที่น้ำขัง / ลื่น"];
const STOPPED = ["งานยกด้วยเครน", "งานที่สูง", "งานเทคอนกรีต", "งานเชื่อม / Hot work", "งานขุด / งานดิน"];


interface RainLogDialogProps {
  open: boolean;
  entry: RainLogEntry | "new" | null;
  projectId: string;
  onClose: () => void;
  /** Resolves when saved; a rejection keeps the dialog open with the message. */
  onSave: (input: RainLogInput) => Promise<unknown>;
}

// Log rain that stopped work: pick the day, the start and stop time, tap why and what stopped.
// Stoppage hours = the period; the recorder is the signed-in user.
export function RainLogDialog({ open, entry, projectId, onClose, onSave }: RainLogDialogProps) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const isNew = entry === "new";
  const today = todayIso();

  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("14:00");
  const [reasons, setReasons] = useState<string[]>([]);
  const [stopped, setStopped] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    if (entry && entry !== "new") {
      setDate(entry.date);
      setStartTime(entry.startTime);
      setEndTime(entry.endTime);
      setReasons([]);
      setStopped([]);
      setNote(entry.impactSummary);
    } else {
      const start = nowSlot();
      setDate(today);
      setStartTime(start);
      setEndTime(fromMin(Math.min(toMin("21:00"), toMin(start) + 60)));
      setReasons(["ฝนตกหนัก"]);
      setStopped([]);
      setNote("");
    }
  }, [open, entry, today]);


  const windowMin = toMin(endTime) - toMin(startTime);
  const valid = windowMin > 0;
  // Stoppage = the rain period (no separate field to think about).
  const hours = Math.round((windowMin / 60) * 10) / 10;
  const composed = [reasons.join(", "), stopped.length ? `หยุด${stopped.join(", ")}` : "", note.trim()].filter(Boolean).join(" — ");
  const canSave = valid && composed.length > 0 && !saving;

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ projectId, date, startTime, endTime, stoppageHours: hours, impactSummary: composed, recordedBy: "" });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={phone}>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="span" sx={{ display: "block", fontWeight: 700 }}>
          {isNew ? "บันทึกฝนตกหน้างาน" : "แก้ไขบันทึกฝนตก"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ฝนตกจนต้องหยุดงานช่วงไหน — ใช้เป็นหลักฐานขยายเวลา (EOT)
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Step n={1} title="วันที่">
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {[
                { label: "วันนี้", value: today },
                { label: "เมื่อวาน", value: addDaysIso(today, -1) },
              ].map((d) => (
                <Chip key={d.value} label={d.label} color={date === d.value ? "primary" : "default"} variant={date === d.value ? "filled" : "outlined"} onClick={() => setDate(d.value)} />
              ))}
              <DatePicker
                value={dayjs(date)}
                maxDate={dayjs(today)}
                onChange={(v) => v?.isValid() && setDate(v.format("YYYY-MM-DD"))}
                format="D MMM YYYY"
                slotProps={{ textField: { size: "small", sx: { width: 170 } } }}
              />
            </Stack>
          </Step>

          <Step n={2} title="ฝนตก / หยุดงาน ช่วงเวลา">
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <TimeSelect label="เวลาเริ่ม" fullWidth={false} sx={{ width: 150 }} value={startTime} onChange={(v) => {
                const keep = Math.max(15, windowMin);
                setStartTime(v);
                setEndTime(fromMin(Math.min(toMin("21:00"), toMin(v) + keep)));
              }} />
              <TimeSelect label="เวลาสิ้นสุด" fullWidth={false} sx={{ width: 150 }} value={endTime} onChange={setEndTime} after={startTime} error={!valid} helperText={valid ? undefined : "ต้องหลังเวลาเริ่ม"} />
            </Stack>
          </Step>

          <Step n={3} title="สาเหตุ และงานที่ต้องหยุด">
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {REASONS.map((r) => (
                <Chip key={r} label={r} color={reasons.includes(r) ? "primary" : "default"} variant={reasons.includes(r) ? "filled" : "outlined"} onClick={() => toggle(reasons, setReasons, r)} />
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.25, mb: 0.75 }}>
              งานที่หยุด
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {STOPPED.map((w) => (
                <Chip key={w} size="small" label={w} color={stopped.includes(w) ? "primary" : "default"} variant={stopped.includes(w) ? "filled" : "outlined"} onClick={() => toggle(stopped, setStopped, w)} />
              ))}
            </Stack>
            <TextField
              label="รายละเอียดเพิ่มเติม (ถ้ามี)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              size="small"
              sx={{ mt: 1.5 }}
            />
            {composed ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                จะบันทึกว่า: «{composed}»
              </Typography>
            ) : (
              <Typography variant="caption" color="warning.dark" sx={{ display: "block", mt: 0.75 }}>
                เลือกสาเหตุอย่างน้อย 1 อย่าง หรือพิมพ์รายละเอียด
              </Typography>
            )}
          </Step>

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button color="inherit" onClick={onClose} disabled={saving}>
          ยกเลิก
        </Button>
        <Button variant="contained" disableElevation onClick={() => void submit()} disabled={!canSave} sx={{ minWidth: 140 }}>
          {saving ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: "primary.main", color: "primary.contrastText", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>
          {n}
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}

