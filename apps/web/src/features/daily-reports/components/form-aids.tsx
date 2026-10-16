import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import RadioButtonUncheckedOutlinedIcon from "@mui/icons-material/RadioButtonUncheckedOutlined";
import RestoreOutlinedIcon from "@mui/icons-material/RestoreOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { scrollToSection } from "../utils/form-sections.js";

const clockOf = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(iso));
const timeOf = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(iso));

// Shown when this report has an unsent draft on the device: carry on from it, or start from what is saved.
export function DraftBanner({ savedAt, onRestore, onDiscard }: { savedAt: string; onRestore: () => void; onDiscard: () => void }) {
  return (
    <Alert severity="info" icon={<RestoreOutlinedIcon />} sx={{ mb: 2, "& .MuiAlert-message": { width: "100%" } }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        มีร่างที่ยังไม่ส่ง
      </Typography>
      <Typography variant="caption" color="text.secondary">
        บันทึกไว้ในเครื่องนี้ {timeOf(savedAt)}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button variant="contained" size="small" disableElevation onClick={onRestore} sx={{ minHeight: 36, whiteSpace: "nowrap" }}>
          กรอกต่อจากร่าง
        </Button>
        <Button color="inherit" size="small" onClick={onDiscard} sx={{ minHeight: 36, whiteSpace: "nowrap" }}>
          ทิ้งร่าง
        </Button>
      </Stack>
    </Alert>
  );
}

/** Quiet "saved on this device" note next to the submit button. */
export function DraftSavedNote({ savedAt }: { savedAt: string | null }) {
  if (!savedAt) return null;
  return (
    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", textAlign: "center", mt: 0.5 }} title="ปิดแอปแล้วกลับมากรอกต่อได้">
      บันทึกร่างในเครื่องแล้ว {clockOf(savedAt)}
    </Typography>
  );
}

// Progressive disclosure: one short question first; the detail fields open only on "มี".
// Answering "ไม่มี" clears the rows (onNo) — after a confirm when some are already filled in.
export function YesNoGate({
  question,
  open,
  filled = 0,
  onYes,
  onNo,
  children,
}: {
  question: string;
  open: boolean;
  /** Rows already entered; "ไม่มี" asks before throwing them away. */
  filled?: number;
  onYes: () => void;
  onNo: () => void;
  children: ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} flexWrap="wrap" useFlexGap>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {question}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={open ? "yes" : "no"}
          onChange={(_, v: "yes" | "no" | null) => {
            if (v === "yes") onYes();
            if (v === "no") {
              if (filled > 0) setConfirming(true);
              else onNo();
            }
          }}
          aria-label={question}
          // The answer must read at a glance: the chosen side is solid.
          sx={{ "& .MuiToggleButton-root.Mui-selected": { bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" } } }}
        >
          <ToggleButton value="no" sx={{ px: 2.5, minHeight: 40 }}>
            ไม่มี
          </ToggleButton>
          <ToggleButton value="yes" sx={{ px: 2.5, minHeight: 40 }}>
            มี
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      {open ? <Box sx={{ mt: 1.5 }}>{children}</Box> : null}
      <ConfirmDialog
        open={confirming}
        title="ล้างรายการที่กรอกไว้?"
        description={`เลือก «ไม่มี» จะลบ ${filled} รายการที่กรอกไว้ในหัวข้อนี้`}
        confirmLabel="ลบรายการ"
        cancelLabel="เก็บไว้"
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onNo();
        }}
      />
    </Box>
  );
}

export type ProgressState = "done" | "todo" | "error" | "optional";
export interface ProgressItem { id: string; label: string; state: ProgressState }

const STATE_VIEW: Record<ProgressState, { icon: ReactNode; color: string }> = {
  done: { icon: <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} />, color: "success.main" },
  optional: { icon: <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} />, color: "text.disabled" },
  todo: { icon: <RadioButtonUncheckedOutlinedIcon sx={{ fontSize: 16 }} />, color: "text.secondary" },
  error: { icon: <ErrorOutlineOutlinedIcon sx={{ fontSize: 16 }} />, color: "error.main" },
};

// Sticky checklist over the form: every section with ✓ / ○ / !, tap to jump there.
// Optional sections never block ("ไม่บังคับ"), so the count is of required sections only.
export function FormProgress({ items }: { items: ProgressItem[] }) {
  const required = items.filter((i) => i.state !== "optional");
  const done = required.filter((i) => i.state === "done").length;
  return (
    <Box
      sx={{
        position: "sticky",
        top: { xs: 56, sm: 64 },
        zIndex: 4,
        mx: { xs: -2, md: 0 },
        mb: 2,
        px: { xs: 2, md: 1.5 },
        py: 1,
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: done === required.length ? "success.main" : "text.primary" }}>
        ครบ {done}/{required.length}
      </Typography>
      <Box sx={{ display: "flex", gap: 0.75, overflowX: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
        {items.map((item) => {
          const view = STATE_VIEW[item.state];
          return (
            <ButtonBase
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              aria-label={`${item.label}: ${item.state === "done" ? "ครบแล้ว" : item.state === "error" ? "ต้องแก้" : item.state === "optional" ? "ไม่บังคับ" : "ยังไม่ครบ"}`}
              sx={{
                flexShrink: 0,
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1.5,
                border: 1,
                borderColor: item.state === "error" ? "error.main" : "divider",
                color: view.color,
                typography: "caption",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {view.icon}
              <Box component="span" sx={{ color: item.state === "optional" ? "text.secondary" : "text.primary" }}>
                {item.label}
              </Box>
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
