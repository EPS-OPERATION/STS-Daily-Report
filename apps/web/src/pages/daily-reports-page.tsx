import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import { CONTRACTOR_OPTIONS, DAILY_REPORTS, type DailyReportRow } from "@/mock/site-data.js";

const ZONE_FILTER = ["All Zones", "Biomass", "Boiler", "Turbine", "WTT", "Electrical", "Utility"];
const STATUS_FILTER = ["All Status", "Draft", "Submitted", "Pending", "Reviewed", "Approved", "Rejected"];

export function DailyReportsPage() {
  const [params] = useSearchParams();
  const [from, setFrom] = useState<Dayjs | null>(dayjs("2026-09-26"));
  const [to, setTo] = useState<Dayjs | null>(dayjs("2026-09-28"));
  const [contractor, setContractor] = useState("All Contractors");
  const [zone, setZone] = useState("All Zones");
  const [status, setStatus] = useState("All Status");
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeRow, setActiveRow] = useState<DailyReportRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DAILY_REPORTS.filter((r) => {
      if (contractor !== "All Contractors" && r.contractor !== contractor) return false;
      if (zone !== "All Zones" && r.zone !== zone) return false;
      if (status !== "All Status" && r.status !== status) return false;
      if (q && !`${r.contractor} ${r.zone} ${r.date}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [contractor, zone, status, search]);

  const columns: GridColDef<DailyReportRow>[] = [
    { field: "date", headerName: "Date", width: 120, resizable: false },
    { field: "contractor", headerName: "Contractor", flex: 1, minWidth: 170, resizable: false },
    { field: "zone", headerName: "Zone", width: 110, resizable: false },
    { field: "manpower", headerName: "Manpower", width: 100, type: "number", resizable: false },
    { field: "qaqc", headerName: "QAQC", width: 80, type: "number", resizable: false },
    {
      field: "progress",
      headerName: "Progress",
      width: 160,
      resizable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
          <LinearProgress variant="determinate" value={p.row.progress} sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {p.row.progress}%
          </Typography>
        </Stack>
      ),
      sortable: true,
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      resizable: false,
      renderCell: (p) => <StatusChip status={p.row.status} />,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 80,
      sortable: false,
      filterable: false,
      resizable: false,
      renderCell: (p) => (
        <IconButton
          size="small"
          aria-label={`Actions for ${p.row.id}`}
          onClick={(e) => {
            setActiveRow(p.row);
            setMenuAnchor(e.currentTarget);
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Daily Reports"
        subtitle="View and manage daily construction reports"
        actions={
          <Button component={RouterLink} to="/evening-report" startIcon={<AddOutlinedIcon fontSize="small" />}>
            New Report
          </Button>
        }
      />

      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, lg: 2.5 }}>
              <DatePicker label="From" value={from} onChange={setFrom} slotProps={{ textField: { size: "small" } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2.5 }}>
              <DatePicker label="To" value={to} onChange={setTo} slotProps={{ textField: { size: "small" } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="f-contractor">Contractor</InputLabel>
                <Select
                  labelId="f-contractor"
                  label="Contractor"
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                >
                  <MenuItem value="All Contractors">All Contractors</MenuItem>
                  {CONTRACTOR_OPTIONS.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 1.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="f-zone">Zone</InputLabel>
                <Select labelId="f-zone" label="Zone" value={zone} onChange={(e) => setZone(e.target.value)}>
                  {ZONE_FILTER.map((z) => (
                    <MenuItem key={z} value={z}>
                      {z}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 1.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="f-status">Status</InputLabel>
                <Select labelId="f-status" label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_FILTER.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
              <TextField label="Search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ height: 520 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          pageSizeOptions={[5, 10, 25]}
          disableRowSelectionOnClick
        />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Showing {rows.length} of {DAILY_REPORTS.length} mock reports. Grid is structured for server-side
        pagination, sorting and filtering when the backend module lands.
      </Typography>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setDetailOpen(true);
          }}
        >
          View details
        </MenuItem>
      </Menu>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Report detail</DialogTitle>
        <DialogContent>
          {activeRow ? (
            <Stack spacing={1}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {activeRow.contractor} · {activeRow.zone}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeRow.date} · {activeRow.manpower} workers · {activeRow.qaqc} QAQC items ·{" "}
                {activeRow.progress}% progress
              </Typography>
              <StatusChip status={activeRow.status} />
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
