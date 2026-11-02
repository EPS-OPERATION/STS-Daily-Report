import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { toast } from "sonner";
import { HttpError } from "@/services/http/client.js";
import { useCreatePermitType, useUpdatePermitType } from "../hooks/use-permit-types.js";
import type { PermitTypeItem } from "../types/permit-type.types.js";
import { PERMIT_ICON_OPTIONS } from "./permit-icons.js";

// Code from the English name ("Hot Tapping" → "hot_tapping"); a Thai-only name falls back to a short unique code.
function codeFrom(label: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return slug || `custom_${Date.now().toString(36)}`;
}

const THAI = /[฀-๿]/;
const LATIN = /[A-Za-z]/;
// Thai name needs Thai letters; English name needs English letters and no Thai.
const thaiError = (v: string) => (!v.trim() ? "กรุณาใส่ชื่อภาษาไทย" : !THAI.test(v) ? "ชื่อภาษาไทยต้องเป็นตัวอักษรไทย" : null);
const engError = (v: string) =>
  !v.trim() ? "กรุณาใส่ชื่อภาษาอังกฤษ" : THAI.test(v) || !LATIN.test(v) ? "ชื่อภาษาอังกฤษต้องเป็นตัวอักษรอังกฤษ (A–Z)" : null;

// Add one permit type (no `item`) or edit one (name, icon, shown/hidden). Opened from the Permit Types tiles:
// the dashed ➕ tile adds, ✎ on a tile edits. A type in use is hidden instead of deleted, so old permits keep their name.
export function PermitTypeDialog({ projectId, item, onClose }: { projectId: string; item: PermitTypeItem | null; onClose: () => void }) {
  const create = useCreatePermitType(projectId);
  const update = useUpdatePermitType(projectId);
  const [labelTh, setLabelTh] = useState(item?.labelTh ?? "");
  const [label, setLabel] = useState(item?.label ?? "");
  const [iconKey, setIconKey] = useState(item?.iconKey ?? "tools");
  const [active, setActive] = useState(item?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const thErr = touched || labelTh ? thaiError(labelTh) : null;
  const enErr = touched || label ? engError(label) : null;
  const saving = create.isPending || update.isPending;

  const save = async () => {
    setError(null);
    setTouched(true);
    if (thaiError(labelTh) || engError(label)) return;
    try {
      if (item) {
        await update.mutateAsync({ id: item.id, input: { label: label.trim(), labelTh: labelTh.trim(), iconKey, isActive: active } });
        toast.success("บันทึกประเภทใบอนุญาตแล้ว");
      } else {
        await create.mutateAsync({ code: codeFrom(label), label: label.trim(), labelTh: labelTh.trim(), iconKey, isActive: true });
        toast.success("เพิ่มประเภทใบอนุญาตแล้ว");
      }
      onClose();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{item ? `แก้ไขประเภท: ${item.labelTh}` : "เพิ่มประเภทใบอนุญาต"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error ? (
            <Typography variant="body2" sx={{ color: "error.main" }}>
              {error}
            </Typography>
          ) : null}
          <TextField label="ชื่อภาษาไทย" placeholder="เช่น งานขุดเจาะ" size="small" fullWidth value={labelTh} onChange={(e) => setLabelTh(e.target.value)} autoFocus error={Boolean(thErr)} helperText={thErr ?? " "} />
          <TextField label="ชื่อภาษาอังกฤษ" placeholder="เช่น Excavation" size="small" fullWidth value={label} onChange={(e) => setLabel(e.target.value)} error={Boolean(enErr)} helperText={enErr ?? " "} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              ไอคอน
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))", gap: 1 }}>
              {PERMIT_ICON_OPTIONS.map((o) => {
                const Icon = o.icon;
                const on = iconKey === o.key;
                return (
                  <ButtonBase
                    key={o.key}
                    title={o.label}
                    aria-label={o.label}
                    aria-pressed={on}
                    onClick={() => setIconKey(o.key)}
                    sx={{
                      height: 48,
                      borderRadius: 1.5,
                      border: "1.5px solid",
                      borderColor: on ? "primary.main" : "divider",
                      bgcolor: on ? "primary.50" : "background.paper",
                      color: on ? "primary.main" : "text.secondary",
                    }}
                  >
                    <Icon />
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>
          {item ? (
            <FormControlLabel
              control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
              label={active ? "แสดงในฟอร์มของผู้รับเหมา" : "ซ่อนแล้ว (ใบอนุญาตเก่ายังแสดงชื่อเดิม)"}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button color="inherit" onClick={onClose} disabled={saving}>
          ยกเลิก
        </Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving}>
          {saving ? "กำลังบันทึก…" : item ? "บันทึก" : "เพิ่มประเภท"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
