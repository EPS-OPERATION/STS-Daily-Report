import { useState } from "react";
import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { PhotoCategory } from "@sts/shared";
import { HttpError } from "@/services/http/client.js";
import { useDeletePhoto, useUploadPhoto } from "../hooks/use-daily-report-mutations.js";
import type { ReportPhoto } from "../types/daily-report.types.js";
import { compressImage } from "../utils/image-compression.js";

const CATEGORIES: { key: PhotoCategory; label: string; hint: string }[] = [
  { key: "progress", label: "ความคืบหน้างาน (Progress)", hint: "ภาพผลงานที่ทำได้วันนี้" },
  { key: "safety", label: "ความปลอดภัย (Safety)", hint: "จุดเสี่ยง / การป้องกัน / สภาพหน้างาน" },
];

// Photos upload immediately (the report already exists after the morning shift),
// so a dropped connection never loses the whole evening form.
export function PhotoSection({
  reportId,
  photos,
  locked,
  ensureReportId,
}: {
  reportId: string | null;
  photos: ReportPhoto[];
  locked: boolean;
  /** Creates the draft report row on first upload when neither shift has been sent yet. */
  ensureReportId?: () => Promise<string>;
}) {
  const upload = useUploadPhoto();
  const remove = useDeletePhoto();
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const isUploading = upload.isPending || uploadStatus !== null;
  const error = customError ?? (upload.error instanceof HttpError ? upload.error.message : remove.error instanceof HttpError ? remove.error.message : null);

  const onPick = async (category: PhotoCategory, files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    setCustomError(null);
    const id = reportId ?? (await ensureReportId?.().catch(() => null));
    if (!id) {
      setCustomError("ไม่พบร่างรายงาน กรุณาลองใหม่อีกครั้ง");
      return;
    }

    try {
      for (let i = 0; i < list.length; i++) {
        const rawFile = list[i]!;
        setUploadStatus(`กำลังบีบอัดรูป (${i + 1}/${list.length})...`);
        const optimized = await compressImage(rawFile, { maxDimension: 1600, quality: 0.8 });
        setUploadStatus(`กำลังส่งรูป (${i + 1}/${list.length})...`);
        await upload.mutateAsync({ reportId: id, category, file: optimized });
      }
    } catch {
      setCustomError("อัปโหลดไม่สำเร็จ อาจเกิดจากสัญญาณอินเทอร์เน็ตหน้างานไม่เสถียร กรุณาลองใหม่");
    } finally {
      setUploadStatus(null);
    }
  };

  return (
    <Stack spacing={2}>
      {CATEGORIES.map((c) => {
        const list = photos.filter((p) => p.category === c.key);
        return (
          <Box key={c.key}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {c.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {c.hint}
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mt: 1 }}>
              {list.map((p) => (
                <Box
                  key={p.id}
                  sx={{
                    position: "relative",
                    aspectRatio: "1",
                    borderRadius: 1.5,
                    overflow: "hidden",
                    border: 1,
                    borderColor: "divider",
                    bgcolor: "grey.100",
                  }}
                >
                  {p.url ? (
                    <Box component="img" src={p.url} alt={p.fileName} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Typography variant="caption" sx={{ p: 1, display: "block" }}>
                      {p.fileName}
                    </Typography>
                  )}
                  {!locked ? (
                    <IconButton
                      aria-label={`Delete photo ${p.fileName}`}
                      size="small"
                      onClick={() => reportId && remove.mutate({ reportId, photoId: p.id })}
                      sx={{ position: "absolute", top: 4, right: 4, bgcolor: "background.paper", "&:hover": { bgcolor: "background.paper" } }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </Box>
              ))}
              {!locked ? (
                <Button
                  component="label"
                  variant="outlined"
                  disabled={isUploading}
                  sx={{ aspectRatio: "1", borderStyle: "dashed", flexDirection: "column", gap: 0.5, minWidth: 0 }}
                >
                  {isUploading ? <CircularProgress size={20} /> : <AddAPhotoOutlinedIcon />}
                  <Typography variant="caption">{isUploading ? (uploadStatus ?? "ส่งรูป...") : "Add photo"}</Typography>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    hidden
                    aria-label={`Add photo ${c.label}`}
                    onChange={(e) => {
                      void onPick(c.key, e.target.files);
                      e.target.value = "";
                    }}
                  />
                </Button>
              ) : null}
            </Box>
          </Box>
        );
      })}
      {uploadStatus ? <Alert severity="info" icon={<CircularProgress size={16} />}>{uploadStatus}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}
