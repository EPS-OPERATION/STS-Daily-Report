import type { CoordinationMapAdmin } from "@sts/shared";
import AddPhotoAlternateOutlined from "@mui/icons-material/AddPhotoAlternateOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/form-dialog.js";
import { HttpError } from "@/services/http/client.js";
import { useCreateMap, useUpdateMap } from "../hooks/use-coordination.js";
import { prepareMapPicture, type MapPicture } from "../utils/map-picture.js";

const THAI = /[฀-๿]/;
const LATIN = /[A-Za-z]/;
const thaiError = (v: string) => (!v.trim() ? "กรอกชื่อภาษาไทย" : !THAI.test(v) ? "ชื่อภาษาไทยต้องเป็นภาษาไทย" : null);
const engError = (v: string) => (!v.trim() ? "Enter the English name" : THAI.test(v) || !LATIN.test(v) ? "The English name must be written in English (A–Z)" : null);

// Add a working-area map (name + picture) or edit one: rename it, or replace its picture with a sharper one of the
// same shape (jobs are stored as positions on the picture, so a different shape would move them).
export function MapDialog({ projectId, map, onClose }: { projectId: string; map: CoordinationMapAdmin | null; onClose: () => void }) {
  const create = useCreateMap(projectId);
  const update = useUpdateMap(projectId);
  const [name, setName] = useState(map?.name ?? "");
  const [nameTh, setNameTh] = useState(map?.nameTh ?? "");
  const [picture, setPicture] = useState<MapPicture | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const saving = create.isPending || update.isPending;
  const enErr = touched || name ? engError(name) : null;
  const thErr = touched || nameTh ? thaiError(nameTh) : null;

  useEffect(() => {
    if (!picture) { setPreview(null); return; }
    const url = URL.createObjectURL(picture.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [picture]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null); setReading(true);
    try { setPicture(await prepareMapPicture(file)); }
    catch (e) { setPicture(null); setError(e instanceof Error ? e.message : "The picture could not be read"); }
    finally { setReading(false); if (input.current) input.current.value = ""; }
  };

  const save = async () => {
    setError(null); setTouched(true);
    if (engError(name) || thaiError(nameTh)) return;
    if (!map && !picture) { setError("Choose the map picture"); return; }
    const form = new FormData();
    form.set("name", name.trim()); form.set("nameTh", nameTh.trim());
    if (picture) form.set("file", picture.file);
    try {
      if (map) { await update.mutateAsync({ id: map.id, form }); toast.success("บันทึกพื้นที่แล้ว"); }
      else { await create.mutateAsync(form); toast.success("เพิ่มพื้นที่แล้ว"); }
      onClose();
    } catch (e) {
      setError(e instanceof HttpError ? e.message : "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  };

  const shown = preview ?? map?.imagePath ?? null;
  return (
    <FormDialog
      title={map ? `Edit area: ${map.name}` : "Add a working area map"}
      onClose={onClose}
      busy={saving}
      maxWidth="sm"
      dividers
      mobileFullScreen
      onSubmit={(event) => { event.preventDefault(); void save(); }}
      actions={<>
        <Button color="inherit" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={saving || reading}>{saving ? "Saving…" : map ? "Save" : "Add area"}</Button>
      </>}
    >
      <Stack spacing={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField label="English name" placeholder="e.g. 33 kV line route" size="small" fullWidth value={name} onChange={(e) => setName(e.target.value)}
            autoFocus error={Boolean(enErr)} helperText={enErr ?? " "} slotProps={{ htmlInput: { maxLength: 80 } }} />
          <TextField label="ชื่อภาษาไทย" placeholder="เช่น แนวสายส่ง 33 kV" size="small" fullWidth value={nameTh} onChange={(e) => setNameTh(e.target.value)}
            error={Boolean(thErr)} helperText={thErr ?? " "} slotProps={{ htmlInput: { maxLength: 80 } }} />
        </Stack>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{map ? "Picture" : "Map picture"}</Typography>
          <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 1.5, bgcolor: "action.hover", overflow: "hidden", display: "grid", placeItems: "center", minHeight: 160 }}>
            {shown ? <Box component="img" src={shown} alt="" sx={{ display: "block", width: "100%", maxHeight: 300, objectFit: "contain" }} />
              : <Stack alignItems="center" spacing={0.5} sx={{ py: 3, color: "text.secondary" }}><AddPhotoAlternateOutlined /><Typography variant="body2">PNG, JPG or WebP</Typography></Stack>}
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
            <Button variant="outlined" component="label" disabled={saving || reading} startIcon={<AddPhotoAlternateOutlined />}>
              {reading ? "Reading…" : map || picture ? "Choose another picture" : "Choose picture"}
              <input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void pick(e.target.files?.[0])} />
            </Button>
            <Typography variant="caption" color="text.secondary">
              {picture ? `${picture.width} × ${picture.height} px${picture.resized ? " · resized to fit" : ""}` : map ? `${map.width} × ${map.height} px now` : "Pictures over 4096 px are shrunk automatically"}
            </Typography>
          </Stack>
          {map ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
              A new picture must have the same shape as the current one so the jobs stay where they were drawn. Use it to swap in a sharper version.
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </FormDialog>
  );
}
