import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import {
  ReviewDialog,
  todayIso,
  useReviewQueue,
  type ReviewQueueRow,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { CONTRACTOR_OPTIONS, DAILY_REPORTS } from "@/mock/site-data.js";
import { HttpError } from "@/services/http/client.js";

// Friendly EPS page: just two jobs — review new reports, then look back at history.
// Everything else (summary cards, tabs, contractor grouping, DataGrid, menus) was cut on purpose.
export function DailyReportsPage() {
  const [search, setSearch] = useState("");
  const [contractor, setContractor] = useState("All Contractors");
  const [reviewTarget, setReviewTarget] = useState<ReviewQueueRow | null>(null);
  const { projectId } = useCurrentProject();
  const reviewQueue = useReviewQueue(projectId, todayIso());

  const inbox: ReviewQueueRow[] = useMemo(() => {
    const rows = reviewQueue.data?.data ?? [];
    // Show only what still needs a decision — approved / rejected live in history.
    return rows.filter((r) => r.reviewStatus === "pending");
  }, [reviewQueue.data]);

  const history = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DAILY_REPORTS.filter((r) => {
      if ((r.status as string) === "Draft") return false;
      if (contractor !== "All Contractors" && r.contractor !== contractor) return false;
      if (q && !`${r.contractor} ${r.zone} ${r.date}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [contractor, search]);


  return (
    <Box>
      <PageHeader
        title="Daily Reports"
        subtitle="New reports arrive here — review them, then approve. Past reports stay in the history log below."
      />

      {/* 1 — Inbox: what needs your decision today */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="h5">Inbox — needs your review</Typography>
            {inbox.length > 0 ? <StatusChip status="pending" label={`${inbox.length} waiting`} /> : null}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {inbox.length === 0
              ? "You're all caught up. Nice work!"
              : "Tap Review to read a report, then Approve or ask the contractor to fix it."}
          </Typography>

          {!projectId ? (
            <Alert severity="info">Pick a project above to see today&apos;s incoming reports.</Alert>
          ) : reviewQueue.isPending ? (
            <Typography variant="body2" color="text.secondary">
              Checking for new reports…
            </Typography>
          ) : reviewQueue.isError ? (
            <Alert severity="error">
              {reviewQueue.error instanceof HttpError ? reviewQueue.error.message : "Could not load new reports"}
            </Alert>
          ) : inbox.length === 0 ? (
            <EmptyState
              icon={<CheckCircleOutlineIcon />}
              title="Inbox is empty"
              description="No reports are waiting for approval right now. New submissions from contractors will appear here."
            />
          ) : (
            <Table size="small" aria-label="Reports waiting for review">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Contractor</TableCell>
                  <TableCell align="right">Workers</TableCell>
                  <TableCell>Report</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inbox.map((q) => (
                  <TableRow key={q.id} hover>
                    <TableCell>{q.reportDate}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{q.contractorName}</TableCell>
                    <TableCell align="right">{q.totalHeadcount}</TableCell>
                    <TableCell>
                      <StatusChip status={q.eveningStatus === "submitted" ? "submitted" : "pending"} />
                    </TableCell>

                    <TableCell align="right">
                      <Button size="small" variant="contained" onClick={() => setReviewTarget(q)}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <ReviewDialog report={reviewTarget} onClose={() => setReviewTarget(null)} />

      {/* 2 — History: simple read-only log */}
      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            History log
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Every past report in one place. Search or pick a contractor to narrow it down.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Search history"
              placeholder="Try contractor, zone, or date…"
              size="small"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="history-contractor">Contractor</InputLabel>
              <Select
                labelId="history-contractor"
                label="Contractor"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
              >
                <MenuItem value="All Contractors">All Contractors</MenuItem>
                {CONTRACTOR_OPTIONS.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {history.length === 0 ? (
            <EmptyState
              icon={<InboxOutlinedIcon />}
              title="No reports found"
              description="Try a different search, or pick another contractor."
              action={
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSearch("");
                    setContractor("All Contractors");
                  }}
                >
                  Clear search
                </Button>
              }
            />
          ) : (
            <Table size="small" aria-label="Report history">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Contractor</TableCell>
                  <TableCell>Zone</TableCell>
                  <TableCell align="right">Workers</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.date}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{r.contractor}</TableCell>
                    <TableCell>{r.zone}</TableCell>
                    <TableCell align="right">{r.manpower}</TableCell>
                    <TableCell>
                      <StatusChip status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Showing {history.length} reports. Approval happens in the inbox above — history is read-only.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
