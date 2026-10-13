import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { minutesToTime, roadClashPairs, timeToMinutes } from "@sts/shared";
import { useState } from "react";
import type { ReportRoadUsage } from "../types/daily-report.types.js";
import { durationText, TimelineRows, type TimelineRow } from "./road-timeline.js";
import { formatThaiDate } from "../utils/dates.js";

// Quarter-hour steps across the working day; a time outside the steps (typed earlier) is still offered.
const STEPS = Array.from({ length: (20 * 60 - 5 * 60) / 15 + 1 }, (_, i) => minutesToTime(5 * 60 + i * 15));
const CANDIDATE = "candidate";

const stamp = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(iso));

// EPS moves one booking. The timeline previews the new window against the other contractors before saving.
// Mount with a key per booking so the form starts from that booking's times.
export function RoadTimeDialog({
  road,
  bookings,
  saving,
  error,
  onClose,
  onSave,
  onRestore,
}: {
  road: ReportRoadUsage | null;
  bookings: ReportRoadUsage[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (startTime: string, endTime: string) => void;
  onRestore: () => void;
}) {
  const [start, setStart] = useState(road?.startTime ?? "08:00");
  const [end, setEnd] = useState(road?.endTime ?? "10:00");
  if (!road) return null;

  const valid = timeToMinutes(start) < timeToMinutes(end);
  const unchanged = start === road.startTime && end === road.endTime;
  const options = [...new Set([...STEPS, start, end])].sort();

  const rows: TimelineRow[] = bookings.map((b) =>
    b.id === road.id
      ? { id: CANDIDATE, label: road.contractorCode, contractorId: road.contractorId, start, end, selected: true }
      : { id: b.id, label: b.contractorCode, contractorId: b.contractorId, start: b.startTime, end: b.endTime },
  );
  const pairs = roadClashPairs(
    rows.map((r) => ({ id: r.id, contractorId: r.contractorId, startTime: r.start, endTime: r.end })),
  ).filter((p) => p.a === CANDIDATE || p.b === CANDIDATE);
  const rowOf = new Map(rows.map((r) => [r.id, r]));

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="road-time-title">
      <DialogTitle id="road-time-title">แก้ไขเวลาการใช้ถนน</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Stack spacing={0.25}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {road.contractorCode} · {road.roadLocation}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatThaiDate(road.targetDate)} · {road.purpose}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              คำขอเดิม {road.requestedStartTime}–{road.requestedEndTime}
              {road.adjusted && road.adjustedAt ? ` · แก้ไขโดย ${road.adjustedByName ?? "EPS"} ${stamp(road.adjustedAt)}` : ""}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5}>
            <TextField select size="small" label="เริ่ม" value={start} onChange={(e) => setStart(e.target.value)} fullWidth error={!valid}>
              {options.map((t) => (
                <MenuItem key={t} value={t} sx={{ fontVariantNumeric: "tabular-nums" }}>{t}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="สิ้นสุด"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              fullWidth
              error={!valid}
              helperText={valid ? undefined : "เวลาสิ้นสุดต้องหลังเวลาเริ่ม"}
            >
              {options.map((t) => (
                <MenuItem key={t} value={t} sx={{ fontVariantNumeric: "tabular-nums" }}>{t}</MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">ตัวอย่างหลังบันทึก (เวลาของคนอื่นบนถนนเดียวกันวันเดียวกัน)</Typography>
            <TimelineRows rows={rows} compact />
          </Stack>

          {valid ? (
            pairs.length > 0 ? (
              <Alert severity="error">
                {pairs.map((p) => {
                  const other = rowOf.get(p.a === CANDIDATE ? p.b : p.a)!;
                  return (
                    <Typography key={p.a + p.b} variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      ยังชนกับ {other.label} {other.start}–{other.end} ช่วง {p.start}–{p.end} ({durationText(timeToMinutes(p.end) - timeToMinutes(p.start))})
                    </Typography>
                  );
                })}
              </Alert>
            ) : (
              <Alert severity="success">หลังบันทึกจะไม่ชนกับผู้รับเหมาอื่น</Alert>
            )
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
        <Button color="inherit" disabled={!road.adjusted || saving} onClick={onRestore}>
          คืนเวลาที่ขอ
        </Button>
        <Stack direction="row" spacing={1}>
          <Button color="inherit" disabled={saving} onClick={onClose}>ยกเลิก</Button>
          <Button variant="contained" disableElevation disabled={!valid || unchanged || saving} onClick={() => onSave(start, end)}>
            บันทึกเวลา
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
