import CloseIcon from "@mui/icons-material/CloseOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { StatusChip } from "@/components/ui/status-chip.js";
import type { PlanActivity, ZoneState } from "../types/site-plan.types.js";
import { summarizeZone } from "../utils/zone-status.js";

export function ZoneInspector({
  zone,
  date,
  activities,
  onClose,
}: {
  zone: { id: string; code: string; name: string; state: ZoneState };
  date: string;
  activities: PlanActivity[];
  onClose: () => void;
}) {
  const summary = summarizeZone(activities);

  return (
    <Box
      component="aside"
      aria-label="Zone activity inspector"
      sx={{ p: { xs: 2, sm: 2.5 }, height: "100%", overflowY: "auto" }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Zone {zone.code} · {date}
            </Typography>
            <Typography variant="h6">{zone.name}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <StatusChip status={zone.state} />
            <IconButton aria-label="Close zone details" onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            borderTop: "1px solid",
            borderBottom: "1px solid",
            borderColor: "divider",
            py: 1.25,
          }}
        >
          {[
            [summary.activityCount, "Activities"],
            [summary.workers, "Workers"],
            [summary.contractorCount, "Contractors"],
          ].map(([value, label], index) => (
            <Box
              key={label}
              sx={{
                textAlign: "center",
                borderLeft: index > 0 ? "1px solid" : undefined,
                borderColor: "divider",
              }}
            >
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                {value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
            </Box>
          ))}
        </Box>

        {activities.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No activity reported for this date.
          </Typography>
        ) : (
          activities.map((activity) => (
            <Box key={activity.id} sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 1.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {activity.contractor.name}
                </Typography>
                <StatusChip status={activity.status} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {activity.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activity.manpower} workers
                {activity.startTime ? ` · ${activity.startTime}${activity.endTime ? `–${activity.endTime}` : ""}` : ""}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, height: 20 }}>
                <LinearProgress variant="determinate" value={activity.progressPercent} sx={{ flexGrow: 1 }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ width: 38, flexShrink: 0, textAlign: "right" }}
                >
                  {activity.progressPercent}%
                </Typography>
              </Stack>
            </Box>
          ))
        )}
      </Stack>
    </Box>
  );
}
