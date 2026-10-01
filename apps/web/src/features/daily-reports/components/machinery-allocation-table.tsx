import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { StatusChip } from "@/components/ui/status-chip.js";
import type { WeeklyBooking, WeeklySummary } from "../types/daily-report.types.js";
import { ContractorBadge } from "./contractor-badge.js";
import { timeWindowLabel } from "../utils/dates.js";

// Machine × day booking list. Rows sharing date+machine type are grouped so a
// double-booked unit reads as adjacent conflicting rows.
export function MachineryAllocationTable({ bookings, onlyConflicts }: { bookings: WeeklyBooking[]; onlyConflicts: boolean }) {
  const rows = onlyConflicts ? bookings.filter((b) => b.conflict) : bookings;
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
        {onlyConflicts ? "No booking conflicts this week." : "No machinery booked this week."}
      </Typography>
    );
  }
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Machine</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell>Building</TableCell>
            <TableCell>Contractor</TableCell>
            <TableCell>Time</TableCell>
            <TableCell>Purpose</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((b, i) => {
            const prev = rows[i - 1];
            const newGroup = !prev || prev.targetDate !== b.targetDate || prev.machineType !== b.machineType;
            return (
              <TableRow
                key={b.id}
                sx={{
                  bgcolor: b.conflict === "conflict" ? "error.light" : b.conflict === "possible" ? "warning.light" : undefined,
                  "& td": newGroup && i > 0 ? { borderTop: 2, borderTopColor: "divider" } : undefined,
                }}
              >
                <TableCell sx={{ whiteSpace: "nowrap" }}>{newGroup ? dayjs(b.targetDate).format("ddd D MMM") : ""}</TableCell>
                <TableCell sx={{ fontWeight: newGroup ? 700 : 400 }}>{b.machineType}</TableCell>
                <TableCell sx={{ fontFamily: "monospace" }}>{b.unitTag ?? "—"}</TableCell>
                <TableCell>{b.buildingName}</TableCell>
                <TableCell>
                  <ContractorBadge code={b.contractorCode} />
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {timeWindowLabel(b.startTime, b.endTime)}
                </TableCell>
                <TableCell>{b.purpose ?? "—"}</TableCell>
                <TableCell>
                  {b.conflict === "conflict" ? (
                    <StatusChip status="blocked" label="Double-booked" />
                  ) : b.conflict === "possible" ? (
                    <StatusChip status="attention" label="Check unit" />
                  ) : (
                    <StatusChip status="active" label="OK" />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Stack direction="row" spacing={2} sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Double-booked = same machine type and unit number with overlapping hours. Check unit = overlapping hours but at least
          one booking has no unit number.
        </Typography>
      </Stack>
    </Box>
  );
}

export function RoadUsageTable({ roads }: { roads: WeeklySummary["roads"] }) {
  if (roads.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
        No road usage requested this week.
      </Typography>
    );
  }
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Road / lane</TableCell>
            <TableCell>Time</TableCell>
            <TableCell>Contractor</TableCell>
            <TableCell>Next to</TableCell>
            <TableCell>Purpose</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {roads.map((r) => (
            <TableRow key={r.id} sx={{ bgcolor: r.conflict ? "error.light" : undefined }}>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{dayjs(r.targetDate).format("ddd D MMM")}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{r.roadLocation}</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                {r.startTime}–{r.endTime}
              </TableCell>
              <TableCell>
                <ContractorBadge code={r.contractorCode} />
              </TableCell>
              <TableCell>{r.buildingName}</TableCell>
              <TableCell>{r.purpose}</TableCell>
              <TableCell>
                {r.conflict ? <StatusChip status="blocked" label="Clash" /> : <StatusChip status="active" label="OK" />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
