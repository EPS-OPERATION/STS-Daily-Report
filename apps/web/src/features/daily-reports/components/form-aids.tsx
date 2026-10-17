import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
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
  icon,
  noLabel = "ไม่มี",
  yesLabel = "มี",
  noColor = "primary",
  yesColor = "primary",
}: {
  question: string;
  open: boolean;
  /** Rows already entered; "ไม่มี" asks before throwing them away. */
  filled?: number;
  onYes: () => void;
  onNo: () => void;
  children: ReactNode;
  icon?: ReactNode;
  noLabel?: string;
  yesLabel?: string;
  noColor?: "primary" | "secondary" | "success" | "error" | "info" | "warning";
  yesColor?: "primary" | "secondary" | "success" | "error" | "info" | "warning";
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        {icon}
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {question}
        </Typography>
      </Stack>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={open ? "yes" : "no"}
        onChange={(_, v: "yes" | "no" | null) => {
          if (v === "yes") onYes();
          if (v === "no") {
            if (filled > 0) setConfirming(true);
            else onNo();
          }
        }}
        aria-label={question}
      >
        <ToggleButton value="no" color={noColor}>
          {noLabel}
        </ToggleButton>
        <ToggleButton value="yes" color={yesColor}>
          {yesLabel}
        </ToggleButton>
      </ToggleButtonGroup>
      {open ? <Box sx={{ mt: 2 }}>{children}</Box> : null}
      <ConfirmDialog
        open={confirming}
        title="ล้างรายการที่กรอกไว้?"
        description={`เลือก «${noLabel}» จะลบ ${filled} รายการที่กรอกไว้ในหัวข้อนี้`}
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

const STATE_TEXT: Record<ProgressState, string> = { done: "กรอกครบแล้ว", todo: "ยังไม่ครบ", error: "ต้องแก้ไข", optional: "กรอกเฉพาะถ้ามี" };

// Step badge: the section's number, a check once complete, "!" when something must be fixed.
function StepBadge({ n, state }: { n: number; state: ProgressState }) {
  const filled = state === "done" || state === "error";
  return (
    <Box
      component="span"
      sx={{
        width: 20,
        height: 20,
        flexShrink: 0,
        borderRadius: "50%",
        display: "inline-grid",
        placeItems: "center",
        fontSize: 11,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        border: 1.5,
        borderColor: state === "done" ? "success.main" : state === "error" ? "error.main" : state === "optional" ? "divider" : "text.secondary",
        bgcolor: state === "done" ? "success.main" : state === "error" ? "error.main" : "transparent",
        color: filled ? "common.white" : state === "optional" ? "text.secondary" : "text.primary",
      }}
    >
      {state === "done" ? <CheckOutlinedIcon sx={{ fontSize: 14 }} /> : state === "error" ? "!" : n}
    </Box>
  );
}

// Sticky step bar over the form: every section, numbered like its card, tap to jump there.
// Optional sections ("ถ้ามี") never count; the counter is of required sections only.
export function FormProgress({ items }: { items: ProgressItem[] }) {
  const required = items.filter((i) => i.state !== "optional");
  const done = required.filter((i) => i.state === "done").length;
  const complete = done === required.length;
  return (
    <Box
      component="nav"
      aria-label="ความครบถ้วนของรายงาน"
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
        gap: 1.25,
      }}
    >
      <Box sx={{ flexShrink: 0, pr: 1.25, borderRight: 1, borderColor: "divider", lineHeight: 1.2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11 }}>
          หัวข้อบังคับ
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: complete ? "success.main" : "text.primary" }}>
          {done}/{required.length} {complete ? "ครบ" : ""}
        </Typography>
      </Box>
      {/* Wide screens wrap every step into view; phones scroll sideways, the fade says there is more. */}
      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          minWidth: 0,
          flexWrap: { xs: "nowrap", md: "wrap" },
          overflowX: { xs: "auto", md: "visible" },
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          maskImage: { xs: "linear-gradient(to right, #000 85%, transparent)", md: "none" },
        }}
      >
        {items.map((item, i) => (
          <ButtonBase
            key={item.id}
            onClick={() => scrollToSection(item.id)}
            aria-label={`ขั้นที่ ${i + 1} ${item.label}: ${STATE_TEXT[item.state]}`}
            title={STATE_TEXT[item.state]}
            sx={{
              flexShrink: 0,
              gap: 0.75,
              pl: 0.5,
              pr: 1,
              py: 0.5,
              borderRadius: 999,
              typography: "caption",
              fontWeight: 600,
              whiteSpace: "nowrap",
              color: item.state === "optional" ? "text.secondary" : item.state === "error" ? "error.main" : "text.primary",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <StepBadge n={i + 1} state={item.state} />
            {item.label}
            {item.state === "optional" ? (
              <Box component="span" sx={{ fontWeight: 400, color: "text.disabled" }}>
                · ถ้ามี
              </Box>
            ) : null}
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
}
