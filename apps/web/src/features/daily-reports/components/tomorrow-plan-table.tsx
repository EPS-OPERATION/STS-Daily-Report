import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import { ContractorBadge } from "./contractor-badge.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { formatThaiDate } from "../utils/dates.js";
import type {
  InspectionRequest,
  ReportEquipmentRequest,
  WeeklyBooking,
  WeeklySummary,
} from "../types/daily-report.types.js";

export interface TomorrowActivityItem {
  id: string;
  reportDate: string;
  contractorCode: string;
  contractorName: string;
  buildingCode: string;
  buildingName: string;
  workDescription: string;
  headcount: number;
  planPercent: number;
  linkedResource?: string | null;
}

interface TomorrowPlanTableProps {
  tomorrow: string;
  items: TomorrowActivityItem[];
  contractors: string[];
  selectedContractor: string;
  onSelectContractor: (c: string) => void;
  plans: {
    machinery: WeeklyBooking[];
    roads: WeeklySummary["roads"];
    equipment: ReportEquipmentRequest[];
  } | null;
  inspections: InspectionRequest[];
}

export function TomorrowPlanTable({
  tomorrow,
  items,
  contractors,
  selectedContractor,
  onSelectContractor,
  plans,
  inspections,
}: TomorrowPlanTableProps) {
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("All Buildings");

  // Distinct buildings from tomorrow items
  const buildings = useMemo(() => {
    return [...new Set(items.map((i) => i.buildingName))].filter(Boolean).sort();
  }, [items]);

  // Filtered items based on contractor, building, and search
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (
        selectedContractor !== "All Contractors" &&
        item.contractorName !== selectedContractor &&
        item.contractorCode !== selectedContractor
      ) {
        return false;
      }
      if (buildingFilter !== "All Buildings" && item.buildingName !== buildingFilter) {
        return false;
      }
      if (q) {
        const text = `${item.workDescription} ${item.buildingName} ${item.buildingCode} ${item.contractorName} ${item.contractorCode} ${item.linkedResource ?? ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [items, selectedContractor, buildingFilter, search]);

  // Totals
  const totalHeadcount = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (item.headcount || 0), 0),
    [filteredItems]
  );

  const distinctBuildings = useMemo(
    () => new Set(filteredItems.map((i) => i.buildingCode)).size,
    [filteredItems]
  );

  const machineryCount = plans?.machinery.length ?? 0;
  const equipmentCount = plans?.equipment.length ?? 0;
  const qaqcCount = inspections.length;
  const totalRequests = machineryCount + equipmentCount + qaqcCount;

  // Export CSV handler
  const handleExportCsv = () => {
    const headers = ["No", "Date", "Contractor", "Building", "Work Description", "Headcount", "Plan %", "Support / Requests"];
    const rows = filteredItems.map((item, index) => {
      return [
        index + 1,
        item.reportDate,
        `"${item.contractorCode} - ${item.contractorName}"`,
        `"${item.buildingCode} ${item.buildingName}"`,
        `"${item.workDescription.replace(/"/g, '""')}"`,
        item.headcount,
        `${item.planPercent}%`,
        `"${(item.linkedResource ?? "-").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `STS_Tomorrow_Plan_${tomorrow}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2.5 }}>
        {/* Header & Export */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              แผนงานที่จะทำในวันถัดไป ({formatThaiDate(tomorrow)})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              รายการกิจกรรมและเนื้องานที่ผู้รับเหมาวางแผนเข้าทำ สำหรับการประชุมประสานงานประจำวัน
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCsv}
            disabled={filteredItems.length === 0}
            sx={{ textTransform: "none" }}
          >
            ส่งออก CSV
          </Button>
        </Stack>

        {/* 4 Compact Metric Cards */}
        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                รายการงานทั้งหมด
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                {filteredItems.length} งาน
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                กำลังคนตามแผน
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {totalHeadcount.toLocaleString()} คน
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                พื้นที่ / อาคารที่มีงาน
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {distinctBuildings} อาคาร
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                คำขอสนับสนุนหน้างาน
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {totalRequests} รายการ
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Filter Controls Row */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          {/* Contractor Filter Dropdown */}
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="tomorrow-contractor-label">ผู้รับเหมา</InputLabel>
            <Select
              labelId="tomorrow-contractor-label"
              label="ผู้รับเหมา"
              value={selectedContractor}
              onChange={(e) => onSelectContractor(e.target.value)}
            >
              <MenuItem value="All Contractors">ทุกผู้รับเหมา ({items.length} งาน)</MenuItem>
              {contractors.map((c) => {
                const countForC = items.filter((i) => i.contractorName === c || i.contractorCode === c).length;
                return (
                  <MenuItem key={c} value={c}>
                    {c} ({countForC})
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Building Filter Dropdown */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="tomorrow-building-label">อาคาร / พื้นที่</InputLabel>
            <Select
              labelId="tomorrow-building-label"
              label="อาคาร / พื้นที่"
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
            >
              <MenuItem value="All Buildings">ทุกอาคาร ({buildings.length})</MenuItem>
              {buildings.map((b) => (
                <MenuItem key={b} value={b}>
                  {b}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Search Box */}
          <TextField
            size="small"
            fullWidth
            placeholder="ค้นหาตามชื่องาน, อาคาร, หรือสิ่งที่ขอสนับสนุน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Stack>

        {/* Activities Table */}
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={<EventNoteOutlinedIcon />}
            title="ไม่มีรายการแผนงานที่ตรงกับเงื่อนไข"
            description="ลองเปลี่ยนตัวกรองผู้รับเหมา หรือล้างคำค้นหา"
            action={
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  onSelectContractor("All Contractors");
                  setBuildingFilter("All Buildings");
                  setSearch("");
                }}
              >
                ดูทั้งหมด
              </Button>
            }
          />
        ) : (
          <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
            <Table size="small" aria-label="Tomorrow planned activities">
              <TableHead sx={{ bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 60, textAlign: "center" }}>
                    #
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 170 }}>
                    ผู้รับเหมา
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 150 }}>
                    อาคาร / พื้นที่
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 280 }}>
                    งานที่จะทำ (Planned Work)
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: 90 }}>
                    คน
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: 90 }}>
                    แผน (%)
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 180 }}>
                    ขอสนับสนุน / ประสานงาน
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((item, index) => (
                  <TableRow key={item.id} hover>
                    <TableCell align="center" sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary" }}>
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ContractorBadge code={item.contractorCode} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.contractorName}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={`${item.buildingCode} ${item.buildingName}`}
                        variant="outlined"
                        sx={{ fontSize: "0.8125rem", height: 24 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                        {item.workDescription}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                      {item.headcount} คน
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                      {item.planPercent}%
                    </TableCell>
                    <TableCell>
                      {item.linkedResource ? (
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
                          {item.linkedResource}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          แสดง {filteredItems.length} จาก {items.length} รายการแผนงานสำหรับวันพรุ่งนี้
        </Typography>
      </CardContent>
    </Card>
  );
}
