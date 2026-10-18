import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberOutlined";
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
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { PERMIT_TYPES, type PermitType } from "@sts/shared";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import {
  PERMIT_ICONS,
  addDaysIso,
  mondayOf,
  permitLabel,
  todayIso,
  useDailyRequests,
} from "@/features/daily-reports/index.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";
import { HighRiskTasks } from "@/features/safety/index.js";

// EPS work-permit board, derived from the permits contractors request in the
// afternoon daily report (target date = the day the permit is used).
export function WorkPermitsView({
  hideHeader = true,
  selectedContractorCodes,
  defaultFrom,
  defaultTo,
}: {
  hideHeader?: boolean;
  selectedContractorCodes?: Set<string>;
  defaultFrom?: string;
  defaultTo?: string;
} = {}) {
  const theme = useTheme();
  const { projectId } = useCurrentProject();

  const todayStr = todayIso();
  const tomorrowStr = addDaysIso(todayStr, 1);
  const mondayStr = mondayOf(todayStr);
  const sundayStr = addDaysIso(mondayStr, 6);
  const monthStartStr = dayjs().startOf("month").format("YYYY-MM-DD");
  const monthEndStr = dayjs().endOf("month").format("YYYY-MM-DD");

  const [from, setFrom] = useState<Dayjs | null>(dayjs(defaultFrom ?? todayStr));
  const [to, setTo] = useState<Dayjs | null>(dayjs(defaultTo ?? todayStr));
  const [type, setType] = useState<PermitType | "">("");
  const [building, setBuilding] = useState("");
  const [contractor, setContractor] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    if (defaultFrom) setFrom(dayjs(defaultFrom));
  }, [defaultFrom]);

  useEffect(() => {
    if (defaultTo) setTo(dayjs(defaultTo));
  }, [defaultTo]);

  const fromIso = (from ?? dayjs(todayStr)).format("YYYY-MM-DD");
  const toIso = (to ?? dayjs(todayStr)).format("YYYY-MM-DD");
  const query = useDailyRequests(projectId, fromIso, toIso);
  const permits = useMemo(() => query.data?.data.permits ?? [], [query.data]);
  const contractorList = useProjectContractors(projectId).data?.data ?? [];

  const namesByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contractorList) m.set(c.code, c.name);
    for (const p of permits) m.set(p.contractorCode, p.contractorName || m.get(p.contractorCode) || "");
    return m;
  }, [contractorList, permits]);

  useEffect(() => {
    setPage(0);
  }, [fromIso, toIso, type, building, contractor, rowsPerPage, selectedContractorCodes]);

  const matchContractor = (c: string) => {
    if (selectedContractorCodes && !selectedContractorCodes.has(c)) return false;
    if (contractor && c !== contractor) return false;
    return true;
  };

  const activePreset = useMemo(() => {
    if (fromIso === todayStr && toIso === todayStr) return "today";
    if (fromIso === tomorrowStr && toIso === tomorrowStr) return "tomorrow";
    if (fromIso === mondayStr && toIso === sundayStr) return "week";
    if (fromIso === monthStartStr && toIso === monthEndStr) return "month";
    return "";
  }, [fromIso, toIso, todayStr, tomorrowStr, mondayStr, sundayStr, monthStartStr, monthEndStr]);

  const handlePresetChange = (_: unknown, val: string | null) => {
    if (!val) return;
    if (val === "today") {
      setFrom(dayjs(todayStr));
      setTo(dayjs(todayStr));
    } else if (val === "tomorrow") {
      setFrom(dayjs(tomorrowStr));
      setTo(dayjs(tomorrowStr));
    } else if (val === "week") {
      setFrom(dayjs(mondayStr));
      setTo(dayjs(sundayStr));
    } else if (val === "month") {
      setFrom(dayjs(monthStartStr));
      setTo(dayjs(monthEndStr));
    }
  };

  // Faceted counts: type cards ignore the type filter; the chart ignores the contractor dropdown
  const forTypeCounts = useMemo(
    () => permits.filter((p) => (!building || p.buildingName === building) && matchContractor(p.contractorCode)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permits, building, contractor, selectedContractorCodes],
  );
  const forChart = useMemo(
    () =>
      permits.filter(
        (p) => (!type || p.permitType === type) && (!building || p.buildingName === building) && matchContractor(p.contractorCode),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permits, type, building, contractor, selectedContractorCodes],
  );
  const rows = useMemo(
    () =>
      permits.filter(
        (p) => (!type || p.permitType === type) && (!building || p.buildingName === building) && matchContractor(p.contractorCode),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permits, type, building, contractor, selectedContractorCodes],
  );

  const typeCounts = useMemo(() => {
    const m = new Map<PermitType, number>();
    for (const p of forTypeCounts) m.set(p.permitType, (m.get(p.permitType) ?? 0) + 1);
    return m;
  }, [forTypeCounts]);

  const chartData = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of forChart) m.set(p.contractorCode, (m.get(p.contractorCode) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [forChart]);

  const buildingOptions = useMemo(
    () => [...new Set(permits.map((p) => p.buildingName).filter(Boolean))].sort(),
    [permits],
  );
  const contractorOptions = useMemo(
    () => [...new Set(permits.map((p) => p.contractorCode))].sort(),
    [permits],
  );

  const clearAll = () => {
    setFrom(dayjs(todayStr));
    setTo(dayjs(todayStr));
    setType("");
    setBuilding("");
    setContractor("");
  };

  const isFiltered = Boolean(type || building || contractor || activePreset !== "today");

  return (
    <Box>
      {!hideHeader && (
        <PageHeader title="Work Permit" subtitle="Permit register from contractor afternoon reports" />
      )}

      {/* Quick Controls & Filter Toolbar */}
      <Card variant="outlined" sx={{ p: 1.25, mb: 2, borderRadius: 2, bgcolor: "background.paper" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
          flexWrap="wrap"
          useFlexGap
        >
          {/* Quick Date Presets & Pickers */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={activePreset}
              onChange={handlePresetChange}
              sx={{ bgcolor: "grey.50" }}
            >
              <ToggleButton value="today" sx={{ px: 1.5, py: 0.5, fontSize: "0.8rem", textTransform: "none", fontWeight: 600 }}>
                วันนี้
              </ToggleButton>
              <ToggleButton value="tomorrow" sx={{ px: 1.5, py: 0.5, fontSize: "0.8rem", textTransform: "none", fontWeight: 600 }}>
                พรุ่งนี้
              </ToggleButton>
              <ToggleButton value="week" sx={{ px: 1.5, py: 0.5, fontSize: "0.8rem", textTransform: "none", fontWeight: 600 }}>
                สัปดาห์นี้
              </ToggleButton>
              <ToggleButton value="month" sx={{ px: 1.5, py: 0.5, fontSize: "0.8rem", textTransform: "none", fontWeight: 600 }}>
                เดือนนี้
              </ToggleButton>
            </ToggleButtonGroup>

            <Stack direction="row" spacing={0.75} alignItems="center">
              <DatePicker
                label="จาก"
                value={from}
                onChange={setFrom}
                slotProps={{ textField: { size: "small", sx: { width: 135 } } }}
              />
              <Typography variant="body2" color="text.secondary">
                –
              </Typography>
              <DatePicker
                label="ถึง"
                value={to}
                onChange={setTo}
                slotProps={{ textField: { size: "small", sx: { width: 135 } } }}
              />
            </Stack>
          </Stack>

          {/* Location & Contractor Selects */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel id="wp-building">อาคาร</InputLabel>
              <Select
                labelId="wp-building"
                label="อาคาร"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
              >
                <MenuItem value="">ทุกอาคาร</MenuItem>
                {buildingOptions.map((b) => (
                  <MenuItem key={b} value={b}>
                    {b}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="wp-contractor">ผู้รับเหมา</InputLabel>
              <Select
                labelId="wp-contractor"
                label="ผู้รับเหมา"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
              >
                <MenuItem value="">ทุกคน</MenuItem>
                {contractorOptions.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c} · {namesByCode.get(c) ?? ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {isFiltered && (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<RestartAltOutlinedIcon fontSize="small" />}
                onClick={clearAll}
                sx={{ textTransform: "none" }}
              >
                ล้างตัวกรอง
              </Button>
            )}
          </Stack>
        </Stack>
      </Card>

      {/* High-Risk Tasks Section */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mb: 2 }}>
        <Box sx={{ px: 2, py: 1, bgcolor: "grey.50", borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmberRoundedIcon sx={{ color: "warning.main", fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              งานที่มีความเสี่ยงสูงและการควบคุม (High-Risk Tasks &amp; Supervision)
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            จาก Work Permit ที่ผู้รับเหมาระบุว่าเป็นงานความเสี่ยงสูง (แจ้งล่วงหน้าในรายงานบ่ายของวันก่อน)
          </Typography>
        </Box>
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <HighRiskTasks projectId={projectId} from={fromIso} to={toIso} selectedContractorCodes={selectedContractorCodes} />
        </CardContent>
      </Card>

      {query.isError && <QueryError error={query.error as Error} onRetry={() => void query.refetch()} />}

      {/* Side-by-Side: Left = Permit Types & Chart, Right = Register Table */}
      <Grid container spacing={2}>
        {/* Left Column: Types & Contractor Chart */}
        <Grid size={{ xs: 12, lg: 4.5 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  ประเภทใบอนุญาต (Permit Types)
                </Typography>
                <Chip
                  size="small"
                  label={`ทั้งหมด ${permits.length} ใบ`}
                  color="info"
                  variant={type === "" ? "filled" : "outlined"}
                  onClick={() => setType("")}
                  sx={{ cursor: "pointer", fontWeight: 600, height: 24, fontSize: "0.75rem" }}
                />
              </Box>

              <Grid container spacing={1}>
                {PERMIT_TYPES.map((t) => {
                  const Icon = PERMIT_ICONS[t.code];
                  const n = typeCounts.get(t.code) ?? 0;
                  const active = type === t.code;
                  return (
                    <Grid key={t.code} size={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
                      <Box
                        onClick={() => setType(active ? "" : t.code)}
                        sx={{
                          cursor: "pointer",
                          p: 1,
                          textAlign: "center",
                          borderRadius: 1.5,
                          border: "1.5px solid",
                          borderColor: active ? "primary.main" : n > 0 ? "warning.light" : "divider",
                          bgcolor: active ? "primary.50" : n > 0 ? "#FFFDF7" : "background.paper",
                          transition: "all 0.15s ease",
                          "&:hover": { borderColor: "primary.main", transform: "translateY(-1px)" },
                        }}
                      >
                        <Icon sx={{ fontSize: 22, color: n > 0 ? "warning.main" : "text.disabled", mb: 0.25 }} />
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            fontSize: "0.72rem",
                            fontWeight: active ? 700 : 500,
                            lineHeight: 1.15,
                            color: active ? "primary.dark" : "text.secondary",
                            height: 28,
                            overflow: "hidden",
                          }}
                        >
                          {t.label}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: n > 0 ? "text.primary" : "text.disabled", lineHeight: 1.2 }}>
                          {n > 0 ? n : "—"}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: "0.85rem" }}>
                สัดส่วนตามผู้รับเหมา (Sub Contractors)
              </Typography>
              {chartData.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", py: 2, textAlign: "center" }}>
                  ไม่มีใบอนุญาตในช่วงนี้
                </Typography>
              ) : (
                <Box sx={{ height: Math.min(180, Math.max(100, chartData.length * 28 + 25)), width: "100%" }}>
                  <BarChart
                    layout="horizontal"
                    yAxis={[{ scaleType: "band", data: chartData.map(([c]) => c), tickLabelStyle: { fontSize: 11 } }]}
                    series={[
                      {
                        data: chartData.map(([, n]) => n),
                        color: theme.palette.info.main,
                        valueFormatter: (v: number | null) => `${v ?? 0}`,
                      },
                    ]}
                    margin={{ left: 42, right: 16, top: 4, bottom: 20 }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Permit Register Table */}
        <Grid size={{ xs: 12, lg: 7.5 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1, bgcolor: "grey.50", borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AssignmentOutlinedIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  ทะเบียนใบอนุญาตทำงาน (Permit Register)
                </Typography>
                <Chip
                  size="small"
                  label={`${rows.length} รายการ`}
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.72rem" }}
                />
              </Stack>
              {type && (
                <Chip
                  size="small"
                  label={`กรอง: ${permitLabel(type)}`}
                  onDelete={() => setType("")}
                  color="primary"
                  sx={{ height: 22, fontSize: "0.75rem" }}
                />
              )}
            </Box>

            <TableContainer sx={{ maxHeight: 340, overflowY: "auto" }}>
              {query.isLoading ? (
                <Box sx={{ p: 2 }}>
                  <Skeleton variant="rounded" height={160} />
                </Box>
              ) : (
                <Table size="small" stickyHeader aria-label="Work permit register">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: "0.775rem", fontWeight: 700 }}>วันที่</TableCell>
                      <TableCell sx={{ fontSize: "0.775rem", fontWeight: 700 }}>ผู้รับเหมา</TableCell>
                      <TableCell sx={{ fontSize: "0.775rem", fontWeight: 700 }}>ประเภทงาน</TableCell>
                      <TableCell sx={{ fontSize: "0.775rem", fontWeight: 700 }}>รายละเอียดงาน</TableCell>
                      <TableCell sx={{ fontSize: "0.775rem", fontWeight: 700 }}>อาคาร</TableCell>
                      <TableCell align="right" sx={{ fontSize: "0.775rem", fontWeight: 700 }}>คน</TableCell>
                      <TableCell sx={{ fontSize: "0.775rem", fontWeight: 700 }}>ความเสี่ยงสูง</TableCell>
                      <TableCell sx={{ fontSize: "0.775rem", fontWeight: 700 }}>ผู้ควบคุม (EPS)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.775rem" }}>
                          {dayjs(p.targetDate).format("D MMM YYYY")}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.775rem" }}>
                          <Tooltip title={p.contractorName || namesByCode.get(p.contractorCode) || ""}>
                            <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600 }}>
                              {p.contractorCode}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.775rem" }}>
                          {p.permitType === "other" ? p.otherLabel || permitLabel("other") : permitLabel(p.permitType)}
                        </TableCell>
                        <TableCell
                          title={p.taskName ?? ""}
                          sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.775rem" }}
                        >
                          {p.taskName || "—"}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.775rem" }}>
                          {p.buildingName || p.buildingCode || "—"}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: "0.775rem" }}>
                          {p.workers}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.775rem" }}>
                          {p.highRisk ? (
                            <Chip size="small" color="warning" label="High risk" sx={{ height: 20, fontSize: "0.7rem" }} />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.775rem" }}>
                          {p.supervisorName || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableContainer>

            {!query.isLoading && rows.length === 0 ? (
              <EmptyState
                icon={<ConstructionOutlinedIcon />}
                title="ไม่พบใบอนุญาตทำงาน"
                description="ไม่มีข้อมูลที่ตรงกับเงื่อนไขตัวกรองหรือช่วงวันที่เลือก"
                action={
                  <Button variant="outlined" onClick={clearAll}>
                    ล้างตัวกรอง
                  </Button>
                }
              />
            ) : !query.isLoading ? (
              <TablePagination
                component="div"
                count={rows.length}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[5, 10, 20]}
                onPageChange={(_, v) => setPage(v)}
                onRowsPerPageChange={(e) => setRowsPerPage(Number(e.target.value))}
                sx={{ borderTop: 1, borderColor: "divider" }}
              />
            ) : null}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export function WorkPermitsPage() {
  return <WorkPermitsView hideHeader={false} />;
}
