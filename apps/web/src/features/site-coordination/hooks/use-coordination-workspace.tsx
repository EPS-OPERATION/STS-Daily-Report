import { coordinationGeometryError, coordinationRouteClashes, coordinationToday, COORDINATION_MAX, COORDINATION_MIN, isEpsStaff, type CoordinationInput, type CoordinationItem, type CoordinationPoint } from "@sts/shared";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import PersonOutlined from "@mui/icons-material/PersonOutlined";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useMe } from "@/features/auth/index.js";
import { ContractorFilterPopover } from "@/features/contractors/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";
import { useCoordination, useCoordinationColor, useDayLock, useDeleteCoordination, useRoadSegments, useSaveCoordination, useSaveDayNote } from "./use-coordination.js";
import { coordinationFormSchema } from "../schemas/coordination.schema.js";
import type { MapTool } from "../components/coordination-canvas.js";
import { CoordinationInspector } from "../components/coordination-inspector.js";
import { TypeFilter, loadMapDisplay, saveMapDisplay, type MapDisplay } from "../components/map-filters.js";


export const inputOf = (item: CoordinationItem): CoordinationInput => ({
  contractorId: item.contractorId, workDate: item.workDate, title: item.title, icon: item.icon,
  x: item.x, y: item.y, rotation: item.rotation, areaKind: item.areaKind, geometry: structuredClone(item.geometry),
  linkArea: item.linkArea, twoWay: item.twoWay, iconScale: item.iconScale ?? 1, note: item.note ?? null,
});
// Auto-save editing: `working` is the item currently on the map (selected + editable).
// `base` keeps the last persisted state so an invalid in-progress drawing can be reverted.
export interface Working { id: string; revision: number; base: CoordinationInput; input: CoordinationInput }

export function useCoordinationWorkspace({ readOnly = false, compact = false, roadNames = false }: { readOnly?: boolean; compact?: boolean; roadNames?: boolean }) {
  const { projectId, projects } = useCurrentProject();
  const me = useMe();
  const [activeProject, setActiveProject] = useState(projectId);
  const [params, setParams] = useSearchParams();
  // The meeting plans the next day: the Map pages open on tomorrow (the dashboard card stays on today).
  const date = params.get("mapDate") ?? (compact ? coordinationToday() : dayjs(coordinationToday()).add(1, "day").format("YYYY-MM-DD"));
  // EPS only (the API refuses others too); the report opens in a new tab and prints at once.
  const canExport = !readOnly && !compact && Boolean(projectId) && isEpsStaff(me.data?.data.user.role);
  const reportHref = `/site-coordination/report?${new URLSearchParams({ projectId: projectId ?? "", date, print: "1" })}`;
  // Filters: contractors (null = all), work types, free-text search (title / note / code).
  const [contractorIds, setContractorIds] = useState<Set<string> | null>(null);
  const [types, setTypes] = useState<Set<string>>(() => new Set());
  const knownTypeCodes = useRef<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const userId = me.data?.data.user.id;
  const [display, setDisplayState] = useState<MapDisplay>(() => loadMapDisplay(userId));
  // Display choices are per user: reload them when the signed-in user is known or changes.
  useEffect(() => { setDisplayState(loadMapDisplay(userId)); }, [userId]);
  const setDisplay = (next: MapDisplay) => { setDisplayState(next); saveMapDisplay(next, userId); };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [working, setWorking] = useState<Working | null>(null);
  const [tool, setTool] = useState<MapTool>("move");
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);
  const [textEditId, setTextEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Manual save: a leave action (select another job, change day/filter…) waits here while edits are unsaved.
  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoordinationItem | null>(null);
  const [colorTarget, setColorTarget] = useState<string | null>(null);
  const [chosenColor, setChosenColor] = useState("");
  const [colorRevision, setColorRevision] = useState(1);
  const workingRef = useRef<Working | null>(null);
  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  const draft = working?.input ?? null;
  const query = useCoordination(activeProject, date);
  // Register road names under everything (Map page only): one label per name, pieces of a cut road share it.
  const register = useRoadSegments(roadNames ? activeProject : null);
  const save = useSaveCoordination(activeProject);
  const remove = useDeleteCoordination(activeProject);
  const changeColor = useCoordinationColor(activeProject);
  const saveDayNote = useSaveDayNote(activeProject, date);
  const dayLock = useDayLock(activeProject, date);
  const [lockConfirm, setLockConfirm] = useState(false);
  // Lock: save the open job's edits first, close the editor, then stamp the day.
  const lockDay = async () => {
    if (!(await saveEdits())) return;
    openItem(null); setTool("move");
    try { await dayLock.mutateAsync(true); setLockConfirm(false); toast.success("ล็อกแผนวันนี้แล้ว"); } catch { toast.error("ล็อกแผนไม่สำเร็จ"); }
  };
  const unlockDay = async () => {
    try { await dayLock.mutateAsync(false); toast.success("ปลดล็อกแล้ว — แก้ไขได้"); } catch { toast.error("ปลดล็อกไม่สำเร็จ"); }
  };
  const isEps = isEpsStaff(me.data?.data.user.role);
  const data = query.data?.data;
  const itemTypes = data?.itemTypes ?? [];
  // First load selects every type. Later refetches keep the user's choices and add types an admin just created.
  useEffect(() => {
    const list = data?.itemTypes;
    if (!list) return;
    const codes = list.map((t) => t.code);
    // Read the previous codes before replacing them: the updater may run later (render time, or twice in
    // StrictMode), when the ref already holds the new codes and the first load would select nothing.
    const known = knownTypeCodes.current;
    knownTypeCodes.current = new Set(codes);
    setTypes((prev) => {
      if (known.size === 0) return new Set(codes);
      const next = new Set([...prev].filter((code) => codes.includes(code)));
      for (const code of codes) if (!known.has(code)) next.add(code);
      return next;
    });
  }, [data?.itemTypes]);
  const selected = data?.items.find((v) => v.id === selectedId) ?? null;
  const company = data?.contractors.find((c) => c.id === (draft?.contractorId ?? selected?.contractorId));
  const editableCompanies = isEps
    ? (data?.contractors ?? [])
    : (data?.contractors.filter((c) => data.editableContractorIds.includes(c.id)) ?? []);
  const geometryError = draft ? coordinationGeometryError(draft.geometry) : null;
  const areaDirty = Boolean(working && (working.input.areaKind !== working.base.areaKind || JSON.stringify(working.input.geometry.points) !== JSON.stringify(working.base.geometry.points)));
  const busy = remove.isPending;
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("lg"));
  // Phones/small tablets (full page only): the map fills the screen under one slim bar; filters live in a drawer.
  const phone = useMediaQuery(theme.breakpoints.down("md")) && !compact;
  // The map takes the rest of the window (phones and lg+); md–lg tablets keep the fixed height + list below.
  const fill = phone || (wide && !compact);
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
  // Memoised: the pairwise route check is O(routes²) and used to rerun on every drag frame of any job.
  // Only road routes take part, so moving an icon or an area keeps the previous result.
  const workingRoute = working && (working.input.areaKind === "route" || working.base.areaKind === "route") ? working : null;
  const clashes = useMemo(() => data
    ? coordinationRouteClashes(data.items.map((i) => (workingRoute && i.id === workingRoute.id ? { ...i, ...workingRoute.input } : i)), data.map.width, data.map.height)
    : new Map<string, string[]>(),
  [data, workingRoute?.id, workingRoute?.input.areaKind, workingRoute?.input.geometry, workingRoute?.input.contractorId]);
  const clashCodes = (id: string) => (clashes.get(id) ?? []).map(codeOf).filter(Boolean);
  // Stable arrays (memoised) so the canvas can skip redrawing layers whose data did not change.
  const registerSegments = register.data?.data;
  const roadNameGroups = useMemo(() => roadNames && display.roadNames
    ? [...(registerSegments ?? []).reduce((m, s) => {
        const key = s.name.trim().toLowerCase();
        const g = m.get(key) ?? { name: s.name, pieces: [] as CoordinationPoint[][] };
        g.pieces.push(s.points);
        return m.set(key, g);
      }, new Map<string, { name: string; pieces: CoordinationPoint[][] }>()).values()]
    : [], [roadNames, display.roadNames, registerSegments]);
  const q = search.trim().toLowerCase();
  const items = useMemo(() => data?.items.filter((item) =>
    (!contractorIds || contractorIds.has(item.contractorId))
    && types.has(item.icon)
    // Roads layer off: routes leave the map and the list (the selected one stays while it is open).
    && (display.roads || item.areaKind !== "route" || item.id === selectedId)
    && (!q || `${item.title} ${item.note ?? ""} ${data.contractors.find((c) => c.id === item.contractorId)?.code ?? ""}`.toLowerCase().includes(q))) ?? [],
  [data, contractorIds, types, display.roads, selectedId, q]);
  const typeFiltered = types.size < itemTypes.length;
  const isFiltered = Boolean(contractorIds) || typeFiltered || Boolean(q);
  const clearFilters = () => guard(() => { openItem(null); setContractorIds(null); setTypes(new Set(itemTypes.map((t) => t.code))); setSearch(""); });
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
  // Manual save (per job): edits change the map at once but reach the server only on Save; Cancel puts the job
  // back. Leaving a job with unsaved edits asks first (guard), so nothing is saved or lost by accident.
  const dirty = Boolean(working && JSON.stringify(working.input) !== JSON.stringify(working.base));
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const saveEdits = async (): Promise<boolean> => {
    const w = workingRef.current;
    if (!w || !dirtyRef.current) return true;
    const parsed = coordinationFormSchema.safeParse(w.input);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ครบ", { id: "coordination-save" }); return false; }
    try {
      const result = await save.mutateAsync({ input: parsed.data, id: w.id, revision: w.revision });
      const fresh = inputOf(result.data);
      dirtyRef.current = false;
      if (workingRef.current?.id === w.id) updateWorking({ id: result.data.id, revision: result.data.revision, base: fresh, input: fresh });
      toast.success("บันทึกแล้ว", { id: "coordination-save" });
      return true;
    } catch { return false; /* save.isError shows the message with a recovery action */ }
  };
  const cancelEdits = () => {
    const w = workingRef.current;
    if (w) updateWorking({ ...w, input: w.base });
    setTool("move"); setTextEditId(null); save.reset();
  };
  /** Runs `action` now, or after the user saves / discards the open job's unsaved edits. */
  const guard = (action: () => void) => {
    if (dirtyRef.current) setLeaveAction(() => action); else action();
  };
  const patchItem = (patch: Partial<CoordinationInput>) => {
    const w = workingRef.current;
    if (!w) return;
    updateWorking({ ...w, input: { ...w.input, ...patch } });
  };
  const openItem = (id: string | null) => {
    setSelectedId(id);
    setTextEditId(null);
    setTool("move");
    const item = id ? data?.items.find((v) => v.id === id) : null;
    const canEdit = Boolean(
      item && !readOnly && !data?.lock && (isEps || data?.editableContractorIds.includes(item.contractorId))
    );
    updateWorking(canEdit && item
      ? { id: item.id, revision: item.revision, base: inputOf(item), input: inputOf(item) } : null);
  };
  const selectItem = (id: string | null) => {
    if (id && id === workingRef.current?.id) return;
    guard(() => openItem(id));
  };
  // The company filtered alone, if the user may edit it — the suggested choice for a new item.
  const filteredCompanyId = (() => {
    const only = contractorIds && contractorIds.size === 1 ? [...contractorIds][0] : null;
    return only && editableCompanies.some((c) => c.id === only) ? only : null;
  })();
  // EPS (several companies) is asked which contractor first; a contractor's own company is used directly.
  const [pendingIcon, setPendingIcon] = useState<CoordinationInput["icon"] | null>(null);
  const startCreate = (icon: CoordinationInput["icon"]) => {
    if (editableCompanies.length > 1) setPendingIcon(icon);
    else void createItem(icon);
  };
  // Placing a new icon/text job: the next tap on the map creates it there (placeItem).
  const [placing, setPlacing] = useState<{ icon: CoordinationInput["icon"]; contractorId: string } | null>(null);
  const createItem = async (icon: CoordinationInput["icon"], pickedId?: string) => {
    const contractorId = pickedId ?? filteredCompanyId ?? editableCompanies[0]?.id;
    if (!contractorId || creating || workingRef.current) return;
    // A road goes straight to tapping its route; other jobs wait for a tap on the spot where the work is.
    if (icon !== "road") { setPlacing({ icon, contractorId }); return; }
    await saveNew(icon, contractorId);
  };
  const placeItem = (at: CoordinationPoint) => {
    const p = placing;
    if (!p) return;
    setPlacing(null);
    void saveNew(p.icon, p.contractorId, at);
  };
  const saveNew = async (icon: CoordinationInput["icon"], contractorId: string, at: CoordinationPoint = { x: 0.5, y: 0.5 }) => {
    if (creating || workingRef.current) return;
    setCreating(true);
    // Default work area: a rectangle centred on the tapped spot (kept inside the map's margin).
    const lim = (v: number) => Math.min(COORDINATION_MAX, Math.max(COORDINATION_MIN, v));
    const [x0, x1, y0, y1] = [lim(at.x - 0.07), lim(at.x + 0.07), lim(at.y - 0.05), lim(at.y + 0.05)];
    try {
      // Canva-style: the item is persisted immediately with a sensible default area,
      // ready to drag/resize — no save button.
      const road = icon === "road";
      const result = await save.mutateAsync({ input: road
        // A road route starts as a short line, then the user taps the real route along the road.
        ? { contractorId, workDate: date, title: "ใช้ถนน", icon, x: 0.5, y: 0.44, rotation: 0, areaKind: "route", linkArea: true,
            geometry: { type: "polyline", points: [{ x: 0.44, y: 0.5 }, { x: 0.56, y: 0.5 }] } }
        // The icon sits just above its area (joined by the link line) so it never hides the company tag.
        : { contractorId, workDate: date, title: icon === "text" ? "ข้อความใหม่" : "งานใหม่", icon, x: at.x, y: icon === "text" ? at.y : lim(y0 - 0.05), rotation: 0, areaKind: "rectangle", linkArea: true,
            geometry: { type: "polygon", points: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }] } } });
      const fresh = inputOf(result.data);
      updateWorking({ id: result.data.id, revision: result.data.revision, base: fresh, input: road ? { ...fresh, geometry: { type: "polyline", points: [] } } : fresh });
      setSelectedId(result.data.id); setTool(road ? "route" : "move");
      setTextEditId(icon === "text" ? result.data.id : null);
    } catch { /* save.isError shows the message; nothing was created. */ }
    finally { setCreating(false); }
  };
  const reload = () => { updateWorking(null); setSelectedId(null); save.reset(); void query.refetch(); };
  // Save failures surface as a top-right toast with a recovery action
  // (same id, so repeated failures replace instead of stacking).
  useEffect(() => {
    if (!save.isError || !save.error) return;
    const conflict = save.error instanceof HttpError && save.error.status === 409;
    toast.error(save.error.message, { id: "coordination-save", action: conflict ? { label: "โหลดล่าสุด", onClick: reload } : { label: "ลองอีกครั้ง", onClick: () => void saveEdits() } });
  }, [save.isError, save.error]);
  // Delete drops any unsaved edits (the job is going away) and uses the freshest revision so the DELETE does not hit a 409.
  const requestDelete = (item: CoordinationItem) => {
    remove.reset();
    setDeleteTarget(workingRef.current?.id === item.id ? { ...item, revision: workingRef.current.revision } : item);
  };
  useEffect(() => {
    if (projectId === activeProject) return;
    updateWorking(null); setSelectedId(null); setContractorIds(null); setActiveProject(projectId);
  }, [projectId, activeProject]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  // Filters sit on the toolbar row (full page) or on a slim row (compact dashboard).
  const counter = <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>{dirty ? "ยังไม่บันทึก · " : ""}{projects.find((p) => p.id === activeProject)?.code} · {items.length} รายการ</Typography>;
  const goToDate = (next: string) => {
    guard(() => { updateWorking(null); setSelectedId(null); setPlacing(null); const p = new URLSearchParams(params); p.set("mapDate", next); setParams(p); });
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
      slotProps={{ textField: { size: "small", sx: { width: { xs: "100%", md: 165 } } } }}
    />;
  // One segmented control (reads as a single choice of day), at the toolbar height (40px from the theme).
  const quickDayControl = <ToggleButtonGroup exclusive color="primary" value={quickDays.some((d) => d.key === date) ? date : null}
      onChange={(_, next: string | null) => { if (next) goToDate(next); }} aria-label="Quick day" sx={{ width: { xs: "100%", sm: "auto" } }}>
    {quickDays.map((d) => <ToggleButton key={d.key} value={d.key} sx={{ flex: { xs: 1, sm: "none" }, px: 1.75, textTransform: "none" }}>{d.label}</ToggleButton>)}
  </ToggleButtonGroup>;
  const dateControl = datePicker;
  // Same multi-select popover as Manpower / Daily Request (colour, search, select all, job count).
  // Only companies with a job on this day are listed (an empty row is just noise in a meeting).
  const filterCompanies = data?.contractors.filter((c) => c.isContractor && data.items.some((v) => v.contractorId === c.id)) ?? [];
  const allContractorCodes = filterCompanies.map((c) => c.code);
  const contractorControl = data ? <ContractorFilterPopover
      items={filterCompanies.map((c) => ({ code: c.code, name: c.name, color: c.color, countLabel: `${data.items.filter((v) => v.contractorId === c.id).length} งาน` }))}
      selectedCodes={new Set(contractorIds ? filterCompanies.filter((c) => contractorIds.has(c.id)).map((c) => c.code) : allContractorCodes)}
      onChange={(codes) => guard(() => {
        updateWorking(null); setSelectedId(null);
        // Clear = nothing ticked (an empty set shows no jobs) so one company can be ticked next; all ticked = no filter.
        setContractorIds(codes.size === allContractorCodes.length ? null : new Set(filterCompanies.filter((c) => codes.has(c.code)).map((c) => c.id)));
      })}
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
      onClick={() => guard(() => { updateWorking(null); setSelectedId(null); setContractorIds(mineActive ? null : new Set(myCompanyIds)); })}
      sx={{ whiteSpace: "nowrap", height: 40, bgcolor: mineActive ? undefined : "background.paper" }}>
      เฉพาะงานของฉัน{myCodes.length > 3 ? ` · ${myCodes.length} บริษัท` : myCodes.length ? ` · ${myCodes.join(", ")}` : ""}
    </Button> : null;
  const typeCounts = new Map<string, number>();
  for (const item of data?.items ?? []) typeCounts.set(item.icon, (typeCounts.get(item.icon) ?? 0) + 1);
  const typeControl = <TypeFilter types={itemTypes} selected={types} counts={typeCounts} onChange={(next) => guard(() => { openItem(null); setTypes(next); })} />;
  const searchControl = <TextField size="small" placeholder="ค้นหางาน / หมายเหตุ" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: { xs: "100%", sm: 220 } }}
    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> } }} />;
  const filterControls = <>{dateControl}{contractorControl}</>;
  const inspector = selected ? <CoordinationInspector
    item={selected}
    draft={draft}
    contractors={data?.contractors ?? []}
    editableContractors={editableCompanies}
    itemTypes={itemTypes}
    drawing={tool === "polygon" || tool === "route"}
    clashWith={clashCodes(selected.id)}
    onDrawRoute={drawRoute}
    areaDirty={areaDirty}
    geometryError={geometryError}
    saving={save.isPending}
    dirty={dirty}
    canSave={!geometryError && tool === "move" && coordinationFormSchema.safeParse(draft ?? {}).success}
    onSave={() => void saveEdits()}
    onCancel={cancelEdits}
    isLocked={Boolean(data?.lock)}
    isEps={isEps}
    onPatch={patchItem}
    onDrawFree={drawPolygon}
    onMakeRectangle={makeRectangle}
    onResetArea={() => { const w = workingRef.current; if (w) patchItem({ areaKind: w.base.areaKind, geometry: w.base.geometry }); }}
    onDelete={() => requestDelete(selected)}
    onClose={() => selectItem(null)}
    onEditColor={!readOnly && data?.canManageColors ? (c) => { changeColor.reset(); setColorTarget(c.id); setChosenColor(c.color); setColorRevision(c.revision); } : undefined}
  /> : null;
  return {
    projectId,
    projects,
    me,
    activeProject,
    setActiveProject,
    params,
    setParams,
    date,
    canExport,
    reportHref,
    contractorIds,
    setContractorIds,
    types,
    setTypes,
    search,
    setSearch,
    display,
    setDisplayState,
    setDisplay,
    selectedId,
    setSelectedId,
    working,
    setWorking,
    tool,
    setTool,
    addAnchor,
    setAddAnchor,
    textEditId,
    setTextEditId,
    creating,
    setCreating,
    dirty,
    leaveAction,
    setLeaveAction,
    guard,
    openItem,
    saveEdits,
    cancelEdits,
    deleteTarget,
    setDeleteTarget,
    colorTarget,
    setColorTarget,
    chosenColor,
    setChosenColor,
    colorRevision,
    setColorRevision,
    workingRef,
    mapBoxRef,
    draft,
    query,
    save,
    remove,
    changeColor,
    saveDayNote,
    dayLock,
    lockConfirm,
    setLockConfirm,
    lockDay,
    unlockDay,
    data,
    selected,
    company,
    editableCompanies,
    filteredCompanyId,
    pendingIcon,
    setPendingIcon,
    startCreate,
    placing,
    setPlacing,
    placeItem,
    geometryError,
    areaDirty,
    busy,
    theme,
    wide,
    phone,
    fill,
    makeRectangle,
    codeOf,
    clashes,
    clashCodes,
    roadNameGroups,
    roadNames,
    q,
    items,
    typeFiltered,
    isFiltered,
    clearFilters,
    updateWorking,
    finish,
    drawPolygon,
    drawRoute,
    patchItem,
    selectItem,
    createItem,
    reload,
    requestDelete,
    counter,
    goToDate,
    today,
    quickDays,
    datePicker,
    quickDayControl,
    dateControl,
    allContractorCodes,
    contractorControl,
    myCompanyIds,
    mineActive,
    myCodes,
    mineControl,
    typeCounts,
    typeControl,
    searchControl,
    filterControls,
    inspector,
    readOnly,
    compact,
  };
}

export type UseCoordinationWorkspaceState = ReturnType<typeof useCoordinationWorkspace>;
