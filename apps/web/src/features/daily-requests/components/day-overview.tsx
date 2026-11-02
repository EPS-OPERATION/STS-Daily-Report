import { Frame } from "@/components/ui/frame.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import type { UseTodayRequestsState } from "../hooks/use-today-requests.js";

export function DayOverview({ ed }: { ed: UseTodayRequestsState }) {
  const { isRange, clashOnly, setClashOnly, dayRows, shownDays, selectedDay, setDay, hasMachines, hasEquipment } = ed;
  if (!isRange) return null;
  return (
    <Frame>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>ภาพรวมรายวัน</Typography>
          <Typography variant="caption" color="text.secondary">{dayRows.length} วันที่มีคำขอ</Typography>
          <Box sx={{ flex: 1 }} />
          <Chip
            size="small"
            color={clashOnly ? "error" : "default"}
            variant={clashOnly ? "filled" : "outlined"}
            label="Clashing days only"
            onClick={() => setClashOnly((v) => !v)}
          />
        </Stack>
        {shownDays.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 2 }}>ไม่มีคำขอในช่วงนี้</Typography>
        ) : (
          <Table size="small" aria-label="Daily overview">
            <TableHead>
              <TableRow>
                <TableCell>วันที่</TableCell>
                {hasMachines ? <TableCell align="right">เครื่องจักร</TableCell> : null}
                {hasEquipment ? <TableCell align="right">เครื่องมือ</TableCell> : null}
                <TableCell align="right">ถนน</TableCell>
                <TableCell align="right">ชนกัน</TableCell>
                <TableCell align="right">RFI</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shownDays.map((d) => (
                <TableRow
                  key={d.date}
                  hover
                  selected={d.date === selectedDay}
                  tabIndex={0}
                  aria-current={d.date === selectedDay ? "true" : undefined}
                  onClick={() => setDay(d.date)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setDay(d.date);
                  }}
                  sx={{ cursor: "pointer", fontVariantNumeric: "tabular-nums" }}
                >
                  <TableCell>{dayjs(d.date).format("ddd D MMM")}</TableCell>
                  {hasMachines ? <TableCell align="right">{d.machines}</TableCell> : null}
                  {hasEquipment ? <TableCell align="right">{d.equipment}</TableCell> : null}
                  <TableCell align="right">{d.roads}</TableCell>
                  <TableCell align="right">
                    {d.clashes > 0 ? <StatusChip status="blocked" label={String(d.clashes)} /> : "—"}
                  </TableCell>
                  <TableCell align="right">{d.rfi}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Frame>
  );
}
