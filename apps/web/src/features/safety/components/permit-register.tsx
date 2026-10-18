import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { EmptyState } from "@/components/ui/empty-state.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { permitLabel } from "@/features/daily-requests/index.js";
import { shortDate } from "@/lib/dates.js";
import type { UseWorkPermitsViewState } from "../hooks/use-work-permits-view.js";

export function PermitRegister({ ed }: { ed: UseWorkPermitsViewState }) {
  const { type, setType, page, setPage, rowsPerPage, setRowsPerPage, query, namesByCode, rows, clearAll } = ed;
  return (
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
              <BlockSkeleton height={160} />
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
                      {shortDate(p.targetDate)}
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
  );
}
