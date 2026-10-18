import BookmarkBorderOutlinedIcon from "@mui/icons-material/BookmarkBorderOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PERMIT_TYPES, type StandardItemKind } from "@sts/shared";
import { useState } from "react";
import { toast } from "sonner";
import { HttpError } from "@/services/http/client.js";
import { useDeleteReportStandardItem, useReportStandardItems, useSaveReportStandardItems } from "../hooks/use-report-standard-items.js";
import type { StandardItem, StandardItemBuilding, StandardItemDraft } from "../types/report-standard-item.types.js";
import { Frame } from "@/components/ui/frame.js";

const failMessage = (e: unknown) => (e instanceof HttpError ? e.message : "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง");

// Saved entries of one kind (work, machine or permit), inline in the form. Collapsed by default:
// open it to add saved entries to the form, or save what the form already has for next time.
export function StandardItemsPanel({
  kind,
  projectId,
  contractorId,
  buildings,
  onApply,
  onSaveFromForm,
}: {
  kind: StandardItemKind;
  projectId: string;
  contractorId: string;
  buildings: StandardItemBuilding[];
  /** Adds the chosen saved entries to the form. */
  onApply: (items: StandardItem[]) => void;
  /** This kind's entries as they are in the form now, to save. */
  onSaveFromForm: () => StandardItemDraft[];
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const list = useReportStandardItems(projectId, contractorId);
  const save = useSaveReportStandardItems(projectId, contractorId);
  const remove = useDeleteReportStandardItem(projectId, contractorId);
  const items = (list.data ?? []).filter((i) => i.kind === kind);
  const chosen = items.filter((i) => picked.includes(i.id));

  const buildingName = (id: string | null) => {
    const b = buildings.find((x) => x.id === id);
    return b ? `[${b.code}] ${b.name}` : "ไม่ระบุอาคาร";
  };
  const detail = (i: StandardItem) => {
    if (kind === "equipment") return `${i.defaultCount} เครื่อง`;
    if (kind === "activity") return `${buildingName(i.buildingId)} · ${i.defaultCount} คน`;
    const type = PERMIT_TYPES.find((p) => p.code === i.permitType)?.label ?? "";
    return `${type} · ${buildingName(i.buildingId)} · ${i.defaultCount} คน${i.highRisk ? " · งานเสี่ยงสูง" : ""}`;
  };

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const apply = () => {
    onApply(chosen);
    setPicked([]);
  };

  const saveFromForm = async () => {
    const drafts = onSaveFromForm();
    if (drafts.length === 0) {
      toast.info("ยังไม่มีรายการในฟอร์มให้บันทึก");
      return;
    }
    try {
      const after = (await save.mutateAsync(drafts)).data.filter((i) => i.kind === kind).length;
      const added = after - items.length;
      toast.success(added > 0 ? `บันทึกเป็นรายการมาตรฐานเพิ่ม ${added} รายการแล้ว` : "รายการเหล่านี้อยู่ในรายการมาตรฐานแล้ว");
    } catch (e) {
      toast.error(failMessage(e));
    }
  };

  const removeItem = (id: string) => {
    setPicked((p) => p.filter((x) => x !== id));
    remove.mutate(id, { onError: (e) => toast.error(failMessage(e)) });
  };

  return (
    <Box sx={{ mt: 1.5 }}>
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        aria-expanded={open}
        startIcon={<BookmarkBorderOutlinedIcon />}
        endIcon={open ? <ExpandLessOutlinedIcon /> : <ExpandMoreOutlinedIcon />}
        onClick={() => setOpen((v) => !v)}
        sx={{ textTransform: "none", fontWeight: 600 }}
      >
        รายการมาตรฐาน{list.data ? ` (${items.length})` : ""}
      </Button>
      {open ? (
        <Frame sx={{ mt: 1 }}>
          {list.isPending ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              กำลังโหลด…
            </Typography>
          ) : list.isError ? (
            <Alert severity="error" sx={{ m: 1.5 }}>
              โหลดรายการมาตรฐานไม่สำเร็จ ลองใหม่อีกครั้ง
            </Alert>
          ) : items.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              ยังไม่มีรายการ — กรอกในฟอร์มแล้วกด “บันทึกจากฟอร์มนี้” เพื่อเก็บไว้ใช้ครั้งต่อไป
            </Typography>
          ) : (
            items.map((i) => (
              <Stack key={i.id} direction="row" alignItems="center" sx={{ borderTop: 1, borderColor: "divider" }}>
                <ListItemButton dense selected={picked.includes(i.id)} onClick={() => toggle(i.id)} sx={{ flexGrow: 1, minWidth: 0, py: 1 }}>
                  <Checkbox checked={picked.includes(i.id)} tabIndex={-1} disableRipple sx={{ mr: 1 }} />
                  <ListItemText
                    primary={i.label}
                    secondary={detail(i)}
                    slotProps={{ primary: { noWrap: true, sx: { fontWeight: 600 } }, secondary: { noWrap: true } }}
                  />
                </ListItemButton>
                <IconButton aria-label={`ลบ ${i.label} ออกจากรายการมาตรฐาน`} onClick={() => removeItem(i.id)} sx={{ mr: 0.5 }}>
                  <DeleteOutlineOutlinedIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))
          )}
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ p: 1, borderTop: 1, borderColor: "divider" }}>
            <Button size="small" color="inherit" onClick={saveFromForm} disabled={save.isPending}>
              บันทึกจากฟอร์มนี้
            </Button>
            <Button size="small" variant="contained" disableElevation onClick={apply} disabled={chosen.length === 0}>
              เพิ่มเข้าวันนี้{chosen.length > 0 ? ` (${chosen.length})` : ""}
            </Button>
          </Stack>
        </Frame>
      ) : null}
    </Box>
  );
}
