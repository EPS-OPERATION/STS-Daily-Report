import { coordinationGeometryError, coordinationRouteClashes, coordinationToday, COORDINATION_COLORS, COORDINATION_ICONS, isEpsStaff, type CoordinationIcon, type CoordinationInput, type CoordinationItem } from "@sts/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import FilterAltOffOutlined from "@mui/icons-material/FilterAltOffOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import Popover from "@mui/material/Popover";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import ViewSidebarOutlined from "@mui/icons-material/ViewSidebarOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import PersonOutlined from "@mui/icons-material/PersonOutlined";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import AddRoadOutlined from "@mui/icons-material/AddRoadOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { QueryError } from "@/components/ui/query-error.js";
import { useMe } from "@/features/auth/index.js";
import { ContractorFilterPopover } from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";
import { useCoordination, useCoordinationColor, useDayLock, useDeleteCoordination, useSaveCoordination, useSaveDayNote } from "../hooks/use-coordination.js";
import { DayLockBanner, DayLockStamp } from "./day-lock.js";
import { DayNote } from "./day-note.js";
import { coordinationFormSchema } from "../schemas/coordination.schema.js";
import type { MapTool } from "./coordination-canvas.js";
import { CoordinationJobList } from "./coordination-job-list.js";
import { CoordinationInspector } from "./coordination-inspector.js";
import { TypePicker } from "./type-picker.js";
import { DisplayOptions, TypeFilter, loadMapDisplay, saveMapDisplay, type MapDisplay } from "./map-filters.js";
import { areaLabel, ICON_LABELS } from "../types/icon-labels.js";

const CoordinationCanvas = lazy(() => import("./coordination-canvas.js").then((module) => ({ default: module.CoordinationCanvas })));

const inputOf = (item: CoordinationItem): CoordinationInput => ({
  contractorId: item.contractorId, workDate: item.workDate, title: item.title, icon: item.icon,
  x: item.x, y: item.y, rotation: item.rotation, areaKind: item.areaKind, geometry: structuredClone(item.geometry),
  linkArea: item.linkArea, twoWay: item.twoWay, note: item.note ?? null,
});
// Auto-save editing: `working` is the item currently on the map (selected + editable).
// `base` keeps the last persisted state so an invalid in-progress drawing can be reverted.
interface Working { id: string; revision: number; base: CoordinationInput; input: CoordinationInput }
export function CoordinationWorkspace({ readOnly = false, compact = false }: { readOnly?: boolean; compact?: boolean }) {
  const { projectId, projects } = useCurrentProject();
  const me = useMe();
  const [activeProject, setActiveProject] = useState(projectId);
  const [params, setParams] = useSearchParams();
  const date = params.get("mapDate") ?? coordinationToday();
  // EPS only (the API refuses others too); the report opens in a new tab and prints at once.
  const canExport = !readOnly && !compact && Boolean(projectId) && isEpsStaff(me.data?.data.user.role);
  const reportHref = `/site-coordination/report?${new URLSearchParams({ projectId: projectId ?? "", date, print: "1" })}`;
  // Filters: contractors (null = all), work types, free-text search (title / note / code).
  const [contractorIds, setContractorIds] = useState<Set<string> | null>(null);
  const [types, setTypes] = useState<Set<CoordinationIcon>>(() => new Set(COORDINATION_ICONS));
  const [search, setSearch] = useState("");
  const [display, setDisplayState] = useState<MapDisplay>(loadMapDisplay);
  const setDisplay = (next: MapDisplay) => { setDisplayState(next); saveMapDisplay(next); };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [working, setWorking] = useState<Working | null>(null);
  const [tool, setTool] = useState<MapTool>("move");
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);
  const [textEditId, setTextEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CoordinationItem | null>(null);
  const [colorTarget, setColorTarget] = useState<string | null>(null);
  const [chosenColor, setChosenColor] = useState("");
  const [colorRevision, setColorRevision] = useState(1);
  const workingRef = useRef<Working | null>(null);
  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const draft = working?.input ?? null;
  const query = useCoordination(activeProject, date);
  const save = useSaveCoordination(activeProject);
  const remove = useDeleteCoordination(activeProject);
  const changeColor = useCoordinationColor(activeProject);
  const saveDayNote = useSaveDayNote(activeProject, date);
  const dayLock = useDayLock(activeProject, date);
  const [lockConfirm, setLockConfirm] = useState(false);
  // Lock: finish any pending save, close the editor, then stamp the day.
  const lockDay = async () => {
    await flush(); selectItem(null); setTool("move");
    try { await dayLock.mutateAsync(true); setLockConfirm(false); toast.success("ล็อกแผนวันนี้แล้ว"); } catch { toast.error("ล็อกแผนไม่สำเร็จ"); }
  };
  const unlockDay = async () => {
    try { await dayLock.mutateAsync(false); toast.success("ปลดล็อกแล้ว — แก้ไขได้"); } catch { toast.error("ปลดล็อกไม่สำเร็จ"); }
  };
  const data = query.data?.data;
  const selected = data?.items.find((v) => v.id === selectedId) ?? null;
  const company = data?.contractors.find((c) => c.id === (draft?.contractorId ?? selected?.contractorId));
  const editableCompanies = data?.contractors.filter((c) => data.editableContractorIds.includes(c.id)) ?? [];
  const geometryError = draft ? coordinationGeometryError(draft.geometry) : null;
  const areaDirty = Boolean(working && (working.input.areaKind !== working.base.areaKind || JSON.stringify(working.input.geometry.points) !== JSON.stringify(working.base.geometry.points)));
  const busy = remove.isPending;
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("lg"));
  // Back to a rectangle: the bounding box of the current corners.
  const makeRectangle = () => {
    const w = workingRef.current;
    if (!w) return;
    setTool("move");
    if (w.input.areaKind === "rectangle") return;
    const xs = w.input.geometry.points.map((p) => p.x), ys = w.input.geometry.points.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    patchItem({ areaKind: "rectangle", geometry: { type: "polygon", points: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }] } });
  };
  const codeOf = (id: string) => data?.contractors.find((c) => c.id === id)?.code ?? "";
  // Road routes that cross or run along another contractor's route today (live while drawing).
  const clashes = data
    ? coordinationRouteClashes(data.items.map((i) => (working && i.id === working.id ? { ...i, ...working.input } : i)), data.map.width, data.map.height)
    : new Map<string, string[]>();
  const clashCodes = (id: string) => (clashes.get(id) ?? []).map(codeOf).filter(Boolean);
  // Road requests for this day with the company and time (same filters as jobs).
  const roadLines = display.roads ? (data?.roads ?? [])
    .filter((r) => !contractorIds || contractorIds.has(r.contractorId))
    .map((r) => ({
      id: r.id, points: r.route, alert: r.clash,
      // "<request>:<road>" = a register road picked for the request (no direction); else a drawn route.
      arrows: !r.id.includes(":"),
      color: data?.contractors.find((c) => c.id === r.contractorId)?.color ?? "#0B4D8B",
      label: `${codeOf(r.contractorId)} ${r.startTime}–${r.endTime}${r.clash ? " · ชนกัน" : ""}`,
    })) : [];
  const q = search.trim().toLowerCase();
  const items = data?.items.filter((item) =>
    (!contractorIds || contractorIds.has(item.contractorId))
    && types.has(item.icon)
    // Roads layer off: routes leave the map and the list (the selected one stays while it is open).
    && (display.roads || item.areaKind !== "route" || item.id === selectedId)
    && (!q || `${item.title} ${item.note ?? ""} ${codeOf(item.contractorId)}`.toLowerCase().includes(q))) ?? [];
  const typeFiltered = types.size < COORDINATION_ICONS.length;
  const isFiltered = Boolean(contractorIds) || typeFiltered || Boolean(q);
  const clearFilters = () => { selectItem(null); setContractorIds(null); setTypes(new Set(COORDINATION_ICONS)); setSearch(""); };
  const updateWorking = (next: Working | null) => { workingRef.current = next; setWorking(next); };
  const finish = () => {
    const w = workingRef.current;
    if (w && coordinationGeometryError(w.input.geometry)) patchItem({ areaKind: w.base.areaKind, geometry: w.base.geometry });
    setTool("move");
  };
  const drawPolygon = () => {
    // Keep the existing corners (rectangle corners become polygon points) so the
    // area is refined in place instead of being wiped; "วาดใหม่" clears inside the mode.
    if (workingRef.current?.input.areaKind !== "polygon") patchItem({ areaKind: "polygon" });
    setTool("polygon");
  };
  // Road route: keep the current points (taps extend the line); "วาดใหม่" clears inside the mode.
  const drawRoute = () => setTool("route");
  // Drawing starts from the toolbar; on a phone the map sits below it, so bring the map (and its tap hint) into view.
  useEffect(() => {
    if (tool === "move") return;
    const box = mapBoxRef.current?.getBoundingClientRect();
    if (box && (box.top < 0 || box.top > window.innerHeight * 0.4)) mapBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [tool]);
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
    const only = contractorIds && contractorIds.size === 1 ? [...contractorIds][0] : null;
    const contractorId = only && editableCompanies.some((c) => c.id === only) ? only : editableCompanies[0]?.id;
    if (!contractorId || creating || workingRef.current) return;
    setCreating(true);
    try {
      // Canva-style: the item is persisted immediately with a sensible default area,
      // ready to drag/resize — no placement step and no save button.
      const road = icon === "road";
      const result = await save.mutateAsync({ input: road
        // A road route starts as a short line, then the user taps the real route along the road.
        ? { contractorId, workDate: date, title: "ใช้ถนน", icon, x: 0.5, y: 0.44, rotation: 0, areaKind: "route", linkArea: true,
            geometry: { type: "polyline", points: [{ x: 0.44, y: 0.5 }, { x: 0.56, y: 0.5 }] } }
        : { contractorId, workDate: date, title: icon === "text" ? "ข้อความใหม่" : "งานใหม่", icon, x: 0.5, y: 0.5, rotation: 0, areaKind: "rectangle", linkArea: true,
            geometry: { type: "polygon", points: [{ x: 0.43, y: 0.45 }, { x: 0.57, y: 0.45 }, { x: 0.57, y: 0.55 }, { x: 0.43, y: 0.55 }] } } });
      const fresh = inputOf(result.data);
      updateWorking({ id: result.data.id, revision: result.data.revision, base: fresh, input: road ? { ...fresh, geometry: { type: "polyline", points: [] } } : fresh });
      setSelectedId(result.data.id); setTool(road ? "route" : "move");
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
    updateWorking(null); setSelectedId(null); setContractorIds(null); setActiveProject(projectId);
  }, [projectId, activeProject]);
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);
  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);
  // Filters sit on the toolbar row (full page) or on a slim row (compact dashboard).
  const counter = <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>{pending ? "กำลังบันทึก… · " : ""}{projects.find((p) => p.id === activeProject)?.code} · {items.length} รายการ</Typography>;
  const goToDate = (next: string) => {
    void flush(); updateWorking(null); setSelectedId(null); const p = new URLSearchParams(params); p.set("mapDate", next); setParams(p);
  };
  const today = coordinationToday();
  const quickDays = [
    { key: dayjs(today).subtract(1, "day").format("YYYY-MM-DD"), label: "Yesterday" },
    { key: today, label: "Today" },
    { key: dayjs(today).add(1, "day").format("YYYY-MM-DD"), label: "Tomorrow" },
  ];
  const datePicker = <DatePicker
      label="Work date"
      value={dayjs(date)}
      onChange={(value) => { if (value && value.isValid()) goToDate(value.format("YYYY-MM-DD")); }}
      format="D MMM YYYY"
      disabled={busy}
      slotProps={{ textField: { size: "small", sx: { width: 165 } } }}
    />;
  // Same outlined-button style as the other pages' quick ranges, at the toolbar height (40px).
  const quickDayControl = <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
    {quickDays.map((d) => {
      const selected = d.key === date;
      return <Button key={d.key} size="medium" variant={selected ? "contained" : "outlined"} disableElevation
        onClick={() => { if (!selected) goToDate(d.key); }}
        sx={{ flex: { xs: 1, sm: "none" } }}>
        {d.label}
      </Button>;
    })}
  </Stack>;
  const dateControl = datePicker;
  // Same multi-select popover as Manpower / Daily Request (colour, search, select all, job count).
  const allContractorCodes = data?.contractors.map((c) => c.code) ?? [];
  const contractorControl = data ? <ContractorFilterPopover
      items={data.contractors.map((c) => ({ code: c.code, name: c.name, color: c.color, countLabel: `${data.items.filter((v) => v.contractorId === c.id).length} งาน` }))}
      selectedCodes={new Set(contractorIds ? data.contractors.filter((c) => contractorIds.has(c.id)).map((c) => c.code) : allContractorCodes)}
      onChange={(codes) => {
        void flush(); updateWorking(null); setSelectedId(null);
        setContractorIds(codes.size === 0 || codes.size === allContractorCodes.length ? null : new Set(data.contractors.filter((c) => codes.has(c.code)).map((c) => c.id)));
      }}
    /> : null;
  // Contractor logins can narrow the map to the companies they belong to in the open project (same filter state as the popover).
  const myCompanyIds = (me.data?.data.contractors ?? []).filter((c) => c.projectId === projectId).map((c) => c.id);
  const mineActive = contractorIds !== null && myCompanyIds.length > 0 && contractorIds.size === myCompanyIds.length && myCompanyIds.every((id) => contractorIds.has(id));
  const myCodes = data?.contractors.filter((c) => myCompanyIds.includes(c.id)).map((c) => c.code) ?? [];
  const mineControl = !readOnly && !compact && !isEpsStaff(me.data?.data.user.role) && myCompanyIds.length > 0 && data ? <Button
      variant={mineActive ? "contained" : "outlined"}
      color={mineActive ? "primary" : "inherit"}
      disableElevation
      aria-pressed={mineActive}
      startIcon={<PersonOutlined />}
      onClick={() => { void flush(); updateWorking(null); setSelectedId(null); setContractorIds(mineActive ? null : new Set(myCompanyIds)); }}
      sx={{ whiteSpace: "nowrap", height: 40, bgcolor: mineActive ? undefined : "background.paper" }}>
      เฉพาะงานของฉัน{myCodes.length > 3 ? ` · ${myCodes.length} บริษัท` : myCodes.length ? ` · ${myCodes.join(", ")}` : ""}
    </Button> : null;
  const typeCounts = new Map<CoordinationIcon, number>();
  for (const item of data?.items ?? []) typeCounts.set(item.icon, (typeCounts.get(item.icon) ?? 0) + 1);
  const typeControl = <TypeFilter selected={types} counts={typeCounts} onChange={(next) => { selectItem(null); setTypes(next); }} />;
  const searchControl = <TextField size="small" placeholder="ค้นหางาน / หมายเหตุ" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: { xs: "100%", sm: 220 } }}
    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> } }} />;
  const filterControls = <>{dateControl}{contractorControl}</>;
  const inspector = selected ? <CoordinationInspector
    item={selected}
    draft={draft}
    contractors={data?.contractors ?? []}
    editableContractors={editableCompanies}
    drawing={tool === "polygon" || tool === "route"}
    clashWith={clashCodes(selected.id)}
    onDrawRoute={drawRoute}
    areaDirty={areaDirty}
    geometryError={geometryError}
    saving={pending || save.isPending}
    onPatch={patchItem}
    onDrawFree={drawPolygon}
    onMakeRectangle={makeRectangle}
    onResetArea={() => { const w = workingRef.current; if (w) patchItem({ areaKind: w.base.areaKind, geometry: w.base.geometry }); }}
    onDelete={() => requestDelete(selected)}
    onClose={() => selectItem(null)}
    onEditColor={!readOnly && data?.canManageColors ? (c) => { changeColor.reset(); setColorTarget(c.id); setChosenColor(c.color); setColorRevision(c.revision); } : undefined}
  /> : null;
  return <Box>
    {compact && <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      {filterControls}
      <Typography variant="caption" color="text.secondary" sx={{ ml: { sm: "auto" } }}>{projects.find((p) => p.id === activeProject)?.code} · {items.length} รายการ</Typography>
    </Stack>}
    {query.isError && <QueryError error={query.error} onRetry={() => void query.refetch()} />}
    {!data && !query.isError && <Skeleton variant="rounded" height={480} />}
    {data && <>
      {!readOnly && !data.lock && !editableCompanies.length && <Alert severity="info" sx={{ mb: 2 }}>บัญชีนี้ยังไม่ได้ผูกกับผู้รับเหมาในโครงการ จึงเพิ่มหรือแก้รายการงานไม่ได้</Alert>}
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden", bgcolor: "background.paper", mb: compact ? 0 : 2 }}>
        {!compact && <Stack spacing={1.25} sx={{ px: 1.5, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {datePicker}
            {quickDayControl}
            <Box sx={{ flex: 1 }} />
            {!readOnly && <Button variant="contained" disableElevation startIcon={<AddOutlined />} onClick={(e) => setAddAnchor(e.currentTarget)} disabled={!editableCompanies.length || creating || Boolean(draft)}
              sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Add item</Button>}
            {/* Draw the road this contractor will use today: tap points along it, arrows show the way. */}
            {!readOnly && <Button variant="outlined" startIcon={<RouteOutlined />} onClick={() => void createItem("road")} disabled={!editableCompanies.length || creating || Boolean(draft)}
              sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Draw road</Button>}
            {!readOnly && data.canLock && !data.lock && <Button variant="outlined" startIcon={<LockOutlined />} onClick={() => setLockConfirm(true)}
              sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Lock plan</Button>}
            {canExport && <Button variant="outlined" startIcon={<PrintOutlined />} href={reportHref} target="_blank" rel="noopener"
              sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Export PDF</Button>}
            {/* EPS keeps the site road register that contractors pick road segments from. */}
            {canExport && <Button variant="outlined" startIcon={<AddRoadOutlined />} component={RouterLink} to="/site-coordination/roads"
              sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Road register</Button>}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ "& > .MuiBadge-root, & > .MuiButton-root": { flex: { xs: "1 1 100%", sm: "none" } }, "& > .MuiBadge-root > .MuiButton-root": { width: { xs: "100%", sm: "auto" }, justifyContent: { xs: "space-between", sm: "center" } } }}>
            {mineControl}
            {contractorControl}
            {typeControl}
            {searchControl}
            <Box sx={{ flex: 1, display: { xs: "none", sm: "block" } }} />
            {counter}
            <DisplayOptions value={display} onChange={setDisplay} />
          </Stack>
        </Stack>}
        {data.lock && <DayLockBanner lock={data.lock} canUnlock={!readOnly && data.canLock} busy={dayLock.isPending} onUnlock={() => void unlockDay()} />}
        {!compact && isFiltered && <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 1.5, py: 0.75, borderBottom: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>กำลังกรอง · แสดง {items.length} จาก {data.items.length} งาน</Typography>
          {contractorIds && <Chip size="small" label={`Contractor: ${data.contractors.filter((c) => contractorIds.has(c.id)).map((c) => c.code).join(", ")}`} onDelete={() => { selectItem(null); setContractorIds(null); }} />}
          {typeFiltered && <Chip size="small" label={`Type: ${types.size ? [...types].map((t) => ICON_LABELS[t]).join(", ") : "None"}`} onDelete={() => { selectItem(null); setTypes(new Set(COORDINATION_ICONS)); }} />}
          {q && <Chip size="small" label={`Search: "${search.trim()}"`} onDelete={() => setSearch("")} />}
          <Button startIcon={<FilterAltOffOutlined fontSize="small" />} onClick={clearFilters} sx={{ ml: "auto" }}>Clear filters</Button>
        </Stack>}
        {/* map + detail panel (beside the map on wide screens, below it otherwise) */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: !compact && (display.jobList || selected) ? "minmax(0, 1fr) 360px" : "1fr" } }}>
        <Box ref={mapBoxRef} sx={{ position: "relative", minWidth: 0, scrollMarginTop: 64 }}>
          {data.lock && <DayLockStamp lock={data.lock} date={date} small={compact} />}
          <Suspense fallback={<Skeleton variant="rounded" height={compact ? 390 : 620} />}><CoordinationCanvas map={data.map} contractors={data.contractors} items={items} selectedId={selectedId} draft={draft} draftId={working?.id} tool={tool} compact={compact}
            onSelect={selectItem} onChange={patchItem} onFinish={finish}
            onDeselect={() => selectItem(null)}
            textEditing={textEditId !== null && textEditId === working?.id} onEditText={() => { if (workingRef.current) setTextEditId(workingRef.current.id); }}
            display={display} clashes={clashes} roads={roadLines} /></Suspense>
          {/* Detail card for the clicked job (contractor · title · type · area · full note); on every map. */}
          {(compact || display.detailCard) && selected && !textEditId && tool === "move" && (
            <Box sx={{ position: "absolute", left: 12, top: 44, width: "min(340px, calc(100% - 24px))", px: 1.75, py: 1.5, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 6px 20px rgba(15, 23, 42, 0.12)", zIndex: 2 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                <Box component="span" sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: company?.color ?? "divider", flexShrink: 0 }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>{company?.code}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>{company?.name}</Typography>
                <IconButton size="small" aria-label="Close details" onClick={() => selectItem(null)} sx={{ p: 0.25, mr: -0.75 }}><CloseOutlined sx={{ fontSize: 16 }} /></IconButton>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {ICON_LABELS[(draft ?? selected).icon]} · {areaLabel(draft ?? selected, true)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{draft?.title ?? selected.title}</Typography>
              <Typography variant="body2" color={(draft?.note ?? selected.note) ? "text.primary" : "text.secondary"} sx={{ whiteSpace: "pre-line", mt: 0.25 }}>
                {(draft?.note ?? selected.note) || "ไม่มีหมายเหตุ"}
              </Typography>
            </Box>
          )}
          {!compact && !display.jobList && !selected && (
            <Button variant="contained" disableElevation startIcon={<ViewSidebarOutlined sx={{ transform: "scaleX(-1)" }} />} onClick={() => setDisplay({ ...display, jobList: true })}
              sx={{ position: "absolute", top: 44, right: 0, zIndex: 3, borderTopRightRadius: 0, borderBottomRightRadius: 0, textTransform: "none", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(15, 23, 42, 0.18)" }}>
              รายการงาน · {items.length}
            </Button>
          )}
          {!items.length && !draft && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ position: "absolute", top: 48, right: 8, maxWidth: "calc(100% - 16px)", px: 2, py: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 999, pointerEvents: "none" }}>
              <InfoOutlined sx={{ fontSize: 18, color: "info.main" }} />
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                ไม่มีรายการงาน{isFiltered ? "ที่ตรงกับตัวกรอง" : ""}ในวันที่ {dayjs(date).format("D MMM YYYY")}{!readOnly ? " — กด «เพิ่มรายการงาน» เพื่อเริ่มวางแผน" : ""}
              </Typography>
            </Stack>
          )}
        </Box>
        {!compact && selected && wide ? <Box sx={{ borderLeft: "1px solid", borderColor: "divider", height: 652, minHeight: 0 }}>{inspector}</Box>
          : !compact && display.jobList && <CoordinationJobList embedded items={items} contractors={data.contractors} clashCodes={clashCodes} selectedId={selectedId} onSelect={selectItem} onCollapse={() => setDisplay({ ...display, jobList: false })}
            footer={<DayNote date={date} dayNote={data.dayNote} canEdit={!readOnly && data.canEditDayNote} onSave={(note) => saveDayNote.mutateAsync(note)} />} />}
        </Box>
      </Box>
      {/* Phone: the sheet steps aside while drawing so the whole map is free to tap (the hint bar has เสร็จ). */}
      {!compact && selected && !wide && tool === "move" && <Paper elevation={8} sx={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1200, maxHeight: "48vh", display: "flex", flexDirection: "column", borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden" }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: "divider", mx: "auto", mt: 1 }} />
        {inspector}
      </Paper>}
      {compact && selected && <Typography variant="body2" sx={{ mt: 1 }}>{company?.code} · {selected.title}{selected.note ? ` — ${selected.note}` : ""}</Typography>}
    </>}
    <Popover open={Boolean(addAnchor)} anchorEl={addAnchor} onClose={() => setAddAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }} transformOrigin={{ vertical: "top", horizontal: "left" }} slotProps={{ paper: { sx: { p: 1, mt: 0.5 } } }}>
      <Box sx={{ p: 1 }}>
        <TypePicker onPick={(icon) => { setAddAnchor(null); void createItem(icon); }} />
      </Box>
    </Popover>
    <Dialog open={lockConfirm} onClose={dayLock.isPending ? undefined : () => setLockConfirm(false)} fullWidth maxWidth="xs">
      <DialogTitle>ล็อกแผนวันที่ {dayjs(date).format("D MMM YYYY")}?</DialogTitle>
      <DialogContent>
        <Typography variant="body2">หลังล็อก ทุกคน (รวมผู้รับเหมา) จะเพิ่ม ย้าย แก้ไข หรือลบงาน และแก้หมายเหตุประจำวันของวันนี้ไม่ได้ จนกว่า EPS จะกดปลดล็อก</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{data?.items.length ?? 0} งานบนผังวันนี้</Typography>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" disabled={dayLock.isPending} onClick={() => setLockConfirm(false)}>Cancel</Button>
        <Button variant="contained" disableElevation startIcon={<LockOutlined />} disabled={dayLock.isPending} onClick={() => void lockDay()}>Lock plan</Button>
      </DialogActions>
    </Dialog>
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title="Delete work item?"
      description={deleteTarget ? `"${deleteTarget.title}" จะถูกลบ` : undefined}
      loading={remove.isPending}
      onClose={() => setDeleteTarget(null)}
      onConfirm={async () => {
        if (!deleteTarget) return;
        try { await remove.mutateAsync({ id: deleteTarget.id, revision: deleteTarget.revision }); setDeleteTarget(null); updateWorking(null); setSelectedId(null); toast.success("ลบรายการงานแล้ว"); } catch { /* Keep the dialog and show the server error. */ }
      }}
    >
      {remove.isError ? <Alert severity="error" sx={{ mt: 2 }}>{remove.error.message}</Alert> : null}
    </ConfirmDialog>
    <Dialog open={Boolean(colorTarget)} onClose={changeColor.isPending ? undefined : () => setColorTarget(null)} fullWidth maxWidth="xs">
      <DialogTitle>Contractor color · {data?.contractors.find((c) => c.id === colorTarget)?.code}</DialogTitle><DialogContent>
        {changeColor.isError && <Alert severity="error" sx={{ mb: 2 }}>{changeColor.error.message}</Alert>}
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
          <Box component="label" sx={{ position: "relative", width: 46, height: 46, borderRadius: "50%", bgcolor: chosenColor || COORDINATION_COLORS[0], border: "2px solid", borderColor: "divider", cursor: "pointer", flexShrink: 0, boxShadow: "inset 0 0 0 3px #fff" }}>
            <input type="color" value={chosenColor || COORDINATION_COLORS[0]} onChange={(e) => setChosenColor(e.target.value)} aria-label="Pick custom color"
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
          </Box>
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>{chosenColor || COORDINATION_COLORS[0]}</Typography>
            <Typography variant="caption" color="text.secondary">แตะวงกลมเพื่อเลือกสีเอง หรือเลือกจากชุดด้านล่าง</Typography>
          </Stack>
          <Chip size="small" variant="outlined" label={data?.contractors.find((c) => c.id === colorTarget)?.code}
            icon={<Box component="span" sx={{ width: 9, height: 9, bgcolor: chosenColor || COORDINATION_COLORS[0], borderRadius: "50%" }} />}
            sx={{ ml: "auto", flexShrink: 0, borderColor: chosenColor || COORDINATION_COLORS[0], fontWeight: 700, "& .MuiChip-icon": { ml: 1, mr: -0.5 } }} />
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1.25 }}>
          {COORDINATION_COLORS.map((color) => {
            const active = color.toUpperCase() === (chosenColor || "").toUpperCase();
            return <Box key={color} component="button" type="button" aria-label={`Pick color ${color}`} onClick={() => setChosenColor(color)}
              sx={{ aspectRatio: "1", p: 0, borderRadius: "50%", bgcolor: color, border: "2px solid", borderColor: active ? "text.primary" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 120ms ease", "&:hover": { transform: "scale(1.1)" } }}>
              {active && <CheckOutlined sx={{ fontSize: 15, color: "#fff" }} />}
            </Box>;
          })}
        </Box>
      </DialogContent><DialogActions><Button color="inherit" disabled={changeColor.isPending} onClick={() => setColorTarget(null)}>Cancel</Button><Button disabled={changeColor.isPending} onClick={async () => {
        if (!colorTarget) return;
        try { await changeColor.mutateAsync({ contractorId: colorTarget, color: chosenColor, revision: colorRevision }); setColorTarget(null); toast.success("อัปเดตสีผู้รับเหมาแล้ว"); } catch { /* Preserve the selected colour for retry. */ }
      }}>Save color</Button></DialogActions>
    </Dialog>
  </Box>;
}
