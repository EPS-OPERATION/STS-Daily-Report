import AltRouteOutlinedIcon from "@mui/icons-material/AltRouteOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
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
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { useMemo, useState, type ComponentType } from "react";
import { EmptyState } from "@/components/ui/empty-state.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import { formatThaiDate } from "../utils/dates.js";
import { ContractorBadge } from "./contractor-badge.js";

export type AgendaKind = "machine" | "equipment" | "road" | "permit" | "rfi" | "work";

// One line of tomorrow's coordination agenda, whatever the source (request or planned work).
export interface AgendaRow {
  id: string;
  kind: AgendaKind;
  /** HH:mm start used for ordering; "" = all day / no time. */
  startTime: string;
  timeLabel: string;
  contractorCode: string | null;
  contractorName: string | null;
  buildingCode: string;
  buildingName: string;
  title: string;
  detail: string | null;
  /** Booking overlaps another contractor's — raised at the 17:00 coordination meeting. */
  clash: boolean;
}

const KINDS: { kind: AgendaKind; label: string; icon: ComponentType<SvgIconProps> }[] = [
  { kind: "machine", label: "เครื่องจักร", icon: PrecisionManufacturingOutlinedIcon },
  { kind: "equipment", label: "อุปกรณ์", icon: BuildOutlinedIcon },
  { kind: "road", label: "ถนน", icon: AltRouteOutlinedIcon },
  { kind: "permit", label: "ใบอนุญาต", icon: VerifiedUserOutlinedIcon },
  { kind: "rfi", label: "ขอตรวจ QAQC", icon: FactCheckOutlinedIcon },
  { kind: "work", label: "งานที่วางแผน", icon: EngineeringOutlinedIcon },
];
const KIND_BY_ID = Object.fromEntries(KINDS.map((k) => [k.kind, k])) as Record<AgendaKind, (typeof KINDS)[number]>;
const KIND_ORDER = Object.fromEntries(KINDS.map((k, i) => [k.kind, i])) as Record<AgendaKind, number>;

// Timed items in clock order after the all-day ones, so the table reads like a day sheet.
export function sortAgenda(rows: AgendaRow[]): AgendaRow[] {
  return [...rows].sort(
    (a, b) =>
      a.startTime.localeCompare(b.startTime) ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.buildingCode.localeCompare(b.buildingCode),
  );
}

const csvCell = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function TomorrowAgenda({ tomorrow, rows }: { tomorrow: string; rows: AgendaRow[] }) {
  const [kind, setKind] = useState<AgendaKind | "all">("all");
  const [contractor, setContractor] = useState("all");
  const [search, setSearch] = useState("");

  const contractors = useMemo(
    () => [...new Set(rows.map((r) => r.contractorCode).filter((c): c is string => Boolean(c)))].sort(),
    [rows],
  );
  const countByKind = useMemo(() => {
    const m = new Map<AgendaKind, number>();
    for (const r of rows) m.set(r.kind, (m.get(r.kind) ?? 0) + 1);
    return m;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (contractor !== "all" && r.contractorCode !== contractor) return false;
      if (q && !`${r.title} ${r.detail ?? ""} ${r.buildingCode} ${r.buildingName} ${r.contractorCode ?? ""} ${r.contractorName ?? ""}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [rows, kind, contractor, search]);

  const clashes = rows.filter((r) => r.clash).length;
  const filtered = kind !== "all" || contractor !== "all" || search.trim() !== "";

  const exportCsv = () => {
    const head = ["Time", "Type", "Contractor", "Building", "Request", "Detail", "Clash"];
    const lines = visible.map((r) =>
      [
        r.timeLabel,
        KIND_BY_ID[r.kind].label,
        r.contractorCode ?? "",
        `${r.buildingCode} ${r.buildingName}`,
        r.title,
        r.detail ?? "",
        r.clash ? "yes" : "",
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `STS_Tomorrow_Plan_${tomorrow}.csv`;
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
            <Typography variant="h4">แผนงานพรุ่งนี้</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {formatThaiDate(tomorrow)} · คำขอและงานที่ผู้รับเหมาส่งมาในรายงานบ่าย สำหรับประชุมประสานงาน 17:00
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

        {clashes > 0 ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {clashes} รายการเวลาชนกับผู้รับเหมาอื่น — จัดคิวในที่ประชุมก่อนวันทำงาน
          </Alert>
        ) : null}

        {/* Type filter doubles as the summary: every count is also a one-tap filter. */}
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }} role="group" aria-label="กรองตามประเภท">
          <Chip
            label={`ทั้งหมด ${rows.length}`}
            clickable
            color={kind === "all" ? "primary" : "default"}
            variant={kind === "all" ? "filled" : "outlined"}
            onClick={() => setKind("all")}
          />
          {KINDS.map(({ kind: k, label, icon: Icon }) => {
            const n = countByKind.get(k) ?? 0;
            const on = kind === k;
            return (
              <Chip
                key={k}
                icon={<Icon style={{ fontSize: 16 }} />}
                label={`${label} ${n}`}
                clickable
                disabled={n === 0 && !on}
                color={on ? "primary" : "default"}
                variant={on ? "filled" : "outlined"}
                onClick={() => setKind(on ? "all" : k)}
              />
            );
          })}
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
          <TextField
            select
            size="small"
            label="ผู้รับเหมา"
            value={contractor}
            onChange={(e) => setContractor(e.target.value)}
            sx={{ minWidth: 200 }}
          >
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
            placeholder="ค้นหาตามรายการ อาคาร หรือผู้รับเหมา"
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
              htmlInput: { "aria-label": "ค้นหาแผนงานพรุ่งนี้" },
            }}
          />
        </Stack>
      </Box>

      {rows.length === 0 ? (
        <Box sx={{ p: 2.5, pt: 0 }}>
          <EmptyState
            icon={<EventNoteOutlinedIcon />}
            title="ยังไม่มีแผนงานสำหรับพรุ่งนี้"
            description="รายการจะปรากฏเมื่อผู้รับเหมาส่งรายงานบ่ายพร้อมคำขอเครื่องจักร อุปกรณ์ ถนน ใบอนุญาต หรือขอตรวจ QAQC"
          />
        </Box>
      ) : visible.length === 0 ? (
        <Box sx={{ p: 2.5, pt: 0 }}>
          <EmptyState
            icon={<SearchOutlinedIcon />}
            title="ไม่มีรายการที่ตรงกับตัวกรอง"
            description="ลองเปลี่ยนประเภท ผู้รับเหมา หรือล้างคำค้นหา"
            action={
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setKind("all");
                  setContractor("all");
                  setSearch("");
                }}
              >
                ล้างตัวกรอง
              </Button>
            }
          />
        </Box>
      ) : (
        <TableContainer sx={{ borderTop: 1, borderColor: "divider" }}>
          <Table size="small" aria-label="แผนงานและคำขอสำหรับพรุ่งนี้" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                {["เวลา", "ประเภท", "ผู้รับเหมา", "อาคาร / พื้นที่", "รายการ"].map((h) => (
                  <TableCell key={h} sx={{ color: "text.secondary", bgcolor: "grey.50", whiteSpace: "nowrap" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((r) => {
                const meta = KIND_BY_ID[r.kind];
                const Icon = meta.icon;
                return (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                      {r.timeLabel}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                        <Icon sx={{ fontSize: 16 }} aria-hidden="true" />
                        <Typography variant="body2" color="inherit">
                          {meta.label}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {r.contractorCode ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <ContractorBadge code={r.contractorCode} />
                          {r.contractorName ? (
                            <Typography variant="body2" sx={{ display: { xs: "none", lg: "block" } }}>
                              {r.contractorName}
                            </Typography>
                          ) : null}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {r.buildingCode}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.buildingName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 260 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {r.title}
                        </Typography>
                        {r.clash ? <StatusChip status="attention" label="ชนกับผู้อื่น" /> : null}
                      </Stack>
                      {r.detail ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {r.detail}
                        </Typography>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
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
