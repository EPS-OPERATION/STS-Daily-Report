import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state.js";
import { downloadCsv, printSections, type ExportSection } from "../utils/report-export.js";
import { ExportButtons } from "./export-buttons.js";
import type { DailyRequests } from "../types/daily-request.types.js";
import { formatThaiDate } from "@/lib/dates.js";
import { ContractorBadge } from "@/features/contractors/index.js";

type ForecastRow = DailyRequests["forecasts"][number];


// History log of Tomorrow Forecast Activities (paper form R003): what each contractor said,
// in its afternoon report, it would work on the next day — filtered by target date range.
export function ForecastHistory({ rows, rangeLabel, fileTag }: { rows: ForecastRow[]; rangeLabel: string; fileTag: string }) {
  const [contractor, setContractor] = useState("all");
  const [area, setArea] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);

  const contractors = useMemo(() => [...new Set(rows.map((r) => r.contractorCode))].sort(), [rows]);
  // Distinct work areas (building code + name) so the area can be picked from a dropdown.
  const areas = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    for (const r of rows) {
      const id = r.buildingId || r.buildingCode || "";
      if (!id || map.has(id)) continue;
      map.set(id, { id, code: r.buildingCode, name: r.buildingName });
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));
  }, [rows]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const areaId = r.buildingId || r.buildingCode || "";
      return (
        (contractor === "all" || r.contractorCode === contractor) &&
        (area === "all" || areaId === area) &&
        (!q || `${r.description} ${r.buildingCode} ${r.buildingName} ${r.contractorCode} ${r.contractorName}`.toLowerCase().includes(q))
      );
    });
  }, [rows, contractor, area, search]);
  const filtered = contractor !== "all" || area !== "all" || search.trim() !== "";
  // Long plans page through the rows; the filters above still apply to all of them.
  const current = Math.min(page, Math.max(0, Math.ceil(visible.length / perPage) - 1));
  const pageRows = visible.slice(current * perPage, (current + 1) * perPage);

  const section = (forPrint = false): ExportSection => ({
    title: "Tomorrow Forecast Activities",
    head: ["วันที่", "ผู้รับเหมา", "รายละเอียดงาน", "พื้นที่"],
    rows: visible.map((r) => [
      forPrint ? formatThaiDate(r.targetDate) : r.targetDate,
      `${r.contractorCode} ${r.contractorName}`,
      r.description,
      `${r.buildingCode} ${r.buildingName}`,
    ]),
  });
  const exportCsv = () => downloadCsv(`STS_Tomorrow_Forecast_${fileTag}.csv`, [section(false)]);
  const print = () => printSections("Tomorrow Forecast Activities", `${rangeLabel} · ${visible.length} รายการ`, [section(true)]);

  return (
    <Card>
      <Box sx={{ p: 2.5, pb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5}>
          <Box>
            <Typography variant="h4">Tomorrow Forecast Activities</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {rangeLabel} · แผนงานที่ผู้รับเหมาแจ้งไว้ในรายงานบ่ายของวันก่อน
            </Typography>
          </Box>
          <ExportButtons onPrint={print} onCsv={exportCsv} disabled={visible.length === 0} />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
          <TextField select size="small" label="Contractor" value={contractor} onChange={(e) => setContractor(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="all">All contractors</MenuItem>
            {contractors.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="พื้นที่ (Area)" value={area} onChange={(e) => { setArea(e.target.value); setPage(0); }} sx={{ minWidth: 220 }}>
            <MenuItem value="all">ทุกพื้นที่</MenuItem>
            {areas.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.code} {a.name ? `— ${a.name}` : ""}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            fullWidth
            placeholder="ค้นหาตามรายละเอียดงาน พื้นที่ หรือผู้รับเหมา"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
              htmlInput: { "aria-label": "ค้นหา Tomorrow Forecast Activities" },
            }}
          />
        </Stack>
      </Box>

      {rows.length === 0 || visible.length === 0 ? (
        <Box sx={{ p: 2.5, pt: 0 }}>
          <EmptyState
            icon={rows.length === 0 ? <EventNoteOutlinedIcon /> : <SearchOutlinedIcon />}
            title={rows.length === 0 ? "ไม่มีแผนงานในช่วงวันที่นี้" : "ไม่มีรายการที่ตรงกับตัวกรอง"}
            description={
              rows.length === 0
                ? "รายการจะปรากฏเมื่อผู้รับเหมากรอก Tomorrow Forecast Activities ในรายงานบ่าย — ลองเลือกช่วงวันที่อื่น"
                : "ลองเปลี่ยนผู้รับเหมา/พื้นที่ หรือล้างคำค้นหา"
            }
            action={
              rows.length > 0 ? (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setContractor("all");
                    setArea("all");
                    setSearch("");
                    setPage(0);
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        </Box>
      ) : (
        <TableContainer sx={{ borderTop: 1, borderColor: "divider" }}>
          <Table size="small" aria-label="Tomorrow Forecast Activities" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                {["วันที่ทำงาน", "ผู้รับเหมา", "รายละเอียดงาน (Description)", "พื้นที่ (Area)"].map((h) => (
                  <TableCell key={h} sx={{ color: "text.secondary", bgcolor: "grey.50", whiteSpace: "nowrap" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{formatThaiDate(r.targetDate)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ContractorBadge code={r.contractorCode} />
                      <Typography variant="body2" sx={{ display: { xs: "none", md: "block" } }}>
                        {r.contractorName}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ minWidth: 240 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {r.description}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {r.buildingCode}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.buildingName}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {visible.length > 0 ? (
        <TablePagination
          component="div"
          count={visible.length}
          page={current}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={perPage}
          onRowsPerPageChange={(e) => {
            setPerPage(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="แถวต่อหน้า"
        />
      ) : null}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2.5, py: 1.5, borderTop: 1, borderColor: "divider" }}>
        {filtered ? `แสดง ${visible.length} จาก ${rows.length} รายการ` : `${rows.length} รายการ`}
      </Typography>
    </Card>
  );
}
