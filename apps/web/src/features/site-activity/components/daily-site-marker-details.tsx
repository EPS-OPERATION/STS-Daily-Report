import { useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { DailySiteMarkerIcon } from "./daily-site-marker-icon.js";
import { dailySiteMarkerIcons } from "./daily-site-marker-icons.js";
import type { DailySiteMarker } from "../types/daily-site-marker.types.js";

export function DailySiteMarkerDetails({
  marker,
  onClose,
  onEdit,
  onMove,
  onWithdraw,
}: {
  marker: DailySiteMarker | null;
  onClose: () => void;
  onEdit: () => void;
  onMove: () => void;
  onWithdraw: () => Promise<void>;
}) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  if (!marker) return null;
  const icon = dailySiteMarkerIcons[marker.iconKey];
  const details = (
    <Stack spacing={1.5} sx={{ p: mobile ? 2 : 0 }}>
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Box
          sx={{
            width: 42,
            height: 42,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            bgcolor: "action.hover",
          }}
        >
          <DailySiteMarkerIcon iconKey={marker.iconKey} color="primary" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6">{icon.label}</Typography>
          <Typography variant="body2" color="text.secondary">
            {marker.contractor.name}
          </Typography>
        </Box>
        {!mobile ? (
          <IconButton aria-label="Close Site Marker details" onClick={onClose}>
            <CloseOutlinedIcon />
          </IconButton>
        ) : null}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {dayjs(marker.workDate).format("DD MMM YYYY")} · Submitted by {marker.createdBy.displayName || "Unknown user"} ·{" "}
        {dayjs(marker.createdAt).format("HH:mm")}
      </Typography>
      <Divider />
      <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {marker.comment}
      </Typography>
      {withdrawError ? <Alert severity="error">{withdrawError}</Alert> : null}
      {marker.facility ? (
        <Typography variant="body2" color="text.secondary">
          Facility · {marker.facility.name}
        </Typography>
      ) : null}
      {marker.updatedBy ? (
        <Typography variant="caption" color="text.secondary">
          Updated by {marker.updatedBy.displayName || "Unknown user"} ·{" "}
          {dayjs(marker.updatedAt).format("DD MMM, HH:mm")}
        </Typography>
      ) : null}
      {marker.canEdit ? (
        <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
          <Button variant="outlined" onClick={onEdit} sx={{ flex: 1 }}>
            Edit
          </Button>
          <Button variant="outlined" onClick={onMove} sx={{ flex: 1 }}>
            Move
          </Button>
          <Button color="error" onClick={() => setConfirmWithdraw(true)} sx={{ flex: 1 }}>
            Withdraw
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
  const confirm = (
    <Dialog open={confirmWithdraw} onClose={() => !withdrawing && setConfirmWithdraw(false)} fullWidth maxWidth="xs">
      <DialogTitle>Withdraw marker?</DialogTitle>
      <DialogContent>
        <Alert severity="info">It will leave the active map layer, and its submission history will be preserved.</Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfirmWithdraw(false)} disabled={withdrawing} color="inherit">
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={withdrawing}
          onClick={async () => {
            setWithdrawing(true);
            setWithdrawError(null);
            try {
              await onWithdraw();
              setConfirmWithdraw(false);
            } catch (error) {
              setWithdrawError(error instanceof Error ? error.message : "The marker could not be withdrawn.");
            } finally {
              setWithdrawing(false);
            }
          }}
        >
          Withdraw marker
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      {mobile ? (
        <Drawer
          anchor="bottom"
          open
          onClose={onClose}
          slotProps={{ paper: { sx: { maxHeight: "70vh", borderRadius: "12px 12px 0 0" } } }}
        >
          <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, pt: 1 }}>
            <IconButton aria-label="Close Site Marker details" onClick={onClose}>
              <CloseOutlinedIcon />
            </IconButton>
          </Stack>
          {details}
        </Drawer>
      ) : (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
          <DialogTitle>Daily Site Marker</DialogTitle>
          <DialogContent sx={{ pt: "24px !important" }}>{details}</DialogContent>
        </Dialog>
      )}
      {confirm}
    </>
  );
}
