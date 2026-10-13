import type { CoordinationContractor, CoordinationInput, CoordinationItem } from "@sts/shared";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import CheckCircleOutlineOutlined from "@mui/icons-material/CheckCircleOutlineOutlined";
import CropSquareOutlined from "@mui/icons-material/CropSquareOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import PaletteOutlined from "@mui/icons-material/PaletteOutlined";
import PentagonOutlined from "@mui/icons-material/PentagonOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import SyncOutlined from "@mui/icons-material/SyncOutlined";
import TextFieldsOutlined from "@mui/icons-material/TextFieldsOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { ICON_LABELS } from "../types/icon-labels.js";
import { MachineGlyph } from "./machine-icon.js";
import { TypePicker } from "./type-picker.js";

interface Props {
  item: CoordinationItem;
  /** Present when the viewer may edit this job (autosaved through onPatch). */
  draft: CoordinationInput | null;
  contractors: CoordinationContractor[];
  editableContractors: CoordinationContractor[];
  drawing: boolean;
  areaDirty: boolean;
  geometryError: string | null;
  saving: boolean;
  onPatch: (patch: Partial<CoordinationInput>) => void;
  onDrawFree: () => void;
  onMakeRectangle: () => void;
  onResetArea: () => void;
  onDelete: () => void;
  onClose: () => void;
  /** EPS admin: change this contractor's map colour (opens the colour dialog). */
  onEditColor?: (c: CoordinationContractor) => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      {children}
    </Stack>
  );
}

// Edit panel for the selected job (replaces the floating icon bar + settings dialog): every control
// is labelled, sits in one place, and saves automatically. Read-only jobs show the same layout as text.
export function CoordinationInspector({
  item,
  draft,
  contractors,
  editableContractors,
  drawing,
  areaDirty,
  geometryError,
  saving,
  onPatch,
  onDrawFree,
  onMakeRectangle,
  onResetArea,
  onDelete,
  onClose,
  onEditColor,
}: Props) {
  const v = draft ?? item;
  const company = contractors.find((c) => c.id === v.contractorId);
  const color = company?.color ?? "#64748B";
  const editable = Boolean(draft);

  return (
    <Stack sx={{ height: "100%", minHeight: 0 }}>
      {/* header: back to the list · job identity · save state */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
        <Tooltip title="กลับไปรายการงาน">
          <IconButton size="small" aria-label="กลับไปรายการงาน" onClick={onClose}>
            <ArrowBackOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ width: 30, display: "flex", justifyContent: "center" }}>
          {v.icon === "text" ? <TextFieldsOutlined fontSize="small" sx={{ color }} /> : <MachineGlyph icon={v.icon} color={color} />}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box component="span" sx={{ width: 9, height: 9, borderRadius: "3px", bgcolor: color, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {company?.code}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {company?.name}
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
            {v.title || "—"}
          </Typography>
        </Box>
        {editable ? (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: saving ? "text.secondary" : "success.main", pr: 0.5 }}>
            {saving ? <SyncOutlined sx={{ fontSize: 15 }} /> : <CheckCircleOutlineOutlined sx={{ fontSize: 15 }} />}
            <Typography variant="caption" sx={{ whiteSpace: "nowrap" }}>
              {saving ? "กำลังบันทึก…" : "บันทึกแล้ว"}
            </Typography>
          </Stack>
        ) : null}
      </Stack>

      <Stack spacing={2.25} sx={{ p: 1.75, overflowY: "auto", flex: 1 }}>
        {editable && draft ? (
          <>
            <Field label="ชื่องาน (แสดงบนผัง)">
              <TextField size="small" fullWidth value={draft.title} onChange={(e) => onPatch({ title: e.target.value })}
                error={!draft.title.trim()} helperText={!draft.title.trim() ? "ระบุชื่องาน" : undefined} placeholder="เช่น จุดจอดเครน 25T" />
            </Field>
            <Field label="หมายเหตุ / รายละเอียด">
              <TextField size="small" fullWidth multiline minRows={3} maxRows={8} value={draft.note ?? ""} onChange={(e) => onPatch({ note: e.target.value.slice(0, 1000) })}
                placeholder="เช่น ยก A Frame 09:00–12:00 · ปิดถนน R2 ชั่วคราว" />
            </Field>
            <Field label="ผู้รับเหมา">
              <TextField select size="small" fullWidth value={draft.contractorId} onChange={(e) => onPatch({ contractorId: e.target.value })}>
                {editableContractors.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box component="span" sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: c.color }} />
                      <span>
                        {c.code} · {c.name}
                      </span>
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>
              {onEditColor && company ? (
                <Button size="small" startIcon={<PaletteOutlined fontSize="small" />} onClick={() => onEditColor(company)} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
                  เปลี่ยนสี {company.code}
                </Button>
              ) : null}
            </Field>
            <Field label="ประเภทงาน">
              <TypePicker value={draft.icon} onPick={(icon) => onPatch({ icon })} />
            </Field>
            <Divider />
            <Field label="พื้นที่ทำงาน">
              <Stack direction="row" spacing={1}>
                <Button
                  fullWidth
                  variant={draft.areaKind === "rectangle" && !drawing ? "contained" : "outlined"}
                  disableElevation
                  startIcon={<CropSquareOutlined />}
                  onClick={onMakeRectangle}
                  sx={{ textTransform: "none" }}
                >
                  สี่เหลี่ยม
                </Button>
                <Button
                  fullWidth
                  variant={draft.areaKind === "polygon" || drawing ? "contained" : "outlined"}
                  disableElevation
                  startIcon={<PentagonOutlined />}
                  onClick={onDrawFree}
                  sx={{ textTransform: "none" }}
                >
                  {draft.areaKind === "polygon" ? "แก้รูปทรงอิสระ" : "วาดรูปทรงอิสระ"}
                </Button>
              </Stack>
              <Typography variant="caption" color={geometryError ? "warning.dark" : "text.secondary"}>
                {geometryError ??
                  (draft.areaKind === "rectangle"
                    ? "ลากกรอบบนผังเพื่อย้าย · ลากมุมเพื่อปรับขนาด/หมุน"
                    : `${draft.geometry.points.length} จุดมุม · ลากจุดมุมบนผังเพื่อปรับรูป`)}
              </Typography>
              {areaDirty ? (
                <Button size="small" startIcon={<RestartAltOutlined />} onClick={onResetArea} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
                  คืนค่าพื้นที่เดิม
                </Button>
              ) : null}
            </Field>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  เส้นเชื่อมไอคอนกับพื้นที่
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ปิดเมื่อไอคอนอยู่ห่างจากพื้นที่
                </Typography>
              </Box>
              <Switch checked={draft.linkArea !== false} onChange={(e) => onPatch({ linkArea: e.target.checked })} />
            </Stack>
          </>
        ) : (
          <>
            <Field label="ประเภทงาน">
              <Typography variant="body2">{ICON_LABELS[item.icon]}</Typography>
            </Field>
            <Field label="หมายเหตุ / รายละเอียด">
              <Typography variant="body2" color={item.note ? "text.primary" : "text.secondary"} sx={{ whiteSpace: "pre-line" }}>
                {item.note || "ไม่มีหมายเหตุ"}
              </Typography>
            </Field>
            <Field label="พื้นที่ทำงาน">
              <Typography variant="body2">{item.areaKind === "polygon" ? `รูปทรงอิสระ ${item.geometry.points.length} จุดมุม` : "สี่เหลี่ยม"}</Typography>
            </Field>
            <Typography variant="caption" color="text.secondary">
              ดูได้อย่างเดียว — แก้ไขได้เฉพาะงานของบริษัทที่บัญชีนี้ผูกไว้
            </Typography>
          </>
        )}
      </Stack>

      {editable ? (
        <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
          <Button fullWidth color="error" variant="outlined" startIcon={<DeleteOutlineOutlined />} onClick={onDelete} sx={{ textTransform: "none" }}>
            ลบงานนี้
          </Button>
        </Box>
      ) : null}
    </Stack>
  );
}
