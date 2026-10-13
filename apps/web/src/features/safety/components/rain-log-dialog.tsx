import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import type { RainLogEntry, RainLogInput } from "../types/rain-log.types.js";

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return 0;
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const diff = endMins - startMins;
  return diff > 0 ? Number((diff / 60).toFixed(1)) : 0;
}

interface RainLogDialogProps {
  open: boolean;
  entry: RainLogEntry | "new" | null;
  projectId: string;
  onClose: () => void;
  onSave: (input: RainLogInput) => void;
}

export function RainLogDialog({
  open,
  entry,
  projectId,
  onClose,
  onSave,
}: RainLogDialogProps) {
  const isNew = entry === "new";

  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("15:30");
  const [stoppageHours, setStoppageHours] = useState(2.5);
  const [impactSummary, setImpactSummary] = useState("");
  const [recordedBy, setRecordedBy] = useState("EPS QAQC / Safety Team");

  useEffect(() => {
    if (entry && entry !== "new") {
      setDate(entry.date);
      setStartTime(entry.startTime);
      setEndTime(entry.endTime);
      setStoppageHours(entry.stoppageHours);
      setImpactSummary(entry.impactSummary);
      setRecordedBy(entry.recordedBy);
    } else if (entry === "new") {
      const today = dayjs().format("YYYY-MM-DD");
      setDate(today);
      setStartTime("13:00");
      setEndTime("15:30");
      setStoppageHours(2.5);
      setImpactSummary("ฝนตกหนักลมแรง ปฏิบัติตามมาตรฐานความปลอดภัยสั่งหยุดงานยกและงานที่สูง");
      setRecordedBy("EPS QAQC / Safety Team");
    }
  }, [entry]);

  // Recalculate hours when start/end change
  const handleTimeChange = (newStart: string, newEnd: string) => {
    setStartTime(newStart);
    setEndTime(newEnd);
    const hrs = calcHours(newStart, newEnd);
    if (hrs > 0) setStoppageHours(hrs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      projectId,
      date,
      startTime,
      endTime,
      stoppageHours: Number(stoppageHours) || 0,
      impactSummary: impactSummary.trim(),
      recordedBy: recordedBy.trim() || "EPS QAQC / Safety Team",
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="div">
            {isNew ? "บันทึกเวลาฝนตกจริง & ชั่วโมงหยุดงาน" : "แก้ไขบันทึกเหตุการณ์ฝนตก"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ใช้เป็นหลักฐานและเอกสารประกอบการเจรจาขยายเวลา (Claim EOT) เมื่อเกิดความล่าช้าจากสภาพอากาศ
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 2.5 }}>
          <Stack spacing={2.5}>
            <TextField
              label="วันที่เกิดฝนตก"
              type="date"
              fullWidth
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ maxWidth: { sm: 320 } }}
              required
            />

            {/* Time range & duration */}
            <Box sx={{ p: 2, bgcolor: "background.default", borderRadius: 2, border: 1, borderColor: "divider" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                ช่วงเวลาที่ฝนตกจนต้องหยุดงาน (Work Stoppage Period)
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField
                    label="เริ่มฝนตก"
                    type="time"
                    size="small"
                    fullWidth
                    value={startTime}
                    onChange={(e) => handleTimeChange(e.target.value, endTime)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField
                    label="ฝนหยุด / ทำงานต่อได้"
                    type="time"
                    size="small"
                    fullWidth
                    value={endTime}
                    onChange={(e) => handleTimeChange(startTime, e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="รวมเวลาหยุดงาน (ชม.)"
                    type="number"
                    size="small"
                    fullWidth
                    value={stoppageHours}
                    onChange={(e) => setStoppageHours(Number(e.target.value))}
                    slotProps={{ htmlInput: { step: 0.5, min: 0, max: 24 } }}
                    helperText="คำนวณอัตโนมัติ ปรับแก้ได้"
                    required
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Impact summary */}
            <TextField
              label="รายละเอียดเหตุการณ์และสภาพหน้างาน"
              multiline
              rows={2}
              fullWidth
              size="small"
              value={impactSummary}
              onChange={(e) => setImpactSummary(e.target.value)}
              placeholder="เช่น ฝนตกหนักลมแรงต่อเนื่อง พื้นดินเปียกชุ่ม รถเครนไม่สามารถตั้งขา Outrigger ได้อย่างปลอดภัย"
              required
            />

            <TextField
              label="ผู้บันทึกข้อมูล (Inspector / Reporter)"
              size="small"
              fullWidth
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              required
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" color="primary">
            {isNew ? "บันทึกประวัติฝนตก" : "บันทึกการแก้ไข"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
