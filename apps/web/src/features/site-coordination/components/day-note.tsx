import type { CoordinationDayNote } from "@sts/shared";
import EditOutlined from "@mui/icons-material/EditOutlined";
import StickyNote2Outlined from "@mui/icons-material/StickyNote2Outlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { shortDate } from "@/lib/dates.js";

// "หมายเหตุประจำวัน": one shared note for the whole map on this date, pinned at the bottom of the
// list panel. Read view by default; EPS presses "เขียนหมายเหตุ / แก้ไข" to open the editor, then saves.
export function DayNote({
  date,
  dayNote,
  canEdit,
  onSave,
}: {
  date: string;
  dayNote: CoordinationDayNote | null;
  canEdit: boolean;
  onSave: (note: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  // A different day closes the editor.
  useEffect(() => {
    setEditing(false);
    setError(false);
  }, [date]);

  const open = () => {
    setText(dayNote?.note ?? "");
    setError(false);
    setEditing(true);
  };
  const save = async () => {
    setSaving(true);
    setError(false);
    try {
      await onSave(text.trim());
      setEditing(false);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider", bgcolor: "rgba(245, 158, 11, 0.06)", px: 1.5, pt: 1.25, pb: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
        <StickyNote2Outlined sx={{ fontSize: 18, color: "warning.dark" }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
          บันทึกการประชุม
        </Typography>
        {canEdit && !editing ? (
          <Button startIcon={<EditOutlined fontSize="small" />} onClick={open} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            {dayNote ? "แก้ไข" : "บันทึก"}
          </Button>
        ) : null}
      </Stack>

      {editing ? (
        <Stack spacing={1}>
          <InputBase
            autoFocus
            multiline
            minRows={3}
            maxRows={8}
            fullWidth
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 2000))}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void save();
            }}
            placeholder={`โน้ตสำหรับวันที่ ${shortDate(date)} — เช่น ปิดถนน R2 ทั้งวัน, ยกเครนช่วงบ่าย 13:00–15:00`}
            inputProps={{ "aria-label": "บันทึกประจำวัน" }}
            sx={{ px: 1.25, py: 1, fontSize: 14, lineHeight: 1.5, bgcolor: "background.paper", border: "1px solid", borderColor: "primary.main", borderRadius: 1.5, boxShadow: (t) => `0 0 0 3px ${t.palette.primary.main}22` }}
          />
          {error ? (
            <Typography variant="caption" color="error.main">
              บันทึกไม่สำเร็จ ลองอีกครั้ง
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button color="inherit" disabled={saving} onClick={() => setEditing(false)} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button variant="contained" disableElevation disabled={saving} onClick={() => void save()} sx={{ textTransform: "none" }}>
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </Stack>
        </Stack>
      ) : (
        <>
          <Typography variant="body2" color={dayNote ? "text.primary" : "text.secondary"} sx={{ whiteSpace: "pre-line" }}>
            {dayNote?.note || "ยังไม่มีบันทึกการประชุมสำหรับวันนี้"}
          </Typography>
          {dayNote ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
              แก้ล่าสุด {dayNote.updatedByName ?? "EPS"} · {dayjs(dayNote.updatedAt).format("D MMM HH:mm")}
            </Typography>
          ) : null}
        </>
      )}
    </Box>
  );
}
