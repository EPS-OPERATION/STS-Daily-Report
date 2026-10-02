import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
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
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { useMaterials } from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { useProjectContractors } from "@/features/projects/hooks/use-projects.js";
import { HttpError } from "@/services/http/client.js";

// EPS view of materials contractors reported on site: totals per material
// plus the day-by-day log. Data rides the evening check-out — no separate
// material form anywhere else.
export function MaterialsPage() {
  const { projectId } = useCurrentProject();
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf("month"));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [search, setSearch] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(0);
  }, [from, to, search, contractorId, pageSize]);

  const filters = useMemo(
    () => ({
      from: from?.format("YYYY-MM-DD"),
      to: to?.format("YYYY-MM-DD"),
      search: search.trim() || undefined,
      contractorId: contractorId || undefined,
      page: page + 1,
      pageSize,
    }),
    [from, to, search, contractorId, page, pageSize],
  );
  const log = useMaterials(projectId, filters);
  const contractors = useProjectContractors(projectId);

  const payload = log.data?.data;
  const rows = payload?.data ?? [];
  const summary = payload?.summary ?? [];
  const total = payload?.meta.total ?? 0;

  return (
    <Box>
      <PageHeader title="Materials" subtitle="วัสดุหน้างานที่ผู้รับเหมารายงานผ่าน check-out — รวมตามวัสดุ + บันทึกรายวัน" />

      {!projectId ? (
        <Alert severity="info">Select a project to see its materials.</Alert>
      ) : log.isError ? (
        <Alert severity="error">
          {log.error instanceof HttpError ? log.error.message : "Could not load materials"}
        </Alert>
      ) : log.isPending ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={90} />
          <Skeleton variant="rounded" height={200} />
        </Stack>
      ) : (
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    รายการทั้งหมด
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {total}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    วัสดุที่พบ
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {summary.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ชนิด (ชื่อ + หน่วย)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    ใช้มากสุด
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {summary[0] ? `${summary[0].materialName} · ${summary[0].totalQty} ${summary[0].unit}` : "—"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary[0] ? `จาก ${summary[0].entries} รายการ` : "ยังไม่มีข้อมูล"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, lg: 2.5 }}>
                  <DatePicker label="From" value={from} onChange={setFrom} slotProps={{ textField: { size: "small", fullWidth: true } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 2.5 }}>
                  <DatePicker label="To" value={to} onChange={setTo} slotProps={{ textField: { size: "small", fullWidth: true } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 2.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="mat-contractor">Contractor</InputLabel>
                    <Select
                      labelId="mat-contractor"
                      label="Contractor"
                      value={contractorId}
                      onChange={(e) => setContractorId(e.target.value)}
                    >
                      <MenuItem value="">All Contractors</MenuItem>
                      {(contractors.data?.data ?? []).map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 4.5 }}>
                  <TextField
                    label="Search material"
                    placeholder="เช่น ปูน ทราย เหล็ก…"
                    size="small"
                    fullWidth
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {rows.length === 0 ? (
            <EmptyState
              icon={<Inventory2OutlinedIcon />}
              title="No materials in view"
              description="Nothing reported for these filters yet — materials appear here once contractors submit their evening check-out."
            />
          ) : (
            <Card>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small" aria-label="Materials log">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Contractor</TableCell>
                      <TableCell>Material</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell>Unit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{r.reportDate}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {r.contractorCode} — {r.contractorName}
                        </TableCell>
                        <TableCell>{r.materialName}</TableCell>
                        <TableCell align="right">{r.qty}</TableCell>
                        <TableCell>{r.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <TablePagination
                component="div"
                count={total}
                page={page}
                rowsPerPage={pageSize}
                rowsPerPageOptions={[10, 25, 50]}
                onPageChange={(_, v) => setPage(v)}
                onRowsPerPageChange={(e) => {
                  setPageSize(Number(e.target.value));
                }}
              />
            </Card>
          )}
        </Box>
      )}
    </Box>
  );
}
