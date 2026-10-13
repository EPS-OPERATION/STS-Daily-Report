import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
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
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state.js";
import type { DailyRequests } from "../types/daily-report.types.js";
import { formatThaiDate } from "../utils/dates.js";
import { ContractorBadge } from "./contractor-badge.js";

type ForecastRow = DailyRequests["forecasts"][number];

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

// History log of Tomorrow Forecast Activities (paper form R003): what each contractor said,
// in its afternoon report, it would work on the next day — filtered by target date range.
export function ForecastHistory({ rows, rangeLabel, fileTag }: { rows: ForecastRow[]; rangeLabel: string; fileTag: string }) {
  const [contractor, setContractor] = useState("all");
  const [search, setSearch] = useState("");

  const contractors = useMemo(() => [...new Set(rows.map((r) => r.contractorCode))].sort(), [rows]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (contractor === "all" || r.contractorCode === contractor) &&
        (!q || `${r.description} ${r.buildingCode} ${r.buildingName} ${r.contractorCode} ${r.contractorName}`.toLowerCase().includes(q)),
    );
  }, [rows, contractor, search]);
  const filtered = contractor !== "all" || search.trim() !== "";

  const exportCsv = () => {
    const head = ["Date", "Contractor", "Description", "Area"];
    const lines = visible.map((r) =>
      [r.targetDate, `${r.contractorCode} ${r.contractorName}`, r.description, `${r.buildingCode} ${r.buildingName}`].map(csvCell).join(","),
    );
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `STS_Tomorrow_Forecast_${fileTag}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={exportCsv}
            disabled={visible.length === 0}
            sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
          >
            ส่งออก CSV
          </Button>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
          <TextField select size="small" label="ผู้รับเหมา" value={contractor} onChange={(e) => setContractor(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="all">ทุกผู้รับเหมา</MenuItem>
            {contractors.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            fullWidth
            placeholder="ค้นหาตามรายละเอียดงาน พื้นที่ หรือผู้รับเหมา"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                : "ลองเปลี่ยนผู้รับเหมาหรือล้างคำค้นหา"
            }
            action={
              rows.length > 0 ? (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setContractor("all");
                    setSearch("");
                  }}
                >
                  ล้างตัวกรอง
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
              {visible.map((r) => (
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

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2.5, py: 1.5, borderTop: 1, borderColor: "divider" }}>
        {filtered ? `แสดง ${visible.length} จาก ${rows.length} รายการ` : `${rows.length} รายการ`}
      </Typography>
    </Card>
  );
}
