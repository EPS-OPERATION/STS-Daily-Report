import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
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
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
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
import { PERMIT_ICONS, permitLabel, useDailyRequests } from "@/features/daily-reports/index.js";
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
  const [from, setFrom] = useState<Dayjs | null>(dayjs(defaultFrom ?? dayjs().startOf("month")));
  const [to, setTo] = useState<Dayjs | null>(dayjs(defaultTo ?? dayjs()));
  const [type, setType] = useState<PermitType | "">("");
  const [building, setBuilding] = useState("");
  const [contractor, setContractor] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fromIso = (from ?? dayjs(defaultFrom ?? dayjs().startOf("month"))).format("YYYY-MM-DD");
  const toIso = (to ?? dayjs(defaultTo ?? dayjs())).format("YYYY-MM-DD");
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

  // Faceted counts: type cards ignore the type filter; the chart ignores the contractor dropdown
  // (but respects the external contractor filter).
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
    () => permits.filter((p) => (!type || p.permitType === type) && (!building || p.buildingName === building) && matchContractor(p.contractorCode)),
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
    setFrom(dayjs(defaultFrom ?? dayjs().startOf("month")));
    setTo(dayjs(defaultTo ?? dayjs()));
    setType("");
    setBuilding("");
    setContractor("");
  };

  return (
    <Box>
      {!hideHeader && (
        <PageHeader title="Work Permit" subtitle="Permit register from contractor afternoon reports" />
      )}

      <Box sx={{ bgcolor: "success.main", color: "#fff", borderRadius: 1, py: 1, mb: 2, textAlign: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 1 }}>
          WORK PERMIT
        </Typography>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Card variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ px: 2.5, py: 1.5, bgcolor: "grey.50", borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              งานที่มีความเสี่ยงสูงและการควบคุม (High-Risk Tasks &amp; Supervision)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              จาก Work Permit ที่ผู้รับเหมาระบุว่าเป็นงานความเสี่ยงสูง (แจ้งล่วงหน้าในรายงานบ่ายของวันก่อน) พร้อมผู้ควบคุมงาน EPS
            </Typography>
          </Box>
          <CardContent sx={{ p: 2 }}>
            <HighRiskTasks projectId={projectId} from={fromIso} to={toIso} selectedContractorCodes={selectedContractorCodes} />
          </CardContent>
        </Card>
      </Box>

      {query.isError && <QueryError error={query.error as Error} onRetry={() => void query.refetch()} />}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 2.5 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Sub Contractor
              </Typography>
              {chartData.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No permits in view.
                </Typography>
              ) : (
                <BarChart
                  height={chartData.length * 34 + 70}
                  layout="horizontal"
                  yAxis={[{ scaleType: "band", data: chartData.map(([c]) => c), tickLabelStyle: { fontSize: 13 } }]}
                  series={[
                    {
                      data: chartData.map(([, n]) => n),
                      color: theme.palette.info.main,
                      valueFormatter: (v: number | null) => `${v ?? 0}`,
                    },
                  ]}
                  margin={{ left: 44, right: 16, top: 8, bottom: 32 }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6.5 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">
                Total Work Permit
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "info.dark" }}>
                {query.isLoading ? "–" : rows.length}
              </Typography>
            </CardContent>
          </Card>
          <Grid container spacing={1.5}>
            {PERMIT_TYPES.map((t) => {
              const Icon = PERMIT_ICONS[t.code];
              const n = typeCounts.get(t.code) ?? 0;
              const active = type === t.code;
              return (
                <Grid key={t.code} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Card
                    onClick={() => setType(active ? "" : t.code)}
                    sx={{
                      cursor: "pointer",
                      textAlign: "center",
                      border: 2,
                      borderColor: active ? "primary.main" : "transparent",
                      "&:hover": { borderColor: active ? "primary.main" : "divider" },
                    }}
                  >
                    <CardContent sx={{ p: 1.5 }}>
                      <Icon sx={{ fontSize: 34 }} color={n > 0 ? "warning" : "disabled"} aria-hidden="true" />
                      <Typography variant="body2" color="text.secondary">
                        {t.label}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "info.dark" }}>
                        {n > 0 ? n : "—"}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Tap a type to filter the register below.
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, lg: 3 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                Search for Document
              </Typography>
              <Stack spacing={1.5}>
                <DatePicker label="From" value={from} onChange={setFrom} slotProps={{ textField: { size: "small", fullWidth: true } }} />
                <DatePicker label="To" value={to} onChange={setTo} slotProps={{ textField: { size: "small", fullWidth: true } }} />
                <FormControl fullWidth size="small">
                  <InputLabel id="wp-type">Type of Work</InputLabel>
                  <Select labelId="wp-type" label="Type of Work" value={type} onChange={(e) => setType(e.target.value as PermitType | "")}>
                    <MenuItem value="">All types</MenuItem>
                    {PERMIT_TYPES.map((t) => (
                      <MenuItem key={t.code} value={t.code}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel id="wp-building">Building</InputLabel>
                  <Select labelId="wp-building" label="Building" value={building} onChange={(e) => setBuilding(e.target.value)}>
                    <MenuItem value="">All buildings</MenuItem>
                    {buildingOptions.map((b) => (
                      <MenuItem key={b} value={b}>
                        {b}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel id="wp-contractor">Sub Contractor</InputLabel>
                  <Select labelId="wp-contractor" label="Sub Contractor" value={contractor} onChange={(e) => setContractor(e.target.value)}>
                    <MenuItem value="">All contractors</MenuItem>
                    {contractorOptions.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c} · {namesByCode.get(c) ?? ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="outlined" onClick={clearAll}>
                  Clear filters
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 2 }}>
        <Box sx={{ overflowX: "auto" }}>
          {query.isLoading ? (
            <Box sx={{ p: 2 }}>
              <Skeleton variant="rounded" height={160} />
            </Box>
          ) : (
            <Table size="small" aria-label="Work permit register">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Sub Contractor</TableCell>
                  <TableCell>Type of Work</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Building</TableCell>
                  <TableCell align="right">Workers</TableCell>
                  <TableCell>High risk</TableCell>
                  <TableCell>EPS Supervisor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{dayjs(p.targetDate).format("D MMM YYYY")}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{p.contractorCode} · {p.contractorName}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{p.permitType === "other" ? p.otherLabel || permitLabel("other") : permitLabel(p.permitType)}</TableCell>
                    <TableCell title={p.taskName ?? ""} sx={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.taskName || "—"}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{p.buildingName || p.buildingCode}</TableCell>
                    <TableCell align="right">{p.workers}</TableCell>
                    <TableCell>
                      {p.highRisk ? <Chip size="small" color="warning" label="High risk" sx={{ height: 22 }} /> : "—"}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{p.supervisorName || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
        {!query.isLoading && rows.length === 0 ? (
          <EmptyState
            icon={<ConstructionOutlinedIcon />}
            title="No permits match"
            description="Permits come from contractor afternoon reports. Loosen the filters or widen the date range."
            action={
              <Button variant="outlined" onClick={clearAll}>
                Clear filters
              </Button>
            }
          />
        ) : !query.isLoading ? (
          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            onPageChange={(_, v) => setPage(v)}
            onRowsPerPageChange={(e) => setRowsPerPage(Number(e.target.value))}
          />
        ) : null}
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Sub Contractor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {contractorList.length === 0
                  ? "—"
                  : contractorList.map((c) => `${c.code}: ${c.name}`).join(" · ")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Permit types
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {PERMIT_TYPES.map((t) => `${t.label}: ${t.labelTh}`).join(" · ")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export function WorkPermitsPage() {
  return <WorkPermitsView hideHeader={false} />;
}
