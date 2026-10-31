import type { CoordinationMapAdmin } from "@sts/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import ArrowDownwardOutlined from "@mui/icons-material/ArrowDownwardOutlined";
import ArrowUpwardOutlined from "@mui/icons-material/ArrowUpwardOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { TableCard } from "@/components/ui/table-card.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";
import { useDeleteMap, useMapsAdmin, useReorderMaps } from "../hooks/use-coordination.js";
import { MapDialog } from "../components/map-dialog.js";

// EPS admin: the working-area maps the Map page's "Area" dropdown offers. The first map is the main one
// (default area, road register) and stays first; the others can be added, renamed, re-pictured, reordered, deleted.
export function MapsPage() {
  const { projectId } = useCurrentProject();
  const list = useMapsAdmin(projectId);
  const reorder = useReorderMaps(projectId);
  const remove = useDeleteMap(projectId);
  const [editing, setEditing] = useState<CoordinationMapAdmin | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CoordinationMapAdmin | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const rows = list.data ?? [];

  const move = async (index: number, by: -1 | 1) => {
    const next = rows.map((r) => r.id);
    const [id] = next.splice(index, 1);
    next.splice(index + by, 0, id!);
    setActionError(null);
    try { await reorder.mutateAsync(next); } catch (e) { setActionError(e instanceof HttpError ? e.message : "จัดลำดับไม่สำเร็จ"); }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try { await remove.mutateAsync(deleteTarget.id); toast.success("ลบพื้นที่แล้ว"); setDeleteTarget(null); }
    catch (e) { setActionError(e instanceof HttpError ? e.message : "ลบไม่สำเร็จ"); }
  };

  return (
    <Box>
      <PageHeader
        title="Map Areas"
        subtitle="ผังพื้นที่ทำงานที่เลือกได้ในเมนู Area ของแผนที่ — เพิ่มรูป ตั้งชื่อ และจัดลำดับได้"
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button component={RouterLink} to="/site-coordination" variant="outlined" startIcon={<ArrowBackOutlined />}>Back to Map</Button>
            <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setAdding(true)} disabled={!projectId}>Add area</Button>
          </Stack>
        }
      />
      {actionError ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert> : null}
      {list.isError ? <QueryError error={list.error} onRetry={() => void list.refetch()} /> : null}
      {list.isLoading ? <BlockSkeleton height={240} /> : null}
      {list.data ? (
        <TableCard title={`${rows.length} area${rows.length === 1 ? "" : "s"}`}
          actions={<Typography variant="caption" color="text.secondary">พื้นที่แรกคือผังหลัก (ย้ายหรือลบไม่ได้) · ทะเบียนถนนวาดบนผังหลัก</Typography>}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 120 }}>Picture</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell align="right">Jobs</TableCell>
                  <TableCell align="right">Route sections</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => {
                  const blocked = row.isMain ? "The main area cannot be deleted" : row.jobCount > 0 ? `${row.jobCount} job${row.jobCount === 1 ? "" : "s"} are drawn on this area` : null;
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Box component="img" src={row.imagePath} alt="" loading="lazy" sx={{ display: "block", width: 96, height: 64, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.name}</Typography>
                          {row.isMain ? <Chip size="small" color="primary" variant="outlined" label="Main" sx={{ height: 20 }} /> : null}
                          {!row.uploaded ? <Chip size="small" variant="outlined" label="Built-in file" sx={{ height: 20 }} /> : null}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{row.nameTh}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="caption">{row.width} × {row.height}</Typography></TableCell>
                      <TableCell align="right">{row.jobCount}</TableCell>
                      <TableCell align="right">{row.sectionCount}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Tooltip title="Draw route sections on this map"><IconButton size="small" aria-label={`Route sections of ${row.name}`} component={RouterLink} to={`/site-coordination/sections?mapId=${row.id}`}><RouteOutlined fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Move up"><span><IconButton size="small" aria-label={`Move ${row.name} up`} disabled={index < 2 || reorder.isPending} onClick={() => void move(index, -1)}><ArrowUpwardOutlined fontSize="small" /></IconButton></span></Tooltip>
                        <Tooltip title="Move down"><span><IconButton size="small" aria-label={`Move ${row.name} down`} disabled={row.isMain || index === rows.length - 1 || reorder.isPending} onClick={() => void move(index, 1)}><ArrowDownwardOutlined fontSize="small" /></IconButton></span></Tooltip>
                        <Tooltip title="Edit"><IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => setEditing(row)}><EditOutlined fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title={blocked ?? "Delete"}><span><IconButton size="small" aria-label={`Delete ${row.name}`} disabled={Boolean(blocked) || remove.isPending} onClick={() => setDeleteTarget(row)}><DeleteOutlineOutlined fontSize="small" /></IconButton></span></Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TableCard>
      ) : null}

      {projectId && (adding || editing) ? <MapDialog projectId={projectId} map={editing} onClose={() => { setAdding(false); setEditing(null); }} /> : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete area?"
        description={deleteTarget ? `"${deleteTarget.name}" และเส้นช่วง (route sections) ของพื้นที่นี้จะถูกลบ — ลบแล้วเรียกคืนไม่ได้` : undefined}
        confirmLabel="Delete"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      >
        {actionError ? <Alert severity="error">{actionError}</Alert> : null}
      </ConfirmDialog>
    </Box>
  );
}
