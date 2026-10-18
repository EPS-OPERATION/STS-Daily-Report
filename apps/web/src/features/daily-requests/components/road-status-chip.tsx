import { roadBadgeState, type RoadBadge } from "@sts/shared";
import { StatusChip, type StatusTone } from "@/components/ui/status-chip.js";

// Badge for a road booking: "ชนกัน" until EPS changes the time, then "แก้ไขแล้ว" (or "ยังชนกัน" if it still collides).
const VIEW: Record<Exclude<RoadBadge, "none">, { label: string; tone: StatusTone }> = {
  clash: { label: "ชนกัน", tone: "blocked" },
  still_clash: { label: "ยังชนกัน", tone: "blocked" },
  edited: { label: "แก้ไขแล้ว", tone: "submitted" },
};

export function RoadStatusChip({ clash, adjusted }: { clash: boolean; adjusted: boolean }) {
  const state = roadBadgeState(clash, adjusted);
  if (state === "none") return null;
  const view = VIEW[state];
  return <StatusChip status={view.tone} label={view.label} />;
}
