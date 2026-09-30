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
import type { WeeklyBooking } from "../types/daily-report.types.js";
import { ContractorBadge } from "./contractor-badge.js";

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
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((b, i) => {
            const prev = rows[i - 1];
            const newGroup = !prev || prev.reportDate !== b.reportDate || prev.machineType !== b.machineType;
            return (
              <TableRow
                key={b.id}
                sx={{
                  bgcolor: b.conflict === "conflict" ? "error.light" : b.conflict === "possible" ? "warning.light" : undefined,
                  "& td": newGroup && i > 0 ? { borderTop: 2, borderTopColor: "divider" } : undefined,
                }}
              >
                <TableCell sx={{ whiteSpace: "nowrap" }}>{newGroup ? dayjs(b.reportDate).format("ddd D MMM") : ""}</TableCell>
                <TableCell sx={{ fontWeight: newGroup ? 700 : 400 }}>{b.machineType}</TableCell>
                <TableCell sx={{ fontFamily: "monospace" }}>{b.unitTag ?? "—"}</TableCell>
                <TableCell>{b.buildingName}</TableCell>
                <TableCell>
                  <ContractorBadge code={b.contractorCode} />
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {b.startTime}–{b.endTime}
                </TableCell>
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
