import Chip from "@mui/material/Chip";
import { roadBadgeState, type RoadBadge } from "@sts/shared";

// Badge for a road booking: "ชนกัน" until EPS changes the time, then "แก้ไขแล้ว" (or "ยังชนกัน" if it still collides).
const VIEW: Record<Exclude<RoadBadge, "none">, { label: string; color: "error" | "info"; variant: "filled" | "outlined" }> = {
  clash: { label: "ชนกัน", color: "error", variant: "filled" },
  still_clash: { label: "ยังชนกัน", color: "error", variant: "outlined" },
  edited: { label: "แก้ไขแล้ว", color: "info", variant: "outlined" },
};

export function RoadStatusChip({ clash, adjusted }: { clash: boolean; adjusted: boolean }) {
  const state = roadBadgeState(clash, adjusted);
  if (state === "none") return null;
  const view = VIEW[state];
  return <Chip size="small" label={view.label} color={view.color} variant={view.variant} sx={{ height: 20 }} />;
}
