import { COORDINATION_ICON_KEYS, type CoordinationItemType } from "@sts/shared";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/form-dialog.js";
import { HttpError } from "@/services/http/client.js";
import { useCreateItemType, useUpdateItemType } from "../hooks/use-coordination.js";
import { COORDINATION_ICON_LABELS, CoordinationGlyph } from "./coordination-icon.js";

const THAI = /[\u0E00-\u0E7F]/;
const LATIN = /[A-Za-z]/;

const thaiError = (v: string) => (!v.trim() ? "กรอกชื่อภาษาไทย" : !THAI.test(v) ? "ชื่อภาษาไทยต้องเป็นภาษาไทย" : null);
const engError = (v: string) => (!v.trim() ? "กรอกชื่อภาษาอังกฤษ" : THAI.test(v) || !LATIN.test(v) ? "ชื่อภาษาอังกฤษต้องเป็นภาษาอังกฤษ (A–Z)" : null);

export function ItemTypeDialog({ projectId, item, onClose }: { projectId: string; item: CoordinationItemType | null; onClose: () => void }) {
  const create = useCreateItemType(projectId);
  const update = useUpdateItemType(projectId);
  const [labelTh, setLabelTh] = useState(item?.labelTh ?? "");
  const [label, setLabel] = useState(item?.label ?? "");
  const [iconKey, setIconKey] = useState(item?.iconKey ?? "hard-hat");
  const [active, setActive] = useState(item?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const thErr = touched || labelTh ? thaiError(labelTh) : null;
  const enErr = touched || label ? engError(label) : null;
  const saving = create.isPending || update.isPending;
  const lockedActive = item?.code === "road" || item?.code === "text";

  const save = async () => {
    setError(null);
    setTouched(true);
    if (thaiError(labelTh) || engError(label)) return;
    try {
      if (item) {
        await update.mutateAsync({
          id: item.id,
          input: { label: label.trim(), labelTh: labelTh.trim(), iconKey, isActive: active },
        });
        toast.success("บันทึกประเภทงานแล้ว");
      } else {
        await create.mutateAsync({ label: label.trim(), labelTh: labelTh.trim(), iconKey });
        toast.success("เพิ่มประเภทงานแล้ว");
      }
      onClose();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <FormDialog
      title={item ? `แก้ไขประเภทงาน: ${item.labelTh}` : "เพิ่มประเภทงานในเมนู Add item"}
      onClose={onClose}
      busy={saving}
      maxWidth="sm"
      dividers
      mobileFullScreen
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      actions={
        <>
          <Button color="inherit" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "กำลังบันทึก…" : item ? "บันทึก" : "เพิ่มประเภทงาน"}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : null}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="ชื่อภาษาไทย"
            placeholder="เช่น งานยกเครื่อง"
            size="small"
            fullWidth
            value={labelTh}
            onChange={(e) => setLabelTh(e.target.value)}
            autoFocus
            error={Boolean(thErr)}
            helperText={thErr ?? " "}
          />
          <TextField
            label="ชื่อภาษาอังกฤษ"
            placeholder="เช่น Heavy lifting"
            size="small"
            fullWidth
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            error={Boolean(enErr)}
            helperText={enErr ?? "รหัสจะสร้างจากชื่อนี้"}
          />
        </Stack>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            ไอคอน
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(52px, 1fr))", gap: 1 }}>
            {COORDINATION_ICON_KEYS.map((key) => {
              const on = iconKey === key;
              return (
                <ButtonBase
                  key={key}
                  title={COORDINATION_ICON_LABELS[key] ?? key}
                  aria-label={COORDINATION_ICON_LABELS[key] ?? key}
                  aria-pressed={on}
                  onClick={() => setIconKey(key)}
                  sx={{
                    height: 48,
                    borderRadius: 1.5,
                    border: "1.5px solid",
                    borderColor: on ? "primary.main" : "divider",
                    bgcolor: on ? "primary.50" : "background.paper",
                    color: on ? "primary.main" : "text.secondary",
                  }}
                >
                  <CoordinationGlyph iconKey={key} size={24} />
                </ButtonBase>
              );
            })}
          </Box>
        </Box>
        {item ? (
          <FormControlLabel
            control={<Switch checked={active} disabled={lockedActive} onChange={(e) => setActive(e.target.checked)} />}
            label={lockedActive ? "ประเภทนี้ต้องแสดงเสมอ" : "แสดงในเมนู Add item"}
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            ประเภทใหม่จะอยู่ท้ายเมนู — ลากแถวในรายการเพื่อจัดลำดับ
          </Typography>
        )}
        {item?.isSystem ? (
          <Typography variant="caption" color="text.secondary">
            ประเภทพื้นฐาน (built-in) แก้ชื่อ/ไอคอนได้ แต่ลบไม่ได้ — ถ้าไม่ใช้ ให้ปิดการแสดงแทน
          </Typography>
        ) : null}
      </Stack>
    </FormDialog>
  );
}
