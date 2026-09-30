import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import CloseIcon from "@mui/icons-material/Close";
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
  const error = upload.error ?? remove.error;

  const onPick = async (category: PhotoCategory, files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    const id = reportId ?? (await ensureReportId?.().catch(() => null));
    if (!id) return;
    for (const file of list) {
      await upload.mutateAsync({ reportId: id, category, file }).catch(() => undefined);
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
                      aria-label={`ลบรูป ${p.fileName}`}
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
                  disabled={upload.isPending}
                  sx={{ aspectRatio: "1", borderStyle: "dashed", flexDirection: "column", gap: 0.5, minWidth: 0 }}
                >
                  {upload.isPending ? <CircularProgress size={20} /> : <AddAPhotoOutlinedIcon />}
                  <Typography variant="caption">เพิ่มรูป</Typography>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    hidden
                    aria-label={`เพิ่มรูป ${c.label}`}
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
      {error instanceof HttpError ? <Alert severity="error">{error.message}</Alert> : null}
    </Stack>
  );
}
