import { coordinationGeometryError, coordinationToday, COORDINATION_COLORS, COORDINATION_ICONS, type CoordinationIcon, type CoordinationInput, type CoordinationItem } from "@sts/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import PaletteOutlined from "@mui/icons-material/PaletteOutlined";
import PentagonOutlined from "@mui/icons-material/PentagonOutlined";
import TextFieldsOutlined from "@mui/icons-material/TextFieldsOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";
import { useCoordination, useCoordinationColor, useDeleteCoordination, useSaveCoordination } from "../hooks/use-coordination.js";
import { coordinationFormSchema } from "../schemas/coordination.schema.js";
import type { MapTool } from "./coordination-canvas.js";
import { MachineGlyph } from "./machine-icon.js";
import { ICON_LABELS } from "../types/icon-labels.js";

const CoordinationCanvas = lazy(() => import("./coordination-canvas.js").then((module) => ({ default: module.CoordinationCanvas })));

const inputOf = (item: CoordinationItem): CoordinationInput => ({
  contractorId: item.contractorId, workDate: item.workDate, title: item.title, icon: item.icon,
  x: item.x, y: item.y, rotation: item.rotation, areaKind: item.areaKind, geometry: structuredClone(item.geometry),
  linkArea: item.linkArea,
});
// Auto-save editing: `working` is the item currently on the map (selected + editable).
// `base` keeps the last persisted state so an invalid in-progress drawing can be reverted.
interface Working { id: string; revision: number; base: CoordinationInput; input: CoordinationInput }
// Shared type picker: icon grid used both by the "เพิ่ม" popover and the
// advanced settings dialog (selected tile = preview of the current type).
function TypePicker({ value, onPick }: { value?: CoordinationIcon; onPick: (icon: CoordinationIcon) => void }) {
  return <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(72px, 1fr))", gap: 0.5 }}>
    {COORDINATION_ICONS.map((icon) => {
      const active = value === icon;
      return <Button key={icon} variant="text" color="inherit" onClick={() => onPick(icon)}
        sx={{ flexDirection: "column", gap: 0.5, py: 1, textTransform: "none", borderRadius: 1, bgcolor: active ? "action.selected" : "transparent" }}>
        {icon === "text" ? <TextFieldsOutlined fontSize="small" /> : <MachineGlyph icon={icon} />}
        <Typography variant="caption" noWrap color={active ? "text.primary" : "text.secondary"} sx={{ fontWeight: active ? 700 : 500 }}>{ICON_LABELS[icon]}</Typography>
      </Button>;
    })}
  </Box>;
}
export function CoordinationWorkspace({ readOnly = false, compact = false }: { readOnly?: boolean; compact?: boolean }) {
  const { projectId, projects } = useCurrentProject();
  const [activeProject, setActiveProject] = useState(projectId);
  const [params, setParams] = useSearchParams();
  const date = params.get("mapDate") ?? coordinationToday();
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [working, setWorking] = useState<Working | null>(null);
  const [tool, setTool] = useState<MapTool>("move");
  const [configOpen, setConfigOpen] = useState(false);
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);
  const [textEditId, setTextEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CoordinationItem | null>(null);
  const [colorTarget, setColorTarget] = useState<string | null>(null);
  const [chosenColor, setChosenColor] = useState("");
  const [colorRevision, setColorRevision] = useState(1);
  const workingRef = useRef<Working | null>(null);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const draft = working?.input ?? null;
  const query = useCoordination(activeProject, date);
  const save = useSaveCoordination(activeProject);
  const remove = useDeleteCoordination(activeProject);
  const changeColor = useCoordinationColor(activeProject);
  const data = query.data?.data;
  const selected = data?.items.find((v) => v.id === selectedId) ?? null;
  const company = data?.contractors.find((c) => c.id === (draft?.contractorId ?? selected?.contractorId));
  const editableCompanies = data?.contractors.filter((c) => data.editableContractorIds.includes(c.id)) ?? [];
  const geometryError = draft ? coordinationGeometryError(draft.geometry) : null;
  const areaDirty = Boolean(working && (working.input.areaKind !== working.base.areaKind || JSON.stringify(working.input.geometry.points) !== JSON.stringify(working.base.geometry.points)));
  const busy = remove.isPending;
  const items = data?.items.filter((item) => filter === "all" || item.contractorId === filter) ?? [];
  const chipCompanies = data?.contractors.filter((c) => data.items.some((item) => item.contractorId === c.id) || filter === c.id || draft?.contractorId === c.id) ?? [];
  const updateWorking = (next: Working | null) => { workingRef.current = next; setWorking(next); };
  const finish = () => {
    const w = workingRef.current;
    if (w && coordinationGeometryError(w.input.geometry)) patchItem({ areaKind: w.base.areaKind, geometry: w.base.geometry });
    setTool("move");
  };
  const drawPolygon = () => {
    setConfigOpen(false);
    // Keep the existing corners (rectangle corners become polygon points) so the
    // area is refined in place instead of being wiped; "วาดใหม่" clears inside the mode.
    if (workingRef.current?.input.areaKind !== "polygon") patchItem({ areaKind: "polygon" });
    setTool("polygon");
  };
  // Auto-save: every edit updates the map instantly and schedules a debounced
  // PATCH; saves are serialized so each one carries the latest revision.
  const flush = async () => {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    const w = workingRef.current;
    if (!w || savingRef.current) { if (w) queuedRef.current = true; return; }
    const parsed = coordinationFormSchema.safeParse(w.input);
    if (!parsed.success) { setPending(false); return; }
    savingRef.current = true;
    try {
      const result = await save.mutateAsync({ input: parsed.data, id: w.id, revision: w.revision });
      if (workingRef.current?.id === w.id) {
        const fresh = inputOf(result.data);
        updateWorking({ id: result.data.id, revision: result.data.revision, base: fresh, input: fresh });
      }
    } catch { /* save.isError carries the message; the next edit retries. */ }
    finally {
      savingRef.current = false;
      if (queuedRef.current) { queuedRef.current = false; void flush(); }
      else setPending(false);
    }
  };
  const patchItem = (patch: Partial<CoordinationInput>) => {
    const w = workingRef.current;
    if (!w) return;
    updateWorking({ ...w, input: { ...w.input, ...patch } });
    setPending(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void flush(), 700);
  };
  const selectItem = (id: string | null) => {
    void flush();
    if (id && id === workingRef.current?.id) return;
    setSelectedId(id);
    setTextEditId(null);
    const item = id ? data?.items.find((v) => v.id === id) : null;
    updateWorking(item && !readOnly && data?.editableContractorIds.includes(item.contractorId)
      ? { id: item.id, revision: item.revision, base: inputOf(item), input: inputOf(item) } : null);
  };
  const createItem = async (icon: CoordinationInput["icon"]) => {
    const contractorId = filter !== "all" && editableCompanies.some((c) => c.id === filter) ? filter : editableCompanies[0]?.id;
    if (!contractorId || creating || workingRef.current) return;
    setCreating(true);
    try {
      // Canva-style: the item is persisted immediately with a sensible default area,
      // ready to drag/resize — no placement step and no save button.
      const result = await save.mutateAsync({ input: {
        contractorId, workDate: date, title: icon === "text" ? "ข้อความใหม่" : "งานใหม่", icon, x: 0.5, y: 0.5, rotation: 0, areaKind: "rectangle", linkArea: true,
        geometry: { type: "polygon", points: [{ x: 0.43, y: 0.45 }, { x: 0.57, y: 0.45 }, { x: 0.57, y: 0.55 }, { x: 0.43, y: 0.55 }] },
      } });
      const fresh = inputOf(result.data);
      updateWorking({ id: result.data.id, revision: result.data.revision, base: fresh, input: fresh });
      setSelectedId(result.data.id); setTool("move");
      setTextEditId(icon === "text" ? result.data.id : null);
    } catch { /* save.isError shows the message; nothing was created. */ }
    finally { setCreating(false); }
  };
  const reload = () => { updateWorking(null); setSelectedId(null); save.reset(); void query.refetch(); };
  // Auto-save failures surface as a bottom-right toast with a recovery action
  // (same id, so repeated failures replace instead of stacking).
  useEffect(() => {
    if (!save.isError || !save.error) return;
    const conflict = save.error instanceof HttpError && save.error.status === 409;
    toast.error(save.error.message, { id: "coordination-save", action: conflict ? { label: "โหลดล่าสุด", onClick: reload } : { label: "ลองอีกครั้ง", onClick: () => void flush() } });
  }, [save.isError, save.error]);
  // Quick delete from the floating pill: drop the pending debounce (the item is going
  // away anyway) and use the freshest revision so the DELETE does not hit a 409.
  const requestDelete = (item: CoordinationItem) => {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    setPending(false); remove.reset();
    setDeleteTarget(workingRef.current?.id === item.id ? { ...item, revision: workingRef.current.revision } : item);
  };
  useEffect(() => {
    if (projectId === activeProject) return;
    updateWorking(null); setSelectedId(null); setFilter("all"); setActiveProject(projectId);
  }, [projectId, activeProject]);
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);
  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);
  // Filters live in the PageHeader actions on full pages (same pattern as Manpower/Safety);
  // the compact dashboard keeps them on a slim row.
  const counter = <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>{pending ? "กำลังบันทึก… · " : ""}{projects.find((p) => p.id === activeProject)?.code} · {items.length} รายการ</Typography>;
  const dateControl = <DatePicker
      label="วันที่ทำงาน"
      value={dayjs(date)}
      onChange={(value) => {
        if (!value || !value.isValid()) return;
        const next = value.format("YYYY-MM-DD");
        void flush(); updateWorking(null); setSelectedId(null); const p = new URLSearchParams(params); p.set("mapDate", next); setParams(p);
      }}
      format="D MMM YYYY"
      disabled={busy}
      slotProps={{ textField: { size: "small", sx: { width: 170 } } }}
    />;
  const contractorControl = <TextField select label="ผู้รับเหมา" size="small" value={filter} sx={{ width: 240 }} onChange={(e) => { void flush(); updateWorking(null); setSelectedId(null); setFilter(e.target.value); }}>
      <MenuItem value="all">ทุกบริษัท</MenuItem>{data?.contractors.map((c) => <MenuItem key={c.id} value={c.id}>{c.code} · {c.name}</MenuItem>)}
    </TextField>;
  const filterControls = <>{dateControl}{contractorControl}</>;
  return <Box>
    {!compact && <PageHeader title="Map · ผังประสานงาน" subtitle="แผนรายวัน · สีบอกผู้รับเหมา · ไอคอน/ข้อความบอกประเภทงาน · พื้นที่แสดงขอบเขตใช้งาน" />}
    {compact && <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      {filterControls}
      <Typography variant="caption" color="text.secondary" sx={{ ml: { sm: "auto" } }}>{projects.find((p) => p.id === activeProject)?.code} · {items.length} รายการ</Typography>
    </Stack>}
    {query.isError && <Alert severity="error" action={<Button color="inherit" onClick={() => void query.refetch()}>ลองใหม่</Button>} sx={{ mb: 2 }}>{query.error.message}</Alert>}
    {!data && !query.isError && <Skeleton variant="rounded" height={480} />}
    {data && <>
      {chipCompanies.length > 0 && <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {chipCompanies.map((c) => {
          const active = filter === c.id;
          return <Chip key={c.id} size="small" variant="outlined"
            label={`${c.code} · ${data.items.filter((v) => v.contractorId === c.id).length}`}
            icon={<Box component="span" sx={{ width: 9, height: 9, bgcolor: c.color, borderRadius: "50%" }} />}
            onClick={() => { selectItem(null); setFilter(active ? "all" : c.id); }}
            onDelete={!readOnly && data.canManageColors ? () => { changeColor.reset(); setColorTarget(c.id); setChosenColor(c.color); setColorRevision(c.revision); } : undefined}
            deleteIcon={<PaletteOutlined aria-label={`ตั้งสี ${c.code}`} sx={{ fontSize: 15 }} />}
            sx={{ borderColor: active ? c.color : "divider", bgcolor: active ? `${c.color}1F` : "transparent", fontWeight: active ? 700 : 500, "& .MuiChip-icon": { ml: 1, mr: -0.5 }, "& .MuiChip-deleteIcon": { ml: 0.25, mr: 0.75 } }} />;
        })}
      </Stack>}
      {!readOnly && !editableCompanies.length && <Alert severity="info" sx={{ mb: 2 }}>บัญชีนี้ยังไม่ได้ผูกกับผู้รับเหมาในโครงการ จึงเพิ่มหรือแก้รายการงานไม่ได้</Alert>}
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden", bgcolor: "background.paper", mb: compact ? 0 : 2 }}>
        {!compact && <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center" sx={{ px: 1.5, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
          {dateControl}
          <Box sx={{ ml: "auto", display: { xs: "block", md: "none" } }}>{counter}</Box>
          {contractorControl}
          {!readOnly && <Button startIcon={<AddOutlined />} onClick={(e) => setAddAnchor(e.currentTarget)} disabled={!editableCompanies.length || creating || Boolean(draft)} sx={{ whiteSpace: "nowrap" }}>เพิ่ม</Button>}
          <Box sx={{ ml: "auto", display: { xs: "none", md: "block" } }}>{counter}</Box>
        </Stack>}
        <Box sx={{ position: "relative" }}>
          <Suspense fallback={<Skeleton variant="rounded" height={compact ? 390 : 620} />}><CoordinationCanvas map={data.map} contractors={data.contractors} items={items} selectedId={selectedId} draft={draft} draftId={working?.id} tool={tool} compact={compact}
            onSelect={selectItem} onChange={patchItem} onFinish={finish} onOpenSettings={() => { if (workingRef.current) setConfigOpen(true); }}
            onDeselect={() => selectItem(null)} onDelete={() => { if (selected) requestDelete(selected); }} onEditArea={drawPolygon}
            areaDirty={areaDirty} onResetArea={() => { const w = workingRef.current; if (w) patchItem({ areaKind: w.base.areaKind, geometry: w.base.geometry }); }}
            textEditing={textEditId !== null && textEditId === working?.id} onEditText={() => { if (workingRef.current) setTextEditId(workingRef.current.id); }} /></Suspense>
          {!items.length && !draft && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ position: "absolute", top: 48, right: 8, maxWidth: "calc(100% - 16px)", px: 2, py: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 999, pointerEvents: "none" }}>
              <InfoOutlined sx={{ fontSize: 18, color: "info.main" }} />
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                ไม่มีรายการงาน{filter === "all" ? "" : "ของบริษัทที่เลือก"}ในวันที่ {dayjs(date).format("D MMM YYYY")}{!readOnly ? " — กด «เพิ่มรายการงาน» เพื่อเริ่มวางแผน" : ""}
              </Typography>
            </Stack>
          )}
        </Box>
      </Box>
      {compact && selected && <Typography variant="body2" sx={{ mt: 1 }}>{company?.code} · {selected.title}</Typography>}
    </>}
    <Popover open={Boolean(addAnchor)} anchorEl={addAnchor} onClose={() => setAddAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }} transformOrigin={{ vertical: "top", horizontal: "left" }} slotProps={{ paper: { sx: { p: 1, mt: 0.5 } } }}>
      <Box sx={{ p: 1 }}>
        <TypePicker onPick={(icon) => { setAddAnchor(null); void createItem(icon); }} />
      </Box>
    </Popover>
    <Dialog open={configOpen && Boolean(draft)} onClose={() => setConfigOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>ตั้งค่ารายการงาน</DialogTitle>
      <DialogContent>
        {draft && <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField autoFocus label="ชื่องาน" multiline maxRows={4} value={draft.title} onChange={(e) => patchItem({ title: e.target.value })}
            error={!draft.title.trim()} helperText={!draft.title.trim() ? "ระบุชื่องาน" : undefined} />
          <TextField select label="ผู้รับเหมา" value={draft.contractorId} onChange={(e) => patchItem({ contractorId: e.target.value })}>
            {editableCompanies.map((c) => <MenuItem key={c.id} value={c.id}>{c.code} · {c.name}</MenuItem>)}
          </TextField>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">ประเภท</Typography>
            <TypePicker value={draft.icon} onPick={(icon) => patchItem({ icon })} />
          </Stack>
          <FormControlLabel control={<Switch checked={draft.linkArea !== false} onChange={(e) => patchItem({ linkArea: e.target.checked })} />} label="เชื่อมเส้นกลับกับพื้นที่" />
          <Typography variant="body2" color={geometryError ? "warning.dark" : "text.secondary"}>{geometryError ?? `พื้นที่ ${draft.geometry.points.length} จุดมุม · ${company?.code ?? ""}`}</Typography>
          {draft.areaKind === "polygon" && <Button variant="outlined" startIcon={<PentagonOutlined />} onClick={drawPolygon}>แก้ไขพื้นที่ (Polygon)</Button>}
          <Typography variant="caption" color="text.secondary">แก้บนผังได้ทันที (ลาก / หมุน / วาดพื้นที่) — ทุกอย่างบันทึกอัตโนมัติ</Typography>
        </Stack>}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between" }}>
        {selected && !readOnly && data?.editableContractorIds.includes(selected.contractorId)
          ? <Button color="error" startIcon={<DeleteOutlined />} onClick={() => { setConfigOpen(false); requestDelete(selected); }}>ลบรายการ</Button>
          : <Box />}
        <Button onClick={() => setConfigOpen(false)}>ปิด</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={Boolean(deleteTarget)} onClose={remove.isPending ? undefined : () => setDeleteTarget(null)} fullWidth maxWidth="xs">
      <DialogTitle>ลบรายการงาน?</DialogTitle><DialogContent><Typography>{deleteTarget?.title}</Typography>{remove.isError && <Alert severity="error" sx={{ mt: 2 }}>{remove.error.message}</Alert>}</DialogContent>
      <DialogActions><Button disabled={remove.isPending} onClick={() => setDeleteTarget(null)}>ยกเลิก</Button><Button color="error" disabled={remove.isPending} onClick={async () => {
        if (!deleteTarget) return;
        try { await remove.mutateAsync({ id: deleteTarget.id, revision: deleteTarget.revision }); setDeleteTarget(null); updateWorking(null); setSelectedId(null); toast.success("ลบรายการงานแล้ว"); } catch { /* Keep the dialog and show the server error. */ }
      }}>ลบรายการ</Button></DialogActions>
    </Dialog>
    <Dialog open={Boolean(colorTarget)} onClose={changeColor.isPending ? undefined : () => setColorTarget(null)} fullWidth maxWidth="xs">
      <DialogTitle>สีผู้รับเหมา · {data?.contractors.find((c) => c.id === colorTarget)?.code}</DialogTitle><DialogContent>
        {changeColor.isError && <Alert severity="error" sx={{ mb: 2 }}>{changeColor.error.message}</Alert>}
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
          <Box component="label" sx={{ position: "relative", width: 46, height: 46, borderRadius: "50%", bgcolor: chosenColor || "#2563EB", border: "2px solid", borderColor: "divider", cursor: "pointer", flexShrink: 0, boxShadow: "inset 0 0 0 3px #fff" }}>
            <input type="color" value={chosenColor || "#2563EB"} onChange={(e) => setChosenColor(e.target.value)} aria-label="เลือกสีเอง"
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
          </Box>
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>{chosenColor || "#2563EB"}</Typography>
            <Typography variant="caption" color="text.secondary">แตะวงกลมเพื่อเลือกสีเอง หรือเลือกจากชุดด้านล่าง</Typography>
          </Stack>
          <Chip size="small" variant="outlined" label={data?.contractors.find((c) => c.id === colorTarget)?.code}
            icon={<Box component="span" sx={{ width: 9, height: 9, bgcolor: chosenColor || "#2563EB", borderRadius: "50%" }} />}
            sx={{ ml: "auto", flexShrink: 0, borderColor: chosenColor || "#2563EB", fontWeight: 700, "& .MuiChip-icon": { ml: 1, mr: -0.5 } }} />
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1.25 }}>
          {COORDINATION_COLORS.map((color) => {
            const active = color.toUpperCase() === (chosenColor || "").toUpperCase();
            return <Box key={color} component="button" type="button" aria-label={`เลือกสี ${color}`} onClick={() => setChosenColor(color)}
              sx={{ aspectRatio: "1", p: 0, borderRadius: "50%", bgcolor: color, border: "2px solid", borderColor: active ? "text.primary" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 120ms ease", "&:hover": { transform: "scale(1.1)" } }}>
              {active && <CheckOutlined sx={{ fontSize: 15, color: "#fff" }} />}
            </Box>;
          })}
        </Box>
      </DialogContent><DialogActions><Button color="inherit" disabled={changeColor.isPending} onClick={() => setColorTarget(null)}>ยกเลิก</Button><Button disabled={changeColor.isPending} onClick={async () => {
        if (!colorTarget) return;
        try { await changeColor.mutateAsync({ contractorId: colorTarget, color: chosenColor, revision: colorRevision }); setColorTarget(null); toast.success("อัปเดตสีผู้รับเหมาแล้ว"); } catch { /* Preserve the selected colour for retry. */ }
      }}>บันทึกสี</Button></DialogActions>
    </Dialog>
  </Box>;
}
