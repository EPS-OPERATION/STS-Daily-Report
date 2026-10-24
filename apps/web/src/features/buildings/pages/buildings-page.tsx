import AddOutlined from "@mui/icons-material/AddOutlined";
import DragIndicatorOutlined from "@mui/icons-material/DragIndicatorOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { TableCard } from "@/components/ui/table-card.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";
import { BuildingDialog } from "../components/building-dialog.js";
import { useManagedBuildings, useReorderBuildings, useUpdateBuilding } from "../hooks/use-buildings.js";
import type { ManagedBuilding } from "../types/building.types.js";

// eps_admin: the building list contractors pick in Today Activity / requests. Add, edit, hide (never delete —
// old reports keep their building), drag to set the order of the dropdowns.
export function BuildingsPage() {
  const { projectId } = useCurrentProject();
  const list = useManagedBuildings(projectId);
  const update = useUpdateBuilding(projectId);
  const reorder = useReorderBuildings(projectId);
  const [editing, setEditing] = useState<ManagedBuilding | null>(null);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rows, setRows] = useState<ManagedBuilding[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // A press that starts on a control (switch / edit) must not start a row drag.
  const dragBlocked = useRef(false);

  // The server order is the source of truth; this local copy makes a drop feel instant.
  useEffect(() => {
    if (list.data) setRows(list.data);
  }, [list.data]);

  const moveRow = (from: number, to: number) => {
    if (from < 0 || to < 0 || from === to) return;
    const current = rows;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setRows(next);
    reorder.mutate(next.map((row) => row.id), {
      onError: (err) => {
        setRows(current);
        setActionError(err instanceof HttpError ? err.message : "จัดลำดับไม่สำเร็จ");
      },
    });
  };

  const toggleActive = async (building: ManagedBuilding, active: boolean) => {
    setActionError(null);
    try {
      await update.mutateAsync({ id: building.id, input: { status: active ? "active" : "inactive" } });
    } catch (err) {
      setActionError(err instanceof HttpError ? err.message : "เปลี่ยนสถานะไม่สำเร็จ");
    }
  };

  const activeCount = rows.filter((b) => b.status === "active").length;

  return (
    <Box>
      <PageHeader
        title="อาคาร (Buildings)"
        subtitle="รายชื่ออาคารที่ผู้รับเหมาเลือกในรายงาน (Today Activity, คำขอ) — เพิ่ม แก้ไข ซ่อน และจัดลำดับได้"
        actions={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setAdding(true)} disabled={!projectId}>
            Add building
          </Button>
        }
      />

      {actionError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      ) : null}
      {list.isError ? <QueryError error={list.error} onRetry={() => void list.refetch()} /> : null}
      {list.isLoading ? <BlockSkeleton height={320} /> : null}

      {list.data ? (
        <TableCard
          title={`${activeCount} ใช้งาน · ${rows.length - activeCount} ซ่อน`}
          actions={<Typography variant="caption" color="text.secondary">ลากแถวเพื่อจัดลำดับในรายการเลือก · ซ่อนแล้วรายงานเก่ายังแสดงอาคารเดิม</Typography>}
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 36 }} />
                  <TableCell>Code</TableCell>
                  <TableCell>ชื่ออาคาร</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>ชื่อภาษาไทย</TableCell>
                  <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>ใช้ในรายงาน</TableCell>
                  <TableCell align="center">Active</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((b) => (
                  <TableRow
                    key={b.id}
                    hover
                    draggable={!reorder.isPending}
                    onPointerDown={(event) => {
                      dragBlocked.current = Boolean((event.target as HTMLElement).closest("button, a, input, .MuiSwitch-root, [role='switch']"));
                    }}
                    onDragStart={(event) => {
                      if (dragBlocked.current || reorder.isPending) {
                        event.preventDefault();
                        return;
                      }
                      setDragId(b.id);
                      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => { setDragId(null); setOverId(null); }}
                    onDragOver={(event) => {
                      if (!dragId) return;
                      event.preventDefault();
                      setOverId(b.id);
                    }}
                    onDragLeave={() => setOverId((id) => (id === b.id ? null : id))}
                    onDrop={(event) => {
                      event.preventDefault();
                      const from = rows.findIndex((row) => row.id === dragId);
                      const to = rows.findIndex((row) => row.id === b.id);
                      setDragId(null);
                      setOverId(null);
                      moveRow(from, to);
                    }}
                    sx={{
                      cursor: reorder.isPending ? "default" : dragId === b.id ? "grabbing" : "grab",
                      opacity: dragId === b.id ? 0.45 : b.status === "active" ? 1 : 0.55,
                      bgcolor: overId === b.id && dragId !== b.id ? "action.hover" : undefined,
                    }}
                  >
                    <TableCell sx={{ width: 36, p: 0.5 }}>
                      <Box aria-hidden="true" title="ลากเพื่อจัดลำดับ" sx={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 1, color: "text.disabled" }}>
                        <DragIndicatorOutlined fontSize="small" />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>{b.code}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.name}</Typography>
                      {b.nameTh ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "block", md: "none" } }}>{b.nameTh}</Typography>
                      ) : null}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{b.nameTh ?? "—"}</TableCell>
                    <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>{b.usage || "—"}</TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={b.status === "active"}
                        disabled={update.isPending}
                        onChange={(e) => void toggleActive(b, e.target.checked)}
                        slotProps={{ input: { "aria-label": `Active ${b.code}` } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end">
                        <IconButton size="small" aria-label={`Edit ${b.code}`} onClick={() => setEditing(b)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TableCard>
      ) : null}

      {projectId && (adding || editing) ? (
        <BuildingDialog projectId={projectId} building={editing} onClose={() => { setAdding(false); setEditing(null); }} />
      ) : null}
    </Box>
  );
}
