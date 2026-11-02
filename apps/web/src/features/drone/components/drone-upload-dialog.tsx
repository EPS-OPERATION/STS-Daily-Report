import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CloudUploadIcon from "@mui/icons-material/CloudUploadOutlined";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import { toast } from "sonner";
import { HttpError } from "@/services/http/client.js";
import { useUploadDroneLog } from "../hooks/use-drone-logs.js";
import { FormDialog } from "@/components/ui/form-dialog.js";
import { toIsoDate } from "@/lib/dates.js";

interface DroneUploadDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  onSaved?: (dateIso: string) => void;
}

export function DroneUploadDialog({ open, onClose, projectId, onSaved }: DroneUploadDialogProps) {
  const upload = useUploadDroneLog(projectId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState<string>(toIsoDate());
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [capturedBy, setCapturedBy] = useState<string>("EPS QAQC Team");
  const [tags, setTags] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const reset = () => {
    setDate(toIsoDate());
    setTitle("");
    setDescription("");
    setCapturedBy("EPS QAQC Team");
    setTags("");
    setFile(null);
  };

  const close = () => {
    if (upload.isPending) return;
    reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !projectId || upload.isPending) return;
    upload.mutate(
      {
        date,
        title: title.trim() || `ภาพถ่ายโดรน ณ วันที่ ${date}`,
        description: description.trim(),
        capturedBy: capturedBy.trim(),
        tags: tags.trim(),
        file,
      },
      {
        onSuccess: () => {
          toast.success("บันทึกภาพถ่ายโดรนแล้ว");
          onSaved?.(date);
          reset();
          onClose();
        },
      },
    );
  };

  return (
    <FormDialog
      open={open}
      title={
        <Stack component="span" direction="row" spacing={1} alignItems="center">
          <AddPhotoAlternateIcon color="primary" />
          <span>บันทึกภาพถ่ายโดรนรอบใหม่ (Add Drone Photo Log)</span>
        </Stack>
      }
      onClose={close}
      busy={upload.isPending}
      dividers
      onSubmit={handleSubmit}
      actions={
        <>
          <Button onClick={close} color="inherit" disabled={upload.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={!file || upload.isPending}>
            {upload.isPending ? "Uploading…" : "Save photos"}
          </Button>
        </>
      }
    >
          <Stack spacing={2.5}>
            <Box
              sx={{
                border: "2px dashed",
                borderColor: file ? "primary.main" : "divider",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                bgcolor: file ? "action.selected" : "action.hover",
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": { borderColor: "primary.light" },
              }}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <CloudUploadIcon sx={{ fontSize: 40, color: file ? "primary.main" : "text.secondary", mb: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {file ? `ไฟล์ที่เลือก: ${file.name}` : "คลิกเพื่อเลือกไฟล์ภาพถ่ายโดรน (JPG, PNG)"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ภาพมุมสูงหรือภาพมุมเฉียงที่ใช้ติดตามความก้าวหน้าโครงการ
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Photo date"
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
                  label="Photographer / team"
                  value={capturedBy}
                  onChange={(e) => setCapturedBy(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Title / survey area"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น ภาพรวมโครงการและโครงสร้าง Boiler, ลานกองเชื้อเพลิงชีวมวล"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Progress notes"
                  multiline
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ระบุสิ่งที่สังเกตเห็น เช่น โครงสร้างเหล็กชั้น 2 ติดตั้งเสร็จ, เทพื้นคอนกรีตเรียบร้อย..."
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Tags (comma separated)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Boiler, Silo, ภาพมุมสูงรวม"
                />
              </Grid>
            </Grid>

            {upload.error ? (
              <Alert severity="error">
                {upload.error instanceof HttpError ? upload.error.message : "อัปโหลดไม่สำเร็จ กรุณาลองใหม่"}
              </Alert>
            ) : null}
          </Stack>
    </FormDialog>
  );
}
