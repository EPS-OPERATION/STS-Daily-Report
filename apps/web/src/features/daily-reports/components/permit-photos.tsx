import { useState } from "react";
import AddOutlined from "@mui/icons-material/AddOutlined";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import PhotoCameraOutlined from "@mui/icons-material/PhotoCameraOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PhotoViewer } from "@/components/ui/photo-viewer.js";
import { useDeletePhoto, useUploadPhoto } from "../hooks/use-daily-report-mutations.js";
import type { ReportPhoto } from "../types/daily-report.types.js";
import { compressImage } from "../utils/image-compression.js";

const THUMB = 56;

// Optional site photos of one hazardous job (category "permit", linked by the card's photoKey): where a floor will be
// cut open, a guardrail removed... Deliberately quiet: a small text link until something is attached, so it reads as
// "if it matters", not a required step. Photos sent with the morning report are shown to the other contractors and
// EPS in the Today feed (people working nearby must take extra care).
// Photos upload at once; the first one creates the draft report when the morning has not been sent yet.
export function PermitPhotos({ photoKey, reportId, photos, ensureReportId }: {
  photoKey: string | undefined;
  reportId: string | null;
  photos: ReportPhoto[];
  ensureReportId: () => Promise<string>;
}) {
  const upload = useUploadPhoto();
  const remove = useDeletePhoto();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ReportPhoto | null>(null);
  if (!photoKey) return null;
  const mine = photos.filter((p) => p.category === "permit" && p.permitKey === photoKey);

  const pick = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setError(null); setBusy(true);
    try {
      const id = reportId ?? (await ensureReportId());
      for (const file of list) {
        const small = await compressImage(file, { maxDimension: 1600, quality: 0.8 });
        await upload.mutateAsync({ reportId: id, category: "permit", file: small, permitKey: photoKey });
      }
    } catch {
      setError("ส่งรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  };
  const input = <input type="file" accept="image/*" multiple hidden aria-label="แนบรูป"
    onChange={(e) => { void pick(e.target.files); e.target.value = ""; }} />;

  return (
    <Box>
      {mine.length === 0 ? (
        <Button component="label" variant="text" size="small" color="inherit" disabled={busy}
          startIcon={busy ? <CircularProgress size={14} /> : <PhotoCameraOutlined sx={{ fontSize: 18 }} />}
          sx={{ color: "text.secondary", fontWeight: 500, textTransform: "none", px: 0.5, ml: -0.5 }}>
          {busy ? "กำลังส่งรูป…" : "แนบรูปตำแหน่งงาน ถ้าจำเป็น (เช่น จุดเจาะพื้น / รื้อราวกันตก)"}
          {input}
        </Button>
      ) : (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>รูปตำแหน่งงาน (ผู้รับเหมารายอื่นและ EPS จะเห็นใน Today feed)</Typography>
          {mine.map((p) => (
            <Box key={p.id} sx={{ position: "relative", width: THUMB, height: THUMB, borderRadius: 1, overflow: "hidden", border: 1, borderColor: "divider", bgcolor: "grey.100" }}>
              {p.url ? <Box component="button" type="button" aria-label={`ดูรูป ${p.fileName}`} onClick={() => setViewing(p)}
                sx={{ p: 0, border: 0, width: "100%", height: "100%", cursor: "zoom-in", bgcolor: "transparent" }}>
                <Box component="img" src={p.url} alt={p.fileName} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </Box> : null}
              <IconButton size="small" aria-label={`ลบรูป ${p.fileName}`} disabled={remove.isPending}
                onClick={() => remove.mutate({ reportId: reportId!, photoId: p.id })}
                sx={{ position: "absolute", top: 2, right: 2, p: 0.25, bgcolor: "background.paper", "&:hover": { bgcolor: "background.paper" } }}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
          <Button component="label" variant="outlined" color="inherit" disabled={busy} aria-label="เพิ่มรูปหน้างาน"
            sx={{ width: THUMB, height: THUMB, minWidth: 0, p: 0, borderStyle: "dashed", color: "text.secondary" }}>
            {busy ? <CircularProgress size={18} /> : <AddOutlined fontSize="small" />}
            {input}
          </Button>
        </Stack>
      )}
      {error ? <Typography variant="caption" color="error" sx={{ display: "block" }}>{error}</Typography> : null}
      <PhotoViewer src={viewing?.url ?? null} alt={viewing?.fileName} onClose={() => setViewing(null)} />
    </Box>
  );
}
