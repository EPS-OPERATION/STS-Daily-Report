import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import {
  MachineryAllocationTable,
  RoadUsageTable,
  mondayOf,
  todayIso,
  useInspectionRequests,
  useWeeklySummary,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

// EPS morning view: everything contractors requested for TODAY — QAQC
// inspections, machinery bookings and road usage (all keyed by target_date).
export function TodayRequestsPage() {
  const today = todayIso();
  const { projectId } = useCurrentProject();
  const requests = useInspectionRequests(projectId, { from: today, to: today, by: "inspection" });
  const summary = useWeeklySummary(projectId, mondayOf(today));

  const week = summary.data?.data;
  const machinesToday = useMemo(
    () => (week?.machinery ?? []).filter((b) => b.targetDate === today),
    [week, today],
  );
  const roadsToday = useMemo(
    () => (week?.roads ?? []).filter((r) => r.targetDate === today),
    [week, today],
  );
  const inspections = useMemo(() => requests.data?.data ?? [], [requests.data]);
  const total = inspections.length + machinesToday.length + roadsToday.length;

  const err = (q: { error: unknown }): string | null =>
    q.error instanceof HttpError ? q.error.message : q.error instanceof Error ? q.error.message : null;
  const loadError = err(requests) ?? err(summary);

  return (
    <Box>
      <PageHeader
        title="Today Request"
        subtitle={`คำขอประจำวัน · ${today} — QA/QC, เครื่องจักร และถนนที่ขอใช้วันนี้`}
      />

      {!projectId ? (
        <Alert severity="info">Select a project to see today&apos;s requests.</Alert>
      ) : loadError ? (
        <Alert severity="error">Could not load today&apos;s requests: {loadError}</Alert>
      ) : requests.isPending || summary.isPending ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={120} />
        </Stack>
      ) : total === 0 ? (
        <EmptyState
          icon={<FactCheckOutlinedIcon />}
          title="No requests for today"
          description="Contractors haven't requested any inspections, machinery or road usage for today yet — evening reports from yesterday feed this list."
        />
      ) : (
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            {total} request{total === 1 ? "" : "s"} for today · {inspections.length} QAQC · {machinesToday.length}{" "}
            machinery · {roadsToday.length} road usage
          </Typography>

          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="h5">QAQC inspections</Typography>
                <Link component={RouterLink} to="/qaqc" underline="hover" fontSize={13}>
                  Open QAQC board
                </Link>
              </Stack>
              {inspections.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No inspections scheduled for today.
                </Typography>
              ) : (
                <Table size="small" aria-label="Today's QAQC inspections">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Contractor</TableCell>
                      <TableCell>Work item</TableCell>
                      <TableCell>Building</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inspections.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{r.inspectionTime}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{r.contractorName}</TableCell>
                        <TableCell>{r.workItem}</TableCell>
                        <TableCell>{r.buildingCode}</TableCell>
                        <TableCell>
                          <StatusChip status={r.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" sx={{ mb: 1.5 }}>
                Machinery for today
              </Typography>
              {machinesToday.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No machinery booked for today.
                </Typography>
              ) : (
                <MachineryAllocationTable bookings={machinesToday} onlyConflicts={false} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" sx={{ mb: 1.5 }}>
                Road usage for today
              </Typography>
              {roadsToday.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No road usage requested for today.
                </Typography>
              ) : (
                <RoadUsageTable roads={roadsToday} />
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
}
