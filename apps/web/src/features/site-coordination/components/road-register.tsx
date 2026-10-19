import AddRoadOutlined from "@mui/icons-material/AddRoadOutlined";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandLessOutlined from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import RestartAltOutlined from "@mui/icons-material/RestartAltOutlined";
import UndoOutlined from "@mui/icons-material/UndoOutlined";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { coordinationToday, routeGeometryError, type CoordinationPoint, type RoadSegment, snapRoadPoint } from "@sts/shared";
import { useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header.js";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { TOKENS } from "@/app/theme/tokens.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";
import { useCoordination, useDeleteRoadSegment, useRoadSegments, useSaveRoadSegment } from "../hooks/use-coordination.js";
import { RoadMapStage, type RoadLine } from "./road-map-stage.js";
import { clamp } from "../utils/canvas-geometry.js";

const OPEN = TOKENS.primary;
const CLOSED = TOKENS.muted;
/** A piece being drawn or edited. `newRoad`: the road (code + name) is typed in, not picked. */
type Form = { road: string; name: string; closed: boolean; points: CoordinationPoint[]; newRoad: boolean };
/** One road = every piece sharing a code (a road cut at junctions is several pieces, one name). */
type Road = { road: string; name: string; pieces: RoadSegment[] };
const fail = (e: unknown) => toast.error(e instanceof HttpError ? e.message : "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
const pathLength = (pts: CoordinationPoint[]) => pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y), 0);

// EPS road register: draw each site road once, cut at junctions into pieces of one named road.
// Contractors then pick these roads for road requests instead of typing road names.
// Flow: Add road → tap along the road (floating Undo / Done) → pick the road it belongs to (or a new one) → Save.
export function RoadRegister() {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("md"));
  const { projectId } = useCurrentProject();
  const day = useCoordination(projectId, coordinationToday());
  const roads = useRoadSegments(projectId);
  const save = useSaveRoadSegment(projectId);
  const remove = useDeleteRoadSegment(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openRoad, setOpenRoad] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [focus, setFocus] = useState<{ key: number; points: CoordinationPoint[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [changeRoad, setChangeRoad] = useState(false);
  const dragBase = useRef<CoordinationPoint[] | null>(null);
  const segments = roads.data?.data ?? [];
  const map = day.data?.data.map;
  const groups = useMemo(() => {
    const byCode = new Map<string, Road>();
    for (const s of segments) {
      const g = byCode.get(s.road) ?? { road: s.road, name: s.name, pieces: [] };
      g.pieces.push(s); byCode.set(s.road, g);
    }
    return [...byCode.values()].sort((a, b) => a.road.localeCompare(b.road, undefined, { numeric: true }));
  }, [segments]);
  // Name on the map once per road (on its longest piece), not on every piece.
  const labelled = useMemo(() => new Set(groups.map((g) => g.pieces.reduce((a, b) => (pathLength(b.points) > pathLength(a.points) ? b : a)).id)), [groups]);
  const isNew = form !== null && selectedId === null;
  // Points land exactly on other roads' ends or lines when close, so junctions meet cleanly.
  const magnet = (p: CoordinationPoint) =>
    map ? snapRoadPoint(segments.map((r) => ({ id: r.id, name: r.name, points: r.points })), p, { width: map.width, height: map.height }, selectedId) : p;
  const flyTo = (points: CoordinationPoint[]) => setFocus({ key: Date.now(), points });

  const pickPiece = (s: RoadSegment) => {
    setDrawing(false); setSelectedId(s.id); setOpenRoad(s.road); setChangeRoad(false);
    setForm({ road: s.road, name: s.name, closed: s.closed, points: s.points, newRoad: false });
    flyTo(s.points);
  };
  const toggleRoad = (g: Road) => {
    if (drawing) return;
    setSelectedId(null); setForm(null);
    if (openRoad === g.road) { setOpenRoad(null); return; }
    setOpenRoad(g.road); flyTo(g.pieces.flatMap((p) => p.points));
  };
  // Next free code for a new road: R1, R2, … (editable).
  const nextCode = () => {
    const used = new Set(groups.map((g) => g.road.toUpperCase()));
    let i = Math.max(0, ...groups.map((g) => Number(/^R(\d+)$/i.exec(g.road)?.[1] ?? 0))) + 1;
    while (used.has(`R${i}`)) i++;
    return `R${i}`;
  };
  // Add road = a new road (name + code); Add piece = one more piece of the road given.
  const startNew = (to?: Road) => {
    setSelectedId(null); setDrawing(true); setChangeRoad(false);
    if (to) setOpenRoad(to.road);
    setForm(to ? { road: to.road, name: to.name, closed: false, points: [], newRoad: false } : { road: nextCode(), name: "", closed: false, points: [], newRoad: true });
  };
  const cancel = () => { setDrawing(false); setSelectedId(null); setForm(null); setChangeRoad(false); };
  // Tap on blank map (not drawing) = deselect, like the coordination map. Saving is explicit here, so a
  // stray tap never drops work: a just-drawn piece or unsaved edits stay (with a reminder).
  const tapBlank = () => {
    if (form && selectedId === null) return;
    if (form && selectedId) {
      const s = segments.find((v) => v.id === selectedId);
      const dirty = !s || s.road !== form.road || s.name !== form.name || s.closed !== form.closed || JSON.stringify(s.points) !== JSON.stringify(form.points);
      if (dirty) { toast.info("มีการแก้ไขที่ยังไม่บันทึก — กด Save หรือ Cancel", { id: "road-unsaved" }); return; }
      cancel(); return;
    }
    setOpenRoad(null);
  };
  // A "new" road typed with the name of an existing one joins that road (one name = one code).
  const sameName = form?.newRoad ? groups.find((g) => g.name.trim().toLowerCase() === form.name.trim().toLowerCase()) : undefined;
  const submit = async () => {
    if (!form) return;
    const road = sameName ? sameName.road : form.road.trim();
    try {
      const res = await save.mutateAsync({ input: { road, name: form.name.trim(), closed: form.closed, points: form.points }, id: selectedId ?? undefined });
      toast.success(selectedId ? "บันทึกช่วงถนนแล้ว" : "เพิ่มช่วงถนนแล้ว");
      pickPiece(res.data);
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
    label: labelled.has(s.id) ? s.name : undefined,
    dashed: s.closed,
    emphasis: !selectedId && openRoad === s.road,
    muted: drawing || Boolean(selectedId && s.id !== selectedId) || Boolean(!selectedId && openRoad && s.road !== openRoad) || (isNew && !drawing),
  }));
  // After Done: the new piece stays on the map (labelled with the road being picked) while it is named,
  // and its points can still be dragged before Save.
  if (isNew && !drawing && form && form.points.length >= 2) {
    lines.push({ id: "new-piece", points: form.points, color: form.closed ? CLOSED : OPEN, dashed: form.closed, emphasis: true, passive: true,
      label: form.name.trim() ? `${form.road.trim() ? `${form.road.trim()} · ` : ""}${form.name.trim()}` : "ช่วงใหม่" });
  }
  const pointsError = form ? routeGeometryError(form.points) : null;
  const ready = Boolean(form && form.road.trim() && form.name.trim() && !pointsError);
  const n = form?.points.length ?? 0;
  const picked = form && !form.newRoad ? groups.find((g) => g.road === form.road) ?? null : null;

  // Road section. New road: name + code. A piece of an existing road: the road as a card (Change → picker).
  const sectionLabel = (text: string) => <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 0.75 }}>{text}</Typography>;
  const roadSection = form && (form.newRoad ? (
    <Box>
      {sectionLabel("Road")}
      <Stack spacing={1.25}>
        <TextField size="small" label="Road name" placeholder="เช่น ถนนหน้าโรงงาน" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth slotProps={{ htmlInput: { maxLength: 80 } }} autoFocus />
        <TextField size="small" label="Code" value={sameName ? sameName.road : form.road} disabled={Boolean(sameName)} onChange={(e) => setForm({ ...form, road: e.target.value })}
          helperText={sameName ? `มีถนนชื่อนี้แล้ว — ช่วงนี้จะต่อเป็นส่วนหนึ่งของ ${sameName.road}` : "รหัสสั้นของถนน ผู้รับเหมาเห็นคู่กับชื่อ"} fullWidth slotProps={{ htmlInput: { maxLength: 20 } }} />
      </Stack>
      {groups.length > 0 && <Button size="small" variant="text" onClick={() => { setChangeRoad(true); setForm({ ...form, newRoad: false, road: "", name: "" }); }} sx={{ mt: 0.5, ml: -0.75 }}>Add to an existing road instead</Button>}
    </Box>
  ) : picked && !changeRoad ? (
    <Box>
      {sectionLabel("Road")}
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 1.5, py: 1.25, border: 1, borderColor: "divider", borderRadius: 1 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: OPEN, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap><b>{picked.road}</b> · {picked.name}</Typography>
          <Typography variant="caption" color="text.secondary">{picked.pieces.length} ช่วง</Typography>
        </Box>
        <Button size="small" variant="text" onClick={() => setChangeRoad(true)}>Change</Button>
      </Stack>
    </Box>
  ) : (
    <Box>
      {sectionLabel("Road")}
      <Autocomplete size="small" options={groups} value={picked} onChange={(_, g) => { setForm({ ...form, road: g?.road ?? "", name: g?.name ?? "" }); if (g) setChangeRoad(false); }}
        getOptionLabel={(g) => `${g.road} · ${g.name}`} isOptionEqualToValue={(x, y) => x.road === y.road}
        renderOption={(props, g) => <li {...props} key={g.road}><ListItemText primary={`${g.road} · ${g.name}`} secondary={`${g.pieces.length} ช่วง`} /></li>}
        renderInput={(params) => <TextField {...params} label="Road" placeholder="เลือกถนนที่ช่วงนี้เป็นส่วนหนึ่ง" autoFocus />} />
      <Button size="small" variant="text" startIcon={<AddRoadOutlined />} onClick={() => { setChangeRoad(false); setForm({ ...form, newRoad: true, road: nextCode(), name: "" }); }} sx={{ mt: 0.5, ml: -0.75 }}>New road instead</Button>
    </Box>
  ));
  const pieceNo = selectedId && picked ? picked.pieces.findIndex((v) => v.id === selectedId) + 1 : 0;
  const formTitle = !isNew ? `Edit piece ${pieceNo || ""}`.trim() : form?.newRoad ? "New road" : "New piece";
  const formSub = form && !form.newRoad && picked ? `${picked.road} · ${picked.name}${pieceNo ? ` · ${pieceNo} of ${picked.pieces.length}` : ""}` : isNew ? "ตั้งชื่อถนนที่เพิ่งวาด" : "";

  return (
    <Box>
      <PageHeader title="ทะเบียนถนน" subtitle="วาดถนนในไซต์ครั้งเดียว ตัดเป็นช่วงตามทางแยก — ผู้รับเหมาเลือกถนนตอนขอใช้ถนน"
        actions={<Button component={RouterLink} to="/site-coordination" variant="text" startIcon={<ArrowBackOutlined />}>Back to Map</Button>} />
      {roads.isError || day.isError ? <Alert severity="error" sx={{ mb: 2 }}>โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้า</Alert> : null}
      <Card sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 360px" }, gridTemplateRows: { md: "minmax(0, 1fr)" }, overflow: "hidden",
        height: { md: "calc(100dvh - 210px)" }, minHeight: { md: 520 } }}>
        <Box sx={{ minWidth: 0, minHeight: 0, borderRight: { md: 1 }, borderColor: "divider", display: "flex", flexDirection: "column" }}>
          {map ? (
            <RoadMapStage
              map={map}
              lines={lines}
              selectedId={selectedId}
              height={wide ? "fill" : 440}
              draft={drawing ? form?.points : null}
              editPoints={!drawing && form ? form.points : null}
              snapPreview={magnet}
              focus={focus}
              onTapMap={drawing ? (p) => setForm((f) => f && { ...f, points: [...f.points, magnet(p)] }) : tapBlank}
              onTapLine={drawing ? undefined : (id) => { const s = segments.find((v) => v.id === id); if (s) pickPiece(s); }}
              onMovePoint={(i, p) => setForm((f) => f && { ...f, points: f.points.map((v, j) => (j === i ? magnet(p) : v)) })}
              // Drag the selected piece whole; on release its two ends snap onto junctions / other roads.
              onDragLine={selectedId && !drawing ? (phase, d) => {
                if (phase === "start") { dragBase.current = form?.points ?? null; return; }
                const base = dragBase.current;
                if (!base) return;
                if (phase === "move") { setForm((f) => f && { ...f, points: base.map((p) => ({ x: clamp(p.x + d.x), y: clamp(p.y + d.y) })) }); return; }
                dragBase.current = null;
                setForm((f) => f && { ...f, points: f.points.map((p, i) => (i === 0 || i === f.points.length - 1 ? magnet(p) : p)) });
              } : undefined}
            >
              {/* Drawing: instruction pill on top (never blocks taps), controls floating at the bottom. */}
              {drawing ? <>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 30, maxWidth: "calc(100% - 24px)",
                  px: 1.5, py: 0.75, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 999, pointerEvents: "none" }}>
                  <AddRoadOutlined fontSize="small" color="primary" />
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {n === 0 ? "แตะจุดเริ่มของช่วงถนน (เช่น ทางแยก)" : n < 2 ? "แตะต่อตามแนวถนน" : "แตะต่อ หรือกด Done เมื่อถึงทางแยกถัดไป"}
                  </Typography>
                </Stack>
                <Paper elevation={6} sx={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", zIndex: 31, p: 0.75, borderRadius: 999, display: "flex", gap: 0.75, alignItems: "center", maxWidth: "calc(100% - 24px)" }}>
                  <Tooltip title="Cancel"><IconButton aria-label="Cancel drawing" onClick={cancel}><CloseOutlined /></IconButton></Tooltip>
                  <Button variant="outlined" color="inherit" startIcon={<UndoOutlined />} disabled={!n} sx={{ borderRadius: 999, borderColor: "divider", whiteSpace: "nowrap" }}
                    onClick={() => setForm((f) => f && { ...f, points: f.points.slice(0, -1) })}>Undo</Button>
                  <Tooltip title="Start over"><span><IconButton aria-label="Start over" disabled={!n} onClick={() => setForm((f) => f && { ...f, points: [] })}><RestartAltOutlined /></IconButton></span></Tooltip>
                  <Button variant="contained" disableElevation startIcon={<CheckOutlined />} disabled={n < 2 || Boolean(pointsError)} onClick={() => setDrawing(false)} sx={{ borderRadius: 999, px: 2.25, whiteSpace: "nowrap" }}>
                    Done{n ? ` · ${n} จุด` : ""}
                  </Button>
                </Paper>
              </> : !form ? (
                <Button variant="contained" size="large" startIcon={<AddRoadOutlined />} onClick={() => startNew()} sx={{ position: "absolute", left: 12, bottom: 12, zIndex: 30, boxShadow: 3 }}>Add road</Button>
              ) : null}
            </RoadMapStage>
          ) : (
            <Skeleton variant="rectangular" height={520} />
          )}
        </Box>
        <Stack sx={{ minWidth: 0, minHeight: 0 }}>
          {form && !drawing ? (
            // One task at a time: naming / editing a piece replaces the list (← goes back to it).
            <Stack sx={{ flex: 1, minHeight: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1, py: 1, borderBottom: 1, borderColor: "divider" }}>
                <Tooltip title="Back to roads"><IconButton aria-label="Back to roads" onClick={cancel}><ArrowBackOutlined /></IconButton></Tooltip>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>{formTitle}</Typography>
                  {formSub ? <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>{formSub}</Typography> : null}
                </Box>
              </Stack>
              <Stack spacing={2.5} sx={{ p: 2, overflowY: "auto", flex: 1, minHeight: 0 }}>
                {roadSection}
                <Box>
                  {sectionLabel("Status")}
                  <ToggleButtonGroup exclusive fullWidth color="primary" value={form.closed ? "closed" : "open"} onChange={(_, v: string | null) => { if (v) setForm({ ...form, closed: v === "closed" }); }} aria-label="Road status">
                    <ToggleButton value="open" sx={{ textTransform: "none" }}>Open</ToggleButton>
                    <ToggleButton value="closed" sx={{ textTransform: "none" }}>Closed</ToggleButton>
                  </ToggleButtonGroup>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                    {form.closed ? "ผู้รับเหมาเลือกช่วงนี้ไม่ได้ (เช่น ถนนปิดซ่อม)" : "ผู้รับเหมาเลือกใช้ช่วงนี้ได้ตอนขอใช้ถนน"}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ color: pointsError ? "warning.dark" : "text.secondary" }}>
                  <InfoOutlined sx={{ fontSize: 18, mt: "1px" }} />
                  <Typography variant="caption">{pointsError ?? "ลากจุดบนผังเพื่อปรับแนวช่วงนี้ — จุดใกล้ถนนอื่นจะต่อกันให้เอง"}</Typography>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1.5, borderTop: 1, borderColor: "divider" }}>
                {!isNew ? <Button variant="text" color="error" startIcon={<DeleteOutlineOutlined />} onClick={() => setConfirmDelete(true)}>Delete</Button> : null}
                <Box sx={{ flex: 1 }} />
                <Button variant="text" color="inherit" onClick={cancel}>Cancel</Button>
                <Button variant="contained" disableElevation disabled={!ready || save.isPending} onClick={() => void submit()}>Save</Button>
              </Stack>
            </Stack>
          ) : <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Roads ({groups.length})</Typography>
              <Button size="small" variant="outlined" startIcon={<AddRoadOutlined />} onClick={() => startNew()} disabled={drawing || !map}>Add road</Button>
            </Stack>
            {drawing ? <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, bgcolor: "action.hover" }}>กำลังวาด — กด Done บนผังเมื่อวาดเสร็จ</Typography> : null}
            <Box sx={{ overflowY: "auto", flex: 1, minHeight: 0, maxHeight: { xs: 460, md: "none" } }}>
              {roads.isPending ? <Skeleton sx={{ mx: 2 }} height={40} /> : groups.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                  ยังไม่มีถนนในทะเบียน — กด «Add road» แล้วแตะตามแนวถนนจากทางแยกหนึ่งถึงอีกทางแยกหนึ่ง
                </Typography>
              ) : groups.map((g) => {
                const open = openRoad === g.road, closed = g.pieces.filter((p) => p.closed).length;
                return <Box key={g.road} sx={{ borderBottom: 1, borderColor: "divider" }}>
                  <ListItemButton selected={open} onClick={() => toggleRoad(g)}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: closed === g.pieces.length ? CLOSED : OPEN, mr: 1.5, flexShrink: 0 }} />
                    <ListItemText primary={<><b>{g.road}</b> · {g.name}</>} secondary={`${g.pieces.length} ช่วง${closed ? ` · ปิด ${closed}` : ""}`} />
                    {open ? <ExpandLessOutlined fontSize="small" color="action" /> : <ExpandMoreOutlined fontSize="small" color="action" />}
                  </ListItemButton>
                  {open && g.pieces.map((s, i) => (
                    <ListItemButton key={s.id} onClick={() => pickPiece(s)} sx={{ pl: 5.5, py: 0.5 }}>
                      <ListItemText primary={`ช่วงที่ ${i + 1}`} slotProps={{ primary: { variant: "body2" } }} />
                      {s.closed ? <Chip size="small" label="Closed" /> : <Typography variant="caption" color="text.secondary">Edit</Typography>}
                    </ListItemButton>
                  ))}
                  {open && <ListItemButton disabled={drawing} onClick={() => startNew(g)} sx={{ pl: 5.5, py: 0.75, color: "primary.main" }}>
                    <AddRoadOutlined fontSize="small" sx={{ mr: 1 }} />
                    <ListItemText primary="Add piece to this road" slotProps={{ primary: { variant: "body2", fontWeight: 600 } }} />
                  </ListItemButton>}
                </Box>;
              })}
            </Box>
          </>}
        </Stack>
      </Card>
      <ConfirmDialog
        open={confirmDelete}
        title="ลบช่วงถนน?"
        description={`ช่วงนี้ของ ${form?.road ?? ""} · ${form?.name ?? ""} จะหายจากทะเบียน คำขอใช้ถนนที่เลือกไว้แล้วยังเก็บเส้นทางที่วาดไว้`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => void destroy()}
        onClose={() => setConfirmDelete(false)}
      />
    </Box>
  );
}
