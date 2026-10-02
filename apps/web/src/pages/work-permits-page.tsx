import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import ElectricBoltOutlinedIcon from "@mui/icons-material/ElectricBoltOutlined";
import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import HardwareOutlinedIcon from "@mui/icons-material/HardwareOutlined";
import HeightOutlinedIcon from "@mui/icons-material/HeightOutlined";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import WhatshotOutlinedIcon from "@mui/icons-material/WhatshotOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import {
  CONTRACTOR_LEGEND,
  PERMIT_BUILDINGS,
  PERMIT_CODE_LEGEND,
  PERMIT_CONTRACTORS,
  PERMIT_MONTHS,
  PERMIT_TYPES,
  WORK_PERMITS,
  type PermitTypeCode,
} from "@/mock/work-permits.js";

const TYPE_ICONS: Record<PermitTypeCode, typeof WhatshotOutlinedIcon> = {
  HWSTS: WhatshotOutlinedIcon,
  WHSTS: HeightOutlinedIcon,
  LTSTS: ConstructionOutlinedIcon,
  EXSTS: HardwareOutlinedIcon,
  SCFSTS: GridOnOutlinedIcon,
  CFSTS: MeetingRoomOutlinedIcon,
  EESTS: ElectricBoltOutlinedIcon,
};

// EPS work-permit board (mock data — no permits API yet): type overview,
// sub-contractor chart, document search, permit register, code legends.
export function WorkPermitsPage() {
  const theme = useTheme();
  const [from, setFrom] = useState<Dayjs | null>(null);
  const [to, setTo] = useState<Dayjs | null>(null);
  const [month, setMonth] = useState("");
  const [type, setType] = useState<PermitTypeCode | "">("");
  const [building, setBuilding] = useState("");
  const [contractor, setContractor] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setPage(0);
  }, [from, to, month, type, building, contractor, rowsPerPage]);

  const matchDate = (d: string) => {
    if (from && d < from.format("YYYY-MM-DD")) return false;
    if (to && d > to.format("YYYY-MM-DD")) return false;
    if (month && !d.startsWith(month)) return false;
    return true;
  };

  // Faceted counts: type cards ignore the type filter, chart ignores contractor.
  const forTypeCounts = useMemo(
    () => WORK_PERMITS.filter((p) => matchDate(p.date) && (!building || p.building === building) && (!contractor || p.contractor === contractor)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from, to, month, building, contractor],
  );
  const forChart = useMemo(
    () => WORK_PERMITS.filter((p) => matchDate(p.date) && (!type || p.type === type) && (!building || p.building === building)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from, to, month, type, building],
  );
  const rows = useMemo(
    () =>
      WORK_PERMITS.filter(
        (p) =>
          matchDate(p.date) &&
          (!type || p.type === type) &&
          (!building || p.building === building) &&
          (!contractor || p.contractor === contractor),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from, to, month, type, building, contractor],
  );

  const typeCounts = useMemo(() => {
    const m = new Map<PermitTypeCode, number>();
    for (const p of forTypeCounts) m.set(p.type, (m.get(p.type) ?? 0) + 1);
    return m;
  }, [forTypeCounts]);

  const chartData = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of forChart) m.set(p.contractor, (m.get(p.contractor) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [forChart]);

  const clearAll = () => {
    setFrom(null);
    setTo(null);
    setMonth("");
    setType("");
    setBuilding("");
    setContractor("");
  };

  return (
    <Box>
      <PageHeader title="Work Permit" subtitle="High-risk permit register · mock board until the permits module lands" />

      <Box sx={{ bgcolor: "success.main", color: "#fff", borderRadius: 1, py: 1, mb: 2, textAlign: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 1 }}>
          WORK PERMIT
        </Typography>
      </Box>

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
                {rows.length}
              </Typography>
            </CardContent>
          </Card>
          <Grid container spacing={1.5}>
            {PERMIT_TYPES.map((t) => {
              const Icon = TYPE_ICONS[t.code];
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
                  <InputLabel id="wp-month">Month</InputLabel>
                  <Select labelId="wp-month" label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
                    <MenuItem value="">All months</MenuItem>
                    {PERMIT_MONTHS.map((m) => (
                      <MenuItem key={m} value={m}>
                        {dayjs(`${m}-01`).format("MMMM YYYY")}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel id="wp-type">Type of Work</InputLabel>
                  <Select labelId="wp-type" label="Type of Work" value={type} onChange={(e) => setType(e.target.value as PermitTypeCode | "")}>
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
                    {PERMIT_BUILDINGS.map((b) => (
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
                    {PERMIT_CONTRACTORS.map((c) => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="outlined" size="small" onClick={clearAll}>
                  Clear filters
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 2 }}>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" aria-label="Work permit register">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Expire</TableCell>
                <TableCell>Sub Contractor</TableCell>
                <TableCell>Permit No.</TableCell>
                <TableCell>Type of Work</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Building</TableCell>
                <TableCell>Contractor Signed</TableCell>
                <TableCell>EPS Signed</TableCell>
                <TableCell>Remarks</TableCell>
                <TableCell>Download</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{p.date}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{p.expire}</TableCell>
                  <TableCell>{p.contractor}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{p.permitNo}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{p.typeLabel}</TableCell>
                  <TableCell title={p.description} sx={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.description}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{p.building}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{p.contractorSigned}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{p.epsSigned}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>
                    <Tooltip title="Document download comes with the permits module">
                      <span>
                        <IconButton size="small" disabled aria-label={`Download ${p.permitNo}`}>
                          <DownloadOutlinedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        {rows.length === 0 ? (
          <EmptyState
            icon={<ConstructionOutlinedIcon />}
            title="No permits match"
            description="Loosen the filters to see the register again."
            action={
              <Button variant="outlined" size="small" onClick={clearAll}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            onPageChange={(_, v) => setPage(v)}
            onRowsPerPageChange={(e) => setRowsPerPage(Number(e.target.value))}
          />
        )}
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Sub Contractor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {CONTRACTOR_LEGEND.map((c) => `${c.code}: ${c.name}`).join(" · ")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Remarks
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {PERMIT_CODE_LEGEND.map((c) => `${c.code}: ${c.meaning}`).join(" · ")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
