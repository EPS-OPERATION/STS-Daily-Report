import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
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
import dayjs from "dayjs";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { ALL_BUILDINGS } from "../utils/work-done.js";
import { ALL_CONTRACTORS, type SubmissionFilter } from "../utils/submission.js";
import { ContractorBadge } from "@/features/contractors/index.js";
import { ContractorFilterPopover } from "@/features/contractors/index.js";
import { ReviewDialog } from "../components/review-dialog.js";
import { WorkDoneSummaryTable } from "../components/work-done-summary-table.js";
import { useDailyReportsPage } from "../hooks/use-daily-reports-page.js";
import { SubmissionSummary } from "../components/submission-summary.js";
import { SubmissionHistory } from "../components/submission-history.js";

// Daily report summary for EPS: work done, and a submission history of who sent what — every
// contractor every day, so missing reports are visible. No approval step (history only).
export function DailyReportsPage() {
  const ed = useDailyReportsPage();
  const { from, to, isRange, viewMode, search, setSearch, contractor, setContractor, filter, setFilter, detail, setDetail, projectId, history, inspections, setRange, queue, contractorNames, allCodes, selectedCodes, setContractors, filterItems, workDoneItems, rfiByDay, counts, workContractorNames, rows, exportSummaryPdf, loadError, loading, shiftChip, dateRangeLabel } = ed;

  return (
    <Box>
      <PageHeader
        title="สรุปรายงานประจำวัน"
        subtitle="สรุปรายงานประจำวันจากผู้รับเหมา — ผลงาน และประวัติการส่ง Daily Report / Daily Request"
        actions={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <DateRangeFields from={from} to={to} maxDays={62} onChange={setRange} />
            {allCodes.length > 0 ? (
              <ContractorFilterPopover
                items={filterItems}
                selectedCodes={selectedCodes}
                onChange={setContractors}
              />
            ) : null}
          </Stack>
        }
      />

      {!projectId ? (
        <Alert severity="info" sx={{ mb: 2.5 }}>
          กรุณาเลือกโครงการด้านบนเพื่อดูสรุปรายงานประจำวัน
        </Alert>
      ) : loadError ? (
        <QueryError error={loadError} onRetry={() => { void history.refetch(); void inspections.refetch(); }} />
      ) : loading ? (
        <Stack spacing={2} sx={{ mb: 2.5 }}>
          <BlockSkeleton height={90} />
          <BlockSkeleton height={260} />
        </Stack>
      ) : (
        <Box sx={{ mb: 2.5 }}>
          {/* Submission summary: who sent what in the range */}
          <SubmissionSummary ed={ed} />

          <SubmissionHistory ed={ed} />

          {viewMode === "work-summary" ? (
            <WorkDoneSummaryTable
              items={workDoneItems}
              contractors={workContractorNames}
              selectedContractor={contractor}
              onSelectContractor={setContractor}
              dateLabel={dateRangeLabel}
              isRange={isRange}
              onPrint={({ building, search: q }) => {
                const p = new URLSearchParams({ from, to, contractor });
                if (projectId) p.set("projectId", projectId);
                if (building !== ALL_BUILDINGS) p.set("building", building);
                if (q.trim()) p.set("q", q.trim());
                window.open(`/daily-reports/work-done/print?${p.toString()}`, "_blank", "noopener");
              }}
            />
          ) : (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }} role="group" aria-label="Filter by submission status">
                {(
                  [
                    ["all", `ทั้งหมด (${counts.all})`],
                    ["complete", `ส่งครบ (${counts.complete})`],
                    ["partial", `ส่งบางส่วน (${counts.partial})`],
                    ["none", `ยังไม่ส่ง (${counts.none})`],
                  ] as [SubmissionFilter, string][]
                ).map(([value, label]) => (
                  <Chip
                    key={value}
                    label={label}
                    clickable
                    color={filter === value ? "primary" : "default"}
                    variant={filter === value ? "filled" : "outlined"}
                    onClick={() => setFilter(value)}
                  />
                ))}
                <Box sx={{ flexGrow: 1 }} />
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdfOutlinedIcon />}
                  onClick={exportSummaryPdf}
                  disabled={rows.length === 0}
                >
                  Export PDF (summary table)
                </Button>
              </Stack>

              <Card variant="outlined">
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel id="history-contractor">ผู้รับเหมา</InputLabel>
                      <Select labelId="history-contractor" label="Contractor" value={contractor} onChange={(e) => setContractor(e.target.value)}>
                        <MenuItem value={ALL_CONTRACTORS}>All contractors</MenuItem>
                        {[...new Set(contractorNames.values())].sort().map((c) => (
                          <MenuItem key={c} value={c}>
                            {c}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Search"
                      placeholder="Contractor, code or date…"
                      size="small"
                      fullWidth
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </Stack>

                  {rows.length === 0 ? (
                    <EmptyState
                      icon={<HistoryOutlinedIcon />}
                      title="ไม่มีรายการที่ตรงกับเงื่อนไข"
                      description="ลองเปลี่ยนช่วงวันที่ ตัวกรอง หรือล้างคำค้นหา"
                      action={
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setFilter("all");
                            setSearch("");
                            setContractor(ALL_CONTRACTORS);
                          }}
                        >
                          View all
                        </Button>
                      }
                    />
                  ) : (
                    <TableContainer>
                      <Table size="small" aria-label="Contractor submission history" sx={{ minWidth: 640 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>วันที่</TableCell>
                            <TableCell>ผู้รับเหมา</TableCell>
                            <TableCell>Daily Report</TableCell>
                            <TableCell>Daily Request</TableCell>
                            <TableCell align="right">คน</TableCell>
                            <TableCell align="right">RFI</TableCell>
                            <TableCell align="right">PDF</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.map((r) => {
                            const people = r.totalHeadcount || r.eveningHeadcount;
                            const openable = Boolean(r.id);
                            return (
                              <TableRow
                                key={`${r.contractorId}-${r.reportDate}`}
                                hover={openable}
                                onClick={openable ? () => setDetail(r) : undefined}
                                sx={{ cursor: openable ? "pointer" : "default" }}
                              >
                                <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                                  {dayjs(r.reportDate).format("ddd D MMM")}
                                </TableCell>
                                <TableCell>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <ContractorBadge code={r.contractorCode} />
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {r.contractorName}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>{shiftChip(r.morningStatus)}</TableCell>
                                <TableCell>{shiftChip(r.eveningStatus)}</TableCell>
                                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                                  {people > 0 ? `${people} คน` : "—"}
                                </TableCell>
                                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                  {rfiByDay.get(`${r.contractorId}|${r.reportDate}`) ?? 0}
                                </TableCell>
                                <TableCell align="right">
                                  {r.id ? (
                                    <IconButton
                                      size="small"
                                      aria-label={`Export PDF ${r.contractorName} ${r.reportDate}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`/daily-reports/${r.id}/print`, "_blank", "noopener");
                                      }}
                                    >
                                      <PictureAsPdfOutlinedIcon fontSize="small" />
                                    </IconButton>
                                  ) : (
                                    <Typography variant="body2" color="text.disabled">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                    แสดง {rows.length} จาก {queue.length} รายการ · คลิกแถวที่ส่งแล้วเพื่อดูรายละเอียด
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      )}

      {/* Read-only report detail (Export PDF available) */}
      <ReviewDialog report={detail} projectId={projectId} onClose={() => setDetail(null)} />
    </Box>
  );
}
