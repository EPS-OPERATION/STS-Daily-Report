import { coordinationGeometryError, coordinationRouteClashes, coordinationToday, COORDINATION_ICONS, isEpsStaff, type CoordinationIcon, type CoordinationInput, type CoordinationItem, type CoordinationPoint } from "@sts/shared";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import PersonOutlined from "@mui/icons-material/PersonOutlined";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { TOKENS } from "@/app/theme/tokens.js";
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
  linkArea: item.linkArea, twoWay: item.twoWay, note: item.note ?? null,
});
// Auto-save editing: `working` is the item currently on the map (selected + editable).
// `base` keeps the last persisted state so an invalid in-progress drawing can be reverted.
export interface Working { id: string; revision: number; base: CoordinationInput; input: CoordinationInput }

export function useCoordinationWorkspace({ readOnly = false, compact = false, roadNames = false }: { readOnly?: boolean; compact?: boolean; roadNames?: boolean }) {
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
  // Register road names under everything (Map page only): one label per name, pieces of a cut road share it.
  const register = useRoadSegments(roadNames ? activeProject : null);
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
  const roadNameGroups = roadNames && display.roadNames
    ? [...(register.data?.data ?? []).reduce((m, s) => {
        const key = s.name.trim().toLowerCase();
        const g = m.get(key) ?? { name: s.name, pieces: [] as CoordinationPoint[][] };
        g.pieces.push(s.points);
        return m.set(key, g);
      }, new Map<string, { name: string; pieces: CoordinationPoint[][] }>()).values()]
    : [];
  // Road requests for this day with the company and time (same filters as jobs).
  const roadLines = display.roads ? (data?.roads ?? [])
    .filter((r) => !contractorIds || contractorIds.has(r.contractorId))
    .map((r) => ({
      id: r.id, points: r.route, alert: r.clash,
      // "<request>:<road>" = a register road picked for the request (no direction); else a drawn route.
      arrows: !r.id.includes(":"),
      color: data?.contractors.find((c) => c.id === r.contractorId)?.color ?? TOKENS.primary,
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
    pending,
    setPending,
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
    savingRef,
    queuedRef,
    timerRef,
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
    geometryError,
    areaDirty,
    busy,
    theme,
    wide,
    makeRectangle,
    codeOf,
    clashes,
    clashCodes,
    roadLines,
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
    flush,
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
