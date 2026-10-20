import type { CoordinationItemType } from "@sts/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import DragIndicatorOutlined from "@mui/icons-material/DragIndicatorOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
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
import { Link as RouterLink } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { TableCard } from "@/components/ui/table-card.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";
import { useDeleteItemType, useItemTypes, useReorderItemTypes, useUpdateItemType } from "../hooks/use-coordination.js";
import { CoordinationGlyph } from "../components/coordination-icon.js";
import { ItemTypeDialog } from "../components/item-type-dialog.js";

export function ItemTypesPage() {
  const { projectId } = useCurrentProject();
  const list = useItemTypes(projectId);
  const update = useUpdateItemType(projectId);
  const remove = useDeleteItemType(projectId);
  const reorder = useReorderItemTypes(projectId);
  const [editing, setEditing] = useState<CoordinationItemType | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CoordinationItemType | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rows, setRows] = useState<CoordinationItemType[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // A press that starts on a control (switch / edit / delete) must not start a row drag.
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

  const toggleActive = async (item: CoordinationItemType, isActive: boolean) => {
    setActionError(null);
    try {
      await update.mutateAsync({ id: item.id, input: { isActive } });
    } catch (err) {
      setActionError(err instanceof HttpError ? err.message : "เปลี่ยนสถานะไม่สำเร็จ");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await remove.mutateAsync(deleteTarget.id);
      toast.success("ลบประเภทงานแล้ว");
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err instanceof HttpError ? err.message : "ลบไม่สำเร็จ");
    }
  };

  return (
    <Box>
      <PageHeader
        title="Map Item Types"
        subtitle="งานประเภทต่าง ๆ ที่แสดงในเมนู Add item ของแผนที่ — เพิ่ม/แก้ชื่อ/ไอคอน/ลำดับได้"
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button component={RouterLink} to="/site-coordination" variant="outlined" startIcon={<ArrowBackOutlined />}>
              Back to Map
            </Button>
            <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setAdding(true)} disabled={!projectId}>
              Add item type
            </Button>
          </Stack>
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
          title={`${rows.length} types`}
          actions={<Typography variant="caption" color="text.secondary">ลากแถวเพื่อจัดลำดับ · ประเภทใหม่จะอยู่ท้าย</Typography>}
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 36 }} />
                  <TableCell>Icon</TableCell>
                  <TableCell>ชื่อภาษาไทย</TableCell>
                  <TableCell>English</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell align="center">Shown</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((item) => (
                  <TableRow
                    key={item.id}
                    hover
                    draggable={!reorder.isPending}
                    onPointerDown={(event) => {
                      dragBlocked.current = Boolean((event.target as HTMLElement).closest("button, a, input, .MuiSwitch-root, [role='switch'], [role='checkbox']"));
                    }}
                    onDragStart={(event) => {
                      // The whole row is the drag target; controls keep their normal behaviour.
                      if (dragBlocked.current || reorder.isPending) {
                        event.preventDefault();
                        return;
                      }
                      setDragId(item.id);
                      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => { setDragId(null); setOverId(null); }}
                    onDragOver={(event) => {
                      if (!dragId) return;
                      event.preventDefault();
                      setOverId(item.id);
                    }}
                    onDragLeave={() => setOverId((id) => (id === item.id ? null : id))}
                    onDrop={(event) => {
                      event.preventDefault();
                      const from = rows.findIndex((row) => row.id === dragId);
                      const to = rows.findIndex((row) => row.id === item.id);
                      setDragId(null);
                      setOverId(null);
                      moveRow(from, to);
                    }}
                    sx={{
                      cursor: reorder.isPending ? "default" : dragId === item.id ? "grabbing" : "grab",
                      opacity: dragId === item.id ? 0.45 : 1,
                      bgcolor: overId === item.id && dragId !== item.id ? "action.hover" : undefined,
                    }}
                  >
                    <TableCell sx={{ width: 36, p: 0.5 }}>
                      <Box
                        aria-hidden="true"
                        title="ลากเพื่อจัดลำดับ"
                        sx={{
                          display: "grid",
                          placeItems: "center",
                          width: 28,
                          height: 28,
                          borderRadius: 1,
                          color: "text.disabled",
                          "&:hover": { bgcolor: "action.hover", color: "text.secondary" },
                        }}
                      >
                        <DragIndicatorOutlined fontSize="small" />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ width: 64 }}>
                      <Box sx={{ width: 32, height: 32, display: "grid", placeItems: "center", borderRadius: 1, bgcolor: "action.hover", color: "text.secondary" }}>
                        <CoordinationGlyph iconKey={item.iconKey} size={22} />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.labelTh}
                        </Typography>
                        {item.isSystem ? <Chip size="small" variant="outlined" label="Built-in" sx={{ height: 20 }} /> : null}
                      </Stack>
                    </TableCell>
                    <TableCell>{item.label}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {item.code}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={item.isActive}
                        disabled={update.isPending || item.code === "road" || item.code === "text"}
                        onChange={(e) => void toggleActive(item, e.target.checked)}
                        inputProps={{ "aria-label": `Show ${item.labelTh}` }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" aria-label={`Edit ${item.labelTh}`} onClick={() => setEditing(item)}>
                        <EditOutlined fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label={`Delete ${item.labelTh}`}
                        disabled={item.isSystem || remove.isPending}
                        onClick={() => setDeleteTarget(item)}
                      >
                        <DeleteOutlineOutlined fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TableCard>
      ) : null}

      {projectId && (adding || editing) ? (
        <ItemTypeDialog projectId={projectId} item={editing} onClose={() => { setAdding(false); setEditing(null); }} />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete item type?"
        description={deleteTarget ? `ลบ "${deleteTarget.labelTh}" ออกจากเมนู Add item — งานเก่าที่ยังใช้ประเภทนี้จะลบไม่ได้` : undefined}
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
