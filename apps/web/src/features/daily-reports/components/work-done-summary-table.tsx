import { useMemo, useState } from "react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import { TableCard } from "@/components/ui/table-card.js";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import FileDownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import PrintIcon from "@mui/icons-material/PrintOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import { ContractorBadge } from "./contractor-badge.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import { ALL_BUILDINGS, filterWorkDone } from "../utils/work-done.js";

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
  planPercent: number | null;
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
  /** Printed report (one sheet per day) for the rows currently shown; falls back to window.print(). */
  onPrint?: (filters: { building: string; search: string }) => void;
}

export function WorkDoneSummaryTable({
  items,
  contractors,
  selectedContractor,
  onSelectContractor,
  dateLabel,
  isRange,
  onPrint,
}: WorkDoneSummaryTableProps) {
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState(ALL_BUILDINGS);

  const buildings = useMemo(() => {
    return [...new Set(items.map((i) => i.buildingName))].filter(Boolean).sort();
  }, [items]);

  const filteredItems = useMemo(
    () => filterWorkDone(items, { contractor: selectedContractor, building: buildingFilter, search }),
    [items, selectedContractor, buildingFilter, search],
  );


  const handleExportCsv = () => {
    const headers = ["Item", "Date", "Contractor", "Building", "Description of work done", "Headcount", "Plan %", "Actual %", "Status"];
    const rows = filteredItems.map((item, index) => {
      const isBehind = item.actualPercent !== null && item.planPercent !== null && item.actualPercent < item.planPercent;
      const status = item.actualPercent === null ? "Pending" : isBehind ? "ช้ากว่าแผน" : "ตามแผน";
      return [
        index + 1,
        item.reportDate,
        `"${item.contractorCode} - ${item.contractorName}"`,
        `"${item.buildingName}"`,
        `"${item.workDescription.replace(/"/g, '""')}"`,
        item.headcount,
        item.planPercent === null ? "-" : `${item.planPercent === null ? "—" : `${item.planPercent.toFixed(2)}%`}`,
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
    if (onPrint) onPrint({ building: buildingFilter, search });
    else window.print();
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
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{ textTransform: "none" }}
            >
              พิมพ์รายงาน
            </Button>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportCsv}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Export CSV (Excel)
            </Button>
          </Stack>
        </Stack>


        {/* Filter Controls Row */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          {/* Contractor Filter Dropdown */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="work-contractor-label">ผู้รับเหมา</InputLabel>
            <Select
              labelId="work-contractor-label"
              label="Contractor"
              value={selectedContractor}
              onChange={(e) => onSelectContractor(e.target.value)}
            >
              <MenuItem value="All Contractors">All contractors ({items.length})</MenuItem>
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
              label="Building / area"
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
            >
              <MenuItem value="All Buildings">All buildings ({items.length})</MenuItem>
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
                onClick={() => {
                  onSelectContractor("All Contractors");
                  setBuildingFilter("All Buildings");
                  setSearch("");
                }}
              >
                View all
              </Button>
            }
          />
        ) : (
          <TableCard><TableContainer>
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
                  const isBehind = item.actualPercent !== null && item.planPercent !== null && item.actualPercent < item.planPercent;
                  const isAhead = item.actualPercent !== null && item.planPercent !== null && item.actualPercent > item.planPercent;

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
                        {item.planPercent === null ? "—" : `${item.planPercent.toFixed(2)}%`}
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
                            label={`ช้ากว่าแผน (${(item.actualPercent - (item.planPercent ?? 0)).toFixed(0)}%)`}
                            sx={{ height: 22, fontSize: 13, fontWeight: 600 }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            color="success"
                            icon={<CheckCircleOutlineIcon fontSize="small" />}
                            label={isAhead ? `เกินแผน (+${(item.actualPercent - (item.planPercent ?? 0)).toFixed(0)}%)` : item.planPercent === null ? "บันทึกผลแล้ว" : "ตามแผน"}
                            sx={{ height: 22, fontSize: 13, fontWeight: 600 }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer></TableCard>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          แสดง {filteredItems.length} จาก {items.length} รายการงานทั้งหมด · ดึงข้อมูลอัตโนมัติจากฟอร์มรายงานประจำวันของผู้รับเหมา
        </Typography>
      </CardContent>
    </Card>
  );
}
