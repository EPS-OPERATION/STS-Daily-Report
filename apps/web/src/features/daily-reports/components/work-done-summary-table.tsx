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
import PrintIcon from "@mui/icons-material/Print";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { ContractorBadge } from "./contractor-badge.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";

export interface WorkDoneItem {
  id: string;
  reportDate: string;
  contractorCode: string;
  contractorName: string;
  buildingCode: string;
  buildingName: string;
  buildingNameTh?: string | null;
  workDescription: string;
  headcount: number;
  planPercent: number;
  actualPercent: number | null;
  countermeasure?: string | null;
}

interface WorkDoneSummaryTableProps {
  items: WorkDoneItem[];
  contractors: string[];
  selectedContractor: string;
  onSelectContractor: (c: string) => void;
  dateLabel: string;
  isRange: boolean;
}

export function WorkDoneSummaryTable({
  items,
  contractors,
  selectedContractor,
  onSelectContractor,
  dateLabel,
  isRange,
}: WorkDoneSummaryTableProps) {
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("All Buildings");

  const buildings = useMemo(() => {
    return [...new Set(items.map((i) => i.buildingName))].filter(Boolean).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (selectedContractor !== "All Contractors" && item.contractorName !== selectedContractor && item.contractorCode !== selectedContractor) {
        return false;
      }
      if (buildingFilter !== "All Buildings" && item.buildingName !== buildingFilter) {
        return false;
      }
      if (q) {
        const text = `${item.workDescription} ${item.buildingName} ${item.buildingCode} ${item.contractorName} ${item.contractorCode}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [items, selectedContractor, buildingFilter, search]);

  // Overall totals
  const totalHeadcount = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (item.headcount || 0), 0),
    [filteredItems]
  );

  const avgPlan = useMemo(() => {
    if (filteredItems.length === 0) return 0;
    return filteredItems.reduce((sum, item) => sum + item.planPercent, 0) / filteredItems.length;
  }, [filteredItems]);

  const avgActual = useMemo(() => {
    const withActual = filteredItems.filter((item) => item.actualPercent !== null);
    if (withActual.length === 0) return null;
    return withActual.reduce((sum, item) => sum + (item.actualPercent ?? 0), 0) / withActual.length;
  }, [filteredItems]);

  const handleExportCsv = () => {
    const headers = ["Item", "Date", "Contractor", "Building", "Description of work done", "Headcount", "Plan %", "Actual %", "Status"];
    const rows = filteredItems.map((item, index) => {
      const isBehind = item.actualPercent !== null && item.actualPercent < item.planPercent;
      const status = item.actualPercent === null ? "Pending" : isBehind ? "ช้ากว่าแผน" : "ตามแผน";
      return [
        index + 1,
        item.reportDate,
        `"${item.contractorCode} - ${item.contractorName}"`,
        `"${item.buildingName}"`,
        `"${item.workDescription.replace(/"/g, '""')}"`,
        item.headcount,
        `${item.planPercent.toFixed(2)}%`,
        item.actualPercent !== null ? `${item.actualPercent.toFixed(2)}%` : "-",
        status,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `STS_Daily_Work_Summary_${dateLabel.replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        {/* Header Bar */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 2.5 }}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                สรุปรายการเนื้องานประจำวัน (Work Done Summary)
              </Typography>
              <Chip
                label={`${filteredItems.length} รายการ`}
                size="small"
                color="primary"
                sx={{ fontWeight: 700 }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              รวมเนื้องานที่ผู้รับเหมากรอกจากการจัดสรรงานประจำวัน (Building Allocations) · {dateLabel}
            </Typography>
          </Stack>

          {/* Action Buttons: Export & Print */}
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{ textTransform: "none" }}
            >
              พิมพ์รายงาน
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportCsv}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              ส่งออก CSV (Excel)
            </Button>
          </Stack>
        </Stack>

        {/* Quick Summary Pill Bar */}
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                รายการเนื้องาน
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {filteredItems.length} งาน
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                กำลังคนรวม
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                {totalHeadcount.toLocaleString()} คน
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                แผนงานเฉลี่ย (Plan)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {avgPlan.toFixed(1)}%
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary">
                ทำจริงเฉลี่ย (Actual)
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: avgActual !== null && avgActual < avgPlan ? "warning.main" : "success.main" }}>
                {avgActual !== null ? `${avgActual.toFixed(1)}%` : "Pending"}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Filter Controls Row */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          {/* Contractor Filter Dropdown */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="work-contractor-label">ผู้รับเหมา</InputLabel>
            <Select
              labelId="work-contractor-label"
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
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="work-building-label">อาคาร / พื้นที่</InputLabel>
            <Select
              labelId="work-building-label"
              label="อาคาร / พื้นที่"
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
            >
              <MenuItem value="All Buildings">ทุกอาคาร ({items.length})</MenuItem>
              {buildings.map((b) => {
                const countForB = items.filter((i) => i.buildingName === b).length;
                return (
                  <MenuItem key={b} value={b}>
                    {b} ({countForB})
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Search Box */}
          <TextField
            size="small"
            fullWidth
            placeholder="ค้นหาตามลักษณะงาน เช่น ติดตั้งนั่งร้าน, เทคอนกรีต, งานเชื่อม..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Stack>

        {/* Work Done Summary Table */}
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={<FactCheckOutlinedIcon />}
            title="ไม่พบรายการเนื้องานที่ตรงกับเงื่อนไข"
            description="ลองเปลี่ยนตัวกรองผู้รับเหมา อาคาร หรือล้างคำค้นหา"
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
          <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <Table size="small" sx={{ minWidth: 750 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: 700, width: 84, textAlign: "center", whiteSpace: "nowrap" }}>
                    Items<br />
                    <Typography variant="caption" color="text.secondary">ลำดับที่</Typography>
                  </TableCell>
                  {isRange && (
                    <TableCell sx={{ fontWeight: 700, width: 110 }}>วันที่</TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 700, minWidth: 280 }}>
                    Description of work done<br />
                    <Typography variant="caption" color="text.secondary">ลักษณะงานที่ทำ</Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 150 }}>
                    Building / Area<br />
                    <Typography variant="caption" color="text.secondary">อาคาร / พื้นที่</Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 150 }}>
                    Contractor<br />
                    <Typography variant="caption" color="text.secondary">ผู้รับเหมา</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: 90 }}>
                    คน<br />
                    <Typography variant="caption" color="text.secondary">Workers</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: 100, bgcolor: "action.selected" }}>
                    Plan<br />
                    <Typography variant="caption" color="text.secondary">แผนงาน</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, width: 110, bgcolor: "action.selected" }}>
                    Actual<br />
                    <Typography variant="caption" color="text.secondary">ทำจริง</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: 110 }}>สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((item, index) => {
                  const isBehind = item.actualPercent !== null && item.actualPercent < item.planPercent;
                  const isAhead = item.actualPercent !== null && item.actualPercent > item.planPercent;

                  return (
                    <TableRow key={item.id} hover>
                      <TableCell align="center" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                        {index + 1}
                      </TableCell>
                      {isRange && (
                        <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {item.reportDate}
                        </TableCell>
                      )}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                          {item.workDescription}
                        </Typography>
                        {item.countermeasure && (
                          <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.5 }}>
                            ⚠️ มาตรการแก้ไข: {item.countermeasure}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={item.buildingName}
                          variant="outlined"
                          sx={{ fontSize: 13, height: 22 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <ContractorBadge code={item.contractorCode} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.contractorName}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                        {item.headcount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, bgcolor: "action.hover" }}>
                        {item.planPercent.toFixed(2)}%
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, bgcolor: "action.hover" }}>
                        {item.actualPercent !== null ? (
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: isBehind ? "warning.dark" : isAhead ? "success.dark" : "text.primary",
                            }}
                          >
                            {item.actualPercent.toFixed(2)}%
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Pending
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {item.actualPercent === null ? (
                          <Chip size="small" label="Pending" sx={{ height: 22, fontSize: 13 }} />
                        ) : isBehind ? (
                          <Chip
                            size="small"
                            color="warning"
                            icon={<WarningAmberIcon fontSize="small" />}
                            label={`ช้ากว่าแผน (${(item.actualPercent - item.planPercent).toFixed(0)}%)`}
                            sx={{ height: 22, fontSize: 13, fontWeight: 600 }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            color="success"
                            icon={<CheckCircleOutlineIcon fontSize="small" />}
                            label={isAhead ? `เกินแผน (+${(item.actualPercent - item.planPercent).toFixed(0)}%)` : "ตามแผน"}
                            sx={{ height: 22, fontSize: 13, fontWeight: 600 }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          แสดง {filteredItems.length} จาก {items.length} รายการงานทั้งหมด · ดึงข้อมูลอัตโนมัติจากฟอร์มรายงานประจำวันของผู้รับเหมา
        </Typography>
      </CardContent>
    </Card>
  );
}
