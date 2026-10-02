import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import type { DronePhotoLog } from "../types/drone.types.js";

interface DroneUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (log: DronePhotoLog) => void;
}

export function DroneUploadDialog({ open, onClose, onSubmit }: DroneUploadDialogProps) {
  const [date, setDate] = useState<string>("2026-10-02");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [capturedBy, setCapturedBy] = useState<string>("EPS QAQC Team");
  const [fileName, setFileName] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog: DronePhotoLog = {
      id: `log-${Date.now()}`,
      date,
      title: title || `ภาพถ่ายโดรน ณ วันที่ ${date}`,
      description: description || "บันทึกความคืบหน้าหน้างานประจำรอบบิน",
      imageUrl: "/drone/flight-2026-10-01.jpg",
      capturedBy,
      tags: ["ภาพสำรวจโดรน"],
    };
    onSubmit(newLog);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AddPhotoAlternateIcon color="primary" />
          บันทึกภาพถ่ายโดรนรอบใหม่ (Add Drone Photo Log)
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {/* File Upload Area */}
            <Box
              sx={{
                border: "2px dashed",
                borderColor: fileName ? "primary.main" : "divider",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                bgcolor: fileName ? "action.selected" : "action.hover",
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": { borderColor: "primary.light" },
              }}
              onClick={() => setFileName("Drone_Survey_Latest.jpg")}
            >
              <CloudUploadIcon sx={{ fontSize: 40, color: fileName ? "primary.main" : "text.secondary", mb: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {fileName ? `ไฟล์ที่เลือก: ${fileName}` : "คลิกหรือลากไฟล์ภาพถ่ายโดรน (JPG, PNG)"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ภาพมุมสูงหรือภาพมุมเฉียงที่ใช้ติดตามความก้าวหน้าโครงการ
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="วันที่ถ่ายภาพ"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="ผู้ถ่าย / ทีมงาน"
                  value={capturedBy}
                  onChange={(e) => setCapturedBy(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="หัวข้อ / บริเวณที่สำรวจ"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น ภาพรวมโครงการและโครงสร้าง Boiler, ลานกองเชื้อเพลิงชีวมวล"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="บันทึกรายละเอียดความก้าวหน้าหน้างาน"
                  multiline
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ระบุสิ่งที่สังเกตเห็น เช่น โครงสร้างเหล็กชั้น 2 ติดตั้งเสร็จ, เทพื้นคอนกรีตเรียบร้อย..."
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained">
            บันทึกรูปภาพ
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
