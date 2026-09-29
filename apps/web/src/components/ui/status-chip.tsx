import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DraftIcon from "@mui/icons-material/RadioButtonUnchecked";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";

// Semantic status chip: icon + label so status never depends on color alone.
// Tones are generic operational states; domain workflow stays in features.
type ToneStyle = { bg: string; fg: string; icon: typeof SendOutlinedIcon };

export type StatusTone =
  | "draft"
  | "submitted"
  | "pending"
  | "reviewed"
  | "approved"
  | "completed"
  | "rejected"
  | "active"
  | "attention"
  | "blocked"
  | "idle";

export function StatusChip({ status, label }: { status: string; label?: string }) {
  const theme = useTheme();
  const key = status.toLowerCase() as StatusTone;
  const table: Record<StatusTone, ToneStyle> = {
      draft: { bg: theme.palette.grey[100], fg: theme.palette.text.secondary, icon: DraftIcon },
      submitted: { bg: theme.palette.info.light, fg: theme.palette.info.dark, icon: SendOutlinedIcon },
      pending: { bg: theme.palette.warning.light, fg: theme.palette.warning.dark, icon: ScheduleOutlinedIcon },
      reviewed: { bg: "#EDE9FE", fg: "#6D28D9", icon: RateReviewOutlinedIcon },
      approved: { bg: theme.palette.success.light, fg: theme.palette.success.dark, icon: CheckCircleOutlineIcon },
      completed: { bg: theme.palette.success.light, fg: theme.palette.success.dark, icon: CheckCircleOutlineIcon },
      rejected: { bg: theme.palette.error.light, fg: theme.palette.error.dark, icon: CancelOutlinedIcon },
      active: { bg: theme.palette.success.light, fg: theme.palette.success.dark, icon: CheckCircleOutlineIcon },
      attention: { bg: theme.palette.warning.light, fg: theme.palette.warning.dark, icon: WarningAmberOutlinedIcon },
      blocked: { bg: theme.palette.error.light, fg: theme.palette.error.dark, icon: ErrorOutlineIcon },
      idle: { bg: theme.palette.grey[100], fg: theme.palette.text.secondary, icon: DraftIcon },
    };
  const entry = (table as Record<string, { bg: string; fg: string; icon: typeof SendOutlinedIcon }>)[key] ?? {
    bg: theme.palette.grey[100],
    fg: theme.palette.text.secondary,
    icon: DraftIcon,
  };
  const Icon = entry.icon;
  return (
    <Chip
      size="small"
      icon={<Icon style={{ fontSize: 14 }} />}
      label={label ?? status}
      sx={{ backgroundColor: entry.bg, color: entry.fg, borderRadius: 999 }}
    />
  );
}
