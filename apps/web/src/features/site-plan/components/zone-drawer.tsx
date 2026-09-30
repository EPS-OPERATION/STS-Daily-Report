import CloseIcon from "@mui/icons-material/CloseOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { StatusChip } from "@/components/ui/status-chip.js";
import type { PlanActivity, ZoneState } from "../types/site-plan.types.js";
import { summarizeZone } from "../utils/zone-status.js";

export function ZoneDrawer({
  zone,
  date,
  activities,
  onClose,
  onAdd,
}: {
  zone: { id: string; code: string; name: string; state: ZoneState } | null;
  date: string;
  activities: PlanActivity[];
  onClose: () => void;
  onAdd: () => void;
}) {
  const summary = summarizeZone(activities);
  return (
    <Drawer
      anchor="right"
      open={zone !== null}
      onClose={onClose}
      sx={{ "& .MuiDrawer-paper": { width: { xs: "100%", sm: 380 }, p: 3 } }}
    >
      {zone ? (
        <Stack spacing={2.5}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Zone {zone.code} · {date}
              </Typography>
              <Typography variant="h4">{zone.name}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <StatusChip status={zone.state} />
              <IconButton aria-label="Close zone details" onClick={onClose} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {summary.contractorCount} contractor{summary.contractorCount === 1 ? "" : "s"} · {summary.workers} workers ·{" "}
            {summary.activityCount} {summary.activityCount === 1 ? "activity" : "activities"}
          </Typography>

          {activities.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No activity recorded for this date.
            </Typography>
          ) : (
            activities.map((a) => (
              <Box key={a.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {a.contractor.name}
                  </Typography>
                  <StatusChip status={a.status} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {a.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {a.manpower} workers
                  {a.startTime ? ` · ${a.startTime}${a.endTime ? `–${a.endTime}` : ""}` : ""}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, height: 20 }}>
                  <LinearProgress variant="determinate" value={a.progressPercent} sx={{ flexGrow: 1 }} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ width: 38, flexShrink: 0, textAlign: "right" }}
                  >
                    {a.progressPercent}%
                  </Typography>
                </Stack>
              </Box>
            ))
          )}

          <Button variant="outlined" onClick={onAdd}>
            Add Activity
          </Button>
        </Stack>
      ) : null}
    </Drawer>
  );
}
