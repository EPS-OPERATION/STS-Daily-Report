import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { StatusChip } from "@/components/shared/status-chip.js";
import { useActivityDetail } from "@/hooks/use-site-operations.js";
import type { SiteActivityRecord } from "@/types/site-operations.types.js";

export function ActivityDetailDialog({
  id,
  onClose,
  onEdit,
  onCopyToToday,
}: {
  id: string;
  onClose: () => void;
  onEdit: (activity: SiteActivityRecord) => void;
  onCopyToToday: (activity: SiteActivityRecord) => void;
}) {
  const query = useActivityDetail(id),
    activity = query.data?.data;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Activity details</DialogTitle>
      <DialogContent>
        {query.isLoading ? <LinearProgress /> : null}
        {query.isError ? (
          <Alert severity="error">
            Activity could not be loaded.{" "}
            <Button variant="text" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </Alert>
        ) : null}
        {activity ? (
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h6">{activity.title}</Typography>
              <StatusChip status={activity.status} />
            </Stack>
            <Typography>
              {activity.facility?.name ?? "Facility not yet assigned"}
              {activity.facilityPart ? ` / ${activity.facilityPart.code} ${activity.facilityPart.name}` : ""}
            </Typography>
            <Typography color="text.secondary">
              {activity.workDate} · {activity.contractor.name}
            </Typography>
            <Typography>
              {activity.manpower} Workers · {activity.progressPercent}% progress
            </Typography>
            {activity.startTime ? (
              <Typography>
                {activity.startTime}
                {activity.endTime ? `–${activity.endTime}` : ""}
              </Typography>
            ) : null}
            {activity.description ? (
              <Typography sx={{ whiteSpace: "pre-wrap" }}>{activity.description}</Typography>
            ) : null}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant="text" color="inherit" onClick={onClose}>
          Close
        </Button>
        {activity ? (
          <Button variant="text" onClick={() => onCopyToToday(activity)} aria-label={`Use ${activity.title} again`}>
            Use again
          </Button>
        ) : null}
        {activity ? (
          <Button variant="contained" onClick={() => onEdit(activity)}>
            Edit Activity
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
