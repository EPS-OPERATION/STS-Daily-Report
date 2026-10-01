import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { StatusChip } from "@/components/ui/status-chip.js";
import { useMe } from "@/features/auth/index.js";
import { useReviewReport } from "../hooks/use-daily-report-mutations.js";
import type { ReviewQueueRow } from "../types/daily-report.types.js";

// EPS decision on one submitted report. Contractors never see enabled actions:
// the button row is EPS-only and the API rejects other roles with 403.
export function ReviewDialog({ report, onClose }: { report: ReviewQueueRow | null; onClose: () => void }) {
  const me = useMe();
  const review = useReviewReport();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  useEffect(() => {
    if (report) {
      setNote("");
      setNoteError(null);
      review.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id]);

  const isEps = me.data?.data.user.role === "eps";
  const busy = review.isPending;

  const decide = (decision: "approved" | "rejected") => {
    if (!report || busy) return;
    if (decision === "rejected" && !note.trim()) {
      setNoteError("Describe what the contractor must fix");
      return;
    }
    setNoteError(null);
    review.mutate(
      { reportId: report.id, payload: { decision, note: note.trim() ? note.trim() : undefined } },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={report !== null} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>EPS review</DialogTitle>
      <DialogContent>
        {!report ? null : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {report.contractorName} · {report.reportDate}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {report.totalHeadcount} workers · morning {report.morningStatus} · evening {report.eveningStatus}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <StatusChip status={report.morningStatus} label={`Morning: ${report.morningStatus}`} />
              <StatusChip status={report.eveningStatus} label={`Evening: ${report.eveningStatus}`} />
              <StatusChip status={report.reviewStatus} label={`Review: ${report.reviewStatus}`} />
            </Stack>
            {report.reviewNote ? (
              <Typography variant="body2" color="text.secondary">
                Previous note: {report.reviewNote}
              </Typography>
            ) : null}
            {!isEps ? (
              <Alert severity="info">Only EPS staff can approve — you are signed in as a contractor.</Alert>
            ) : null}
            <TextField
              label="Review note"
              placeholder="Required when rejecting…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              error={Boolean(noteError)}
              helperText={noteError ?? "Visible to the contractor"}
              multiline
              minRows={2}
              fullWidth
              disabled={!isEps || busy}
            />
            {review.isError ? (
              <Alert severity="error">{review.error instanceof Error ? review.error.message : "Review failed"}</Alert>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Button variant="outlined" color="error" onClick={() => decide("rejected")} disabled={!report || !isEps || busy}>
          Reject
        </Button>
        <Button variant="contained" onClick={() => decide("approved")} disabled={!report || !isEps || busy}>
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
