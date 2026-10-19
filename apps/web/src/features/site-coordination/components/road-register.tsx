import AddRoadOutlined from "@mui/icons-material/AddRoadOutlined";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import UndoOutlined from "@mui/icons-material/UndoOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import { Link as RouterLink } from "react-router-dom";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { coordinationToday, routeGeometryError, type CoordinationPoint, type RoadSegment, snapRoadPoint } from "@sts/shared";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header.js";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { TOKENS } from "@/app/theme/tokens.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";
import { useCoordination, useDeleteRoadSegment, useRoadSegments, useSaveRoadSegment } from "../hooks/use-coordination.js";
import { RoadMapStage, type RoadLine } from "./road-map-stage.js";

const OPEN = TOKENS.primary;
const CLOSED = TOKENS.muted;
type Form = { road: string; name: string; closed: boolean; points: CoordinationPoint[] };
const fail = (e: unknown) => toast.error(e instanceof HttpError ? e.message : "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");

// EPS road register: draw each site road once, split at junctions into named segments.
// Contractors then pick these segments for road requests instead of typing road names.
export function RoadRegister() {
  const { projectId } = useCurrentProject();
  const day = useCoordination(projectId, coordinationToday());
  const roads = useRoadSegments(projectId);
  const save = useSaveRoadSegment(projectId);
  const remove = useDeleteRoadSegment(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const segments = roads.data?.data ?? [];
  const map = day.data?.data.map;
  const isNew = drawing || (form !== null && selectedId === null);
  // Points land exactly on other roads' ends or lines when close, so junctions meet cleanly.
  const magnet = (p: CoordinationPoint) =>
    map ? snapRoadPoint(segments.map((r) => ({ id: r.id, name: r.name, points: r.points })), p, { width: map.width, height: map.height }, selectedId) : p;

  const pick = (s: RoadSegment) => {
    setDrawing(false); setSelectedId(s.id);
    setForm({ road: s.road, name: s.name, closed: s.closed, points: s.points });
  };
  const startNew = () => {
    setSelectedId(null); setDrawing(true);
    // Keep the code of the last road picked: the next segment is often on the same road.
    setForm({ road: form?.road ?? "", name: "", closed: false, points: [] });
  };
  const cancel = () => { setDrawing(false); setSelectedId(null); setForm(null); };
  const submit = async () => {
    if (!form) return;
    try {
      const res = await save.mutateAsync({ input: { road: form.road.trim(), name: form.name.trim(), closed: form.closed, points: form.points }, id: selectedId ?? undefined });
      toast.success(selectedId ? "บันทึกช่วงถนนแล้ว" : "เพิ่มช่วงถนนแล้ว");
      pick(res.data);
    } catch (e) { fail(e); }
  };
  const destroy = async () => {
    if (!selectedId) return;
    try { await remove.mutateAsync(selectedId); toast.success("ลบช่วงถนนแล้ว"); setConfirmDelete(false); cancel(); } catch (e) { fail(e); }
  };

  const lines: RoadLine[] = segments.map((s) => ({
    id: s.id,
    points: s.id === selectedId && form ? form.points : s.points,
    color: s.closed ? CLOSED : OPEN,
    label: s.name,
    dashed: s.closed,
    muted: Boolean(selectedId && s.id !== selectedId) || drawing,
  }));
  const pointsError = form ? routeGeometryError(form.points) : null;
  const ready = Boolean(form && form.road.trim() && form.name.trim() && !pointsError);
  const n = form?.points.length ?? 0;

  return (
    <Box>
      <PageHeader title="ทะเบียนถนน" subtitle="วาดถนนในไซต์ครั้งเดียว แบ่งเป็นช่วงตามทางแยก — ผู้รับเหมาเลือกช่วงถนนตอนขอใช้ถนน"
        actions={<Button component={RouterLink} to="/site-coordination" variant="text" startIcon={<ArrowBackOutlined />}>Back to Map</Button>} />
      {roads.isError || day.isError ? <Alert severity="error" sx={{ mb: 2 }}>โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้า</Alert> : null}
      <Card sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 340px" }, overflow: "hidden" }}>
        <Box sx={{ minWidth: 0, borderRight: { md: 1 }, borderColor: "divider" }}>
          {drawing ? (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 1.5, py: 0.75, borderBottom: 1, borderColor: "divider", bgcolor: "action.hover" }}>
              <AddRoadOutlined fontSize="small" color="primary" />
              <Typography variant="body2" sx={{ fontWeight: 600, flex: { xs: "1 1 calc(100% - 32px)", sm: "1 1 0" }, minWidth: 0 }}>
                {n === 0 ? "แตะจุดเริ่มของช่วงถนน (เช่น ทางแยก)" : n < 2 ? "แตะต่อตามแนวถนน" : `วางแล้ว ${n} จุด — แตะต่อ หรือกด เสร็จ เมื่อถึงทางแยกถัดไป`}
              </Typography>
              <Button size="small" startIcon={<UndoOutlined fontSize="small" />} disabled={!n} onClick={() => setForm((f) => f && { ...f, points: f.points.slice(0, -1) })}>ย้อนจุด</Button>
              <Button size="small" variant="contained" disableElevation startIcon={<CheckOutlined fontSize="small" />} disabled={n < 2} onClick={() => setDrawing(false)}>เสร็จ</Button>
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1.5, py: 0.75, borderBottom: 1, borderColor: "divider" }}>
              แตะเส้นถนนเพื่อแก้ไข · ลากจุดของช่วงที่เลือกเพื่อปรับแนว · ลากผังเพื่อเลื่อน · ล้อเมาส์เพื่อซูม
            </Typography>
          )}
          {map ? (
            <RoadMapStage
              map={map}
              lines={lines}
              selectedId={selectedId}
              draft={drawing ? form?.points : null}
              editPoints={!drawing && selectedId && form ? form.points : null}
              onTapMap={drawing ? (p) => setForm((f) => f && { ...f, points: [...f.points, magnet(p)] }) : undefined}
              onTapLine={drawing ? undefined : (id) => { const s = segments.find((v) => v.id === id); if (s) pick(s); }}
              onMovePoint={(i, p) => setForm((f) => f && { ...f, points: f.points.map((v, j) => (j === i ? magnet(p) : v)) })}
            />
          ) : (
            <Skeleton variant="rectangular" height={520} />
          )}
        </Box>
        <Stack sx={{ minWidth: 0 }}>
          {form && !drawing ? (
            <Stack spacing={1.5} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="subtitle2">{isNew ? "ช่วงถนนใหม่" : "แก้ไขช่วงถนน"}</Typography>
              <Stack direction="row" spacing={1}>
                <TextField size="small" label="รหัสถนน" placeholder="R2" value={form.road} onChange={(e) => setForm({ ...form, road: e.target.value })} sx={{ width: 110 }} slotProps={{ htmlInput: { maxLength: 20 } }} />
                <TextField size="small" label="ชื่อช่วง" placeholder="R2 Boiler–ACC" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth slotProps={{ htmlInput: { maxLength: 80 } }} />
              </Stack>
              <Typography variant="caption" color={pointsError ? "warning.dark" : "text.secondary"}>
                {pointsError ?? `${form.points.length} จุด · ผู้รับเหมาจะเห็นชื่อนี้ · ถนนเดียวกันที่ถูกตัดเป็นหลายส่วน ใช้รหัสและชื่อเดิมได้`}
              </Typography>
              <FormControlLabel control={<Switch checked={form.closed} onChange={(e) => setForm({ ...form, closed: e.target.checked })} />} label="ปิดถนน (ผู้รับเหมาเลือกไม่ได้)" />
              <Stack direction="row" spacing={1}>
                <Button color="inherit" onClick={cancel}>ยกเลิก</Button>
                {!isNew ? <Button color="error" startIcon={<DeleteOutlineOutlined />} onClick={() => setConfirmDelete(true)}>ลบ</Button> : null}
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" disableElevation disabled={!ready || save.isPending} onClick={() => void submit()}>บันทึก</Button>
              </Stack>
            </Stack>
          ) : null}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.25 }}>
            <Typography variant="subtitle2">ช่วงถนน ({segments.length})</Typography>
            <Button size="small" variant="contained" disableElevation startIcon={<AddRoadOutlined />} onClick={startNew} disabled={drawing || !map}>วาดช่วงใหม่</Button>
          </Stack>
          <Box sx={{ overflowY: "auto", maxHeight: 460 }}>
            {roads.isPending ? <Skeleton sx={{ mx: 2 }} height={40} /> : segments.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
                ยังไม่มีถนนในทะเบียน — กด «วาดช่วงใหม่» แล้วแตะตามแนวถนนจากทางแยกหนึ่งถึงอีกทางแยกหนึ่ง
              </Typography>
            ) : segments.map((s) => (
              <ListItemButton key={s.id} selected={s.id === selectedId} onClick={() => pick(s)} sx={{ borderTop: 1, borderColor: "divider" }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: s.closed ? CLOSED : OPEN, mr: 1.5, flexShrink: 0 }} />
                <ListItemText primary={s.name} secondary={`${s.road} · ${s.points.length} จุด`} />
                {s.closed ? <Chip size="small" label="ปิด" /> : null}
              </ListItemButton>
            ))}
          </Box>
        </Stack>
      </Card>
      <ConfirmDialog
        open={confirmDelete}
        title="ลบช่วงถนน?"
        description={`${form?.name ?? ""} จะหายจากทะเบียน คำขอใช้ถนนที่เลือกช่วงนี้ไว้แล้วยังเก็บเส้นทางที่วาดไว้`}
        confirmLabel="ลบ"
        cancelLabel="ยกเลิก"
        onConfirm={() => void destroy()}
        onClose={() => setConfirmDelete(false)}
      />
    </Box>
  );
}
