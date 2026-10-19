import { COORDINATION_ICONS } from "@sts/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import FilterAltOffOutlined from "@mui/icons-material/FilterAltOffOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import ViewSidebarOutlined from "@mui/icons-material/ViewSidebarOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import { Suspense, lazy, useState } from "react";
import dayjs from "dayjs";
import Badge from "@mui/material/Badge";
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import { Link as RouterLink } from "react-router-dom";
import AddRoadOutlined from "@mui/icons-material/AddRoadOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { shortDate } from "@/lib/dates.js";
import { DayLockBanner, DayLockStamp } from "./day-lock.js";
import { DayNote } from "./day-note.js";
import { CoordinationJobList } from "./coordination-job-list.js";
import { DisplayOptions } from "./map-filters.js";
import { areaLabel, ICON_LABELS } from "../types/icon-labels.js";
import type { UseCoordinationWorkspaceState } from "../hooks/use-coordination-workspace.js";

const CoordinationCanvas = lazy(() => import("./coordination-canvas.js").then((module) => ({ default: module.CoordinationCanvas })));

export function WorkspaceMap({ ed }: { ed: UseCoordinationWorkspaceState }) {
  const { date, canExport, reportHref, contractorIds, setContractorIds, types, setTypes, search, setSearch, display, setDisplay, selectedId, working, tool, setAddAnchor, textEditId, setTextEditId, creating, workingRef, mapBoxRef, draft, saveDayNote, dayLock, setLockConfirm, unlockDay, data, selected, company, editableCompanies, wide, clashes, clashCodes, roadLines, roadNameGroups, roadNames, q, items, typeFiltered, isFiltered, clearFilters, finish, patchItem, selectItem, startCreate, counter, goToDate, datePicker, quickDayControl, contractorControl, mineControl, typeControl, searchControl, inspector, readOnly, compact, phone, fill, placing, setPlacing, placeItem } = ed;
  const [panelOpen, setPanelOpen] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  if (!data) return null;
  const canLock = !readOnly && data.canLock && !data.lock;
  const addDisabled = !editableCompanies.length || creating || Boolean(draft) || Boolean(placing);
  // EPS actions (lock / export / road register); on phones they move into the filter drawer.
  const epsActions = <>
    {canLock && <Button variant="outlined" startIcon={<LockOutlined />} onClick={() => setLockConfirm(true)}
      sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Lock plan</Button>}
    {canExport && <Button variant="outlined" startIcon={<PrintOutlined />} href={reportHref} target="_blank" rel="noopener"
      sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Export PDF</Button>}
    {/* EPS keeps the site road register that contractors pick road segments from. */}
    {canExport && <Button variant="outlined" startIcon={<AddRoadOutlined />} component={RouterLink} to="/site-coordination/roads"
      sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Road register</Button>}
  </>;
  const shiftDay = (days: number) => goToDate(dayjs(date).add(days, "day").format("YYYY-MM-DD"));
  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden", bgcolor: "background.paper", mb: compact ? 0 : 2,
      ...(fill && { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", mb: 0 }) }}>
      {/* Phone: one slim row (day / date / day + Filters); everything else sits in the bottom drawer. */}
      {phone && <Stack direction="row" spacing={0.25} alignItems="center" sx={{ px: 0.5, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
        <IconButton aria-label="Previous day" onClick={() => shiftDay(-1)} sx={{ p: 0.75 }}><ChevronLeftOutlined /></IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>{datePicker}</Box>
        <IconButton aria-label="Next day" onClick={() => shiftDay(1)} sx={{ p: 0.75 }}><ChevronRightOutlined /></IconButton>
        <Badge color="primary" variant="dot" invisible={!isFiltered} overlap="rectangular">
          <Button variant="outlined" startIcon={<TuneOutlined />} onClick={() => setPanelOpen(true)} sx={{ whiteSpace: "nowrap", height: 40, minWidth: 0, px: 1.25, "& .MuiButton-startIcon": { mr: 0.5 } }}>Filters</Button>
        </Badge>
      </Stack>}
      {/* Desktop/tablet: one row in three groups — day | what to show | what to do. Rare EPS actions sit in ⋯. */}
      {!compact && !phone && <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 1.5, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
        {datePicker}
        {quickDayControl}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {mineControl}
        {contractorControl}
        {typeControl}
        {searchControl}
        <DisplayOptions value={display} onChange={setDisplay} exclude={roadNames ? [] : ["roadNames"]} />
        <Box sx={{ flex: 1 }} />
        {!readOnly && <Button variant="contained" disableElevation startIcon={<AddOutlined />} onClick={(e) => setAddAnchor(e.currentTarget)} disabled={addDisabled} sx={{ whiteSpace: "nowrap" }}>Add item</Button>}
        {/* Draw the road this contractor will use today: tap points along it, arrows show the way. */}
        {!readOnly && <Button variant="outlined" startIcon={<RouteOutlined />} onClick={() => startCreate("road")} disabled={addDisabled} sx={{ whiteSpace: "nowrap" }}>Draw road</Button>}
        {(canLock || canExport) && <>
          <Tooltip title="More actions"><Button variant="outlined" color="inherit" aria-label="More actions" aria-haspopup="menu" onClick={(e) => setMoreAnchor(e.currentTarget)} sx={{ minWidth: 40, px: 0, borderColor: "divider" }}><MoreHoriz /></Button></Tooltip>
          <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
            {canLock && <MenuItem onClick={() => { setMoreAnchor(null); setLockConfirm(true); }}><ListItemIcon><LockOutlined fontSize="small" /></ListItemIcon>Lock plan</MenuItem>}
            {canExport && <MenuItem component="a" href={reportHref} target="_blank" rel="noopener" onClick={() => setMoreAnchor(null)}><ListItemIcon><PrintOutlined fontSize="small" /></ListItemIcon>Export PDF</MenuItem>}
            {/* EPS keeps the site road register that contractors pick road segments from. */}
            {canExport && <MenuItem component={RouterLink} to="/site-coordination/roads" onClick={() => setMoreAnchor(null)}><ListItemIcon><AddRoadOutlined fontSize="small" /></ListItemIcon>Road register</MenuItem>}
          </Menu>
        </>}
      </Stack>}
      {data.lock && <DayLockBanner lock={data.lock} canUnlock={!readOnly && data.canLock} busy={dayLock.isPending} onUnlock={() => void unlockDay()} />}
      {!compact && !phone && isFiltered && <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 1.5, py: 0.75, borderBottom: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>กำลังกรอง · แสดง {items.length} จาก {data.items.length} งาน</Typography>
        {contractorIds && <Chip size="small" label={`Contractor: ${data.contractors.filter((c) => contractorIds.has(c.id)).map((c) => c.code).join(", ")}`} onDelete={() => { selectItem(null); setContractorIds(null); }} />}
        {typeFiltered && <Chip size="small" label={`Type: ${types.size ? [...types].map((t) => ICON_LABELS[t]).join(", ") : "None"}`} onDelete={() => { selectItem(null); setTypes(new Set(COORDINATION_ICONS)); }} />}
        {q && <Chip size="small" label={`Search: "${search.trim()}"`} onDelete={() => setSearch("")} />}
        <Button startIcon={<FilterAltOffOutlined fontSize="small" />} onClick={clearFilters} sx={{ ml: "auto" }}>Clear filters</Button>
      </Stack>}
      {/* map + detail panel (beside the map on wide screens, below it otherwise) */}
      <Box sx={phone ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } : { display: "grid", gridTemplateColumns: { xs: "1fr", lg: !compact && (display.jobList || selected) ? "minmax(0, 1fr) 360px" : "1fr" }, ...(fill && { flex: 1, minHeight: 0, gridTemplateRows: "minmax(0, 1fr)" }) }}>
      <Box ref={mapBoxRef} sx={{ position: "relative", minWidth: 0, scrollMarginTop: 64, ...(fill && { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }) }}>
        {data.lock && <DayLockStamp lock={data.lock} date={date} small={compact} />}
        <Suspense fallback={<BlockSkeleton height={compact ? 390 : 620} />}><CoordinationCanvas map={data.map} contractors={data.contractors} items={items} selectedId={selectedId} draft={draft} draftId={working?.id} tool={tool} compact={compact} fill={fill} placing={Boolean(placing)} onPlace={placeItem} onCancelPlace={() => setPlacing(null)}
          onSelect={selectItem} onChange={patchItem} onFinish={finish}
          onDeselect={() => selectItem(null)}
          textEditing={textEditId !== null && textEditId === working?.id} onEditText={() => { if (workingRef.current) setTextEditId(workingRef.current.id); }}
          display={display} clashes={clashes} roads={roadLines} roadNames={roadNameGroups} /></Suspense>
        {/* Detail card for the clicked job: two lines (+ the note when there is one). Below lg the bottom
            sheet already shows the same, so the card is for the dashboard and wide screens only. */}
        {(compact || (display.detailCard && wide)) && selected && !textEditId && tool === "move" && (
          <Box sx={{ position: "absolute", left: 12, top: 44, width: "min(340px, calc(100% - 24px))", px: 1.5, py: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 6px 20px rgba(15, 23, 42, 0.12)", zIndex: 2 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box component="span" sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: company?.color ?? "divider", flexShrink: 0 }} />
              <Typography variant="body2" noWrap sx={{ fontWeight: 700, flex: 1, minWidth: 0 }}>{company?.code} · {draft?.title ?? selected.title}</Typography>
              <IconButton size="small" aria-label="Close details" onClick={() => selectItem(null)} sx={{ p: 0.25, mr: -0.75 }}><CloseOutlined sx={{ fontSize: 16 }} /></IconButton>
            </Stack>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {company?.name} · {ICON_LABELS[(draft ?? selected).icon]} · {areaLabel(draft ?? selected, true)}
            </Typography>
            {(draft?.note ?? selected.note) && <Typography variant="body2" sx={{ whiteSpace: "pre-line", mt: 0.5 }}>{draft?.note ?? selected.note}</Typography>}
          </Box>
        )}
        {!compact && !phone && !display.jobList && !selected && (
          <Button variant="contained" disableElevation startIcon={<ViewSidebarOutlined sx={{ transform: "scaleX(-1)" }} />} onClick={() => setDisplay({ ...display, jobList: true })}
            sx={{ position: "absolute", top: 44, right: 0, zIndex: 3, borderTopRightRadius: 0, borderBottomRightRadius: 0, textTransform: "none", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(15, 23, 42, 0.18)" }}>
            รายการงาน · {items.length}
          </Button>
        )}
        {!items.length && !draft && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ position: "absolute", top: 48, right: 8, maxWidth: "calc(100% - 16px)", px: 2, py: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 999, pointerEvents: "none" }}>
            <InfoOutlined sx={{ fontSize: 18, color: "info.main" }} />
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              ไม่มีรายการงาน{isFiltered ? "ที่ตรงกับตัวกรอง" : ""}ในวันที่ {shortDate(date)}{!readOnly ? " — กด «เพิ่มรายการงาน» เพื่อเริ่มวางแผน" : ""}
            </Typography>
          </Stack>
        )}
        {/* Phone: big thumb-reach buttons on the map (zoom controls sit bottom-right). */}
        {phone && !readOnly && !draft && !selected && !placing && <Stack direction="row" spacing={1} sx={{ position: "absolute", left: 12, bottom: 14, zIndex: 30 }}>
          <Button variant="contained" size="large" startIcon={<AddOutlined />} onClick={(e) => setAddAnchor(e.currentTarget)} disabled={addDisabled} sx={{ whiteSpace: "nowrap", boxShadow: 3 }}>Add item</Button>
          <Button variant="outlined" size="large" startIcon={<RouteOutlined />} onClick={() => startCreate("road")} disabled={addDisabled} sx={{ whiteSpace: "nowrap", bgcolor: "background.paper", boxShadow: 3, "&:hover": { bgcolor: "background.paper" } }}>Draw road</Button>
        </Stack>}
      </Box>
      {!compact && selected && wide ? <Box sx={{ borderLeft: "1px solid", borderColor: "divider", height: "100%", minHeight: 0 }}>{inspector}</Box>
        : !compact && !phone && display.jobList && <CoordinationJobList embedded items={items} contractors={data.contractors} clashCodes={clashCodes} selectedId={selectedId} onSelect={selectItem} onCollapse={() => setDisplay({ ...display, jobList: false })}
          footer={<DayNote date={date} dayNote={data.dayNote} canEdit={!readOnly && data.canEditDayNote} onSave={(note) => saveDayNote.mutateAsync(note)} />} />}
      </Box>
      {/* Phone drawer: quick days, filters, display, EPS actions, then the job list + day note. */}
      {phone && <Drawer anchor="bottom" open={panelOpen} onClose={() => setPanelOpen(false)}
        slotProps={{ paper: { sx: { maxHeight: "85dvh", borderTopLeftRadius: 16, borderTopRightRadius: 16 } } }}>
        <Stack spacing={1.25} sx={{ p: 1.5 }}>
          <Stack direction="row" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>Filters</Typography>
            {counter}
            <IconButton aria-label="Close filters" onClick={() => setPanelOpen(false)} sx={{ ml: 0.5 }}><CloseOutlined /></IconButton>
          </Stack>
          {quickDayControl}
          {mineControl}
          {contractorControl}
          {typeControl}
          {searchControl}
          <Stack direction="row" spacing={1} alignItems="center">
            <DisplayOptions value={display} onChange={setDisplay} exclude={roadNames ? [] : ["roadNames"]} />
            {isFiltered && <Button startIcon={<FilterAltOffOutlined fontSize="small" />} onClick={clearFilters} sx={{ ml: "auto" }}>Clear filters</Button>}
          </Stack>
          {epsActions}
        </Stack>
        <CoordinationJobList embedded items={items} contractors={data.contractors} clashCodes={clashCodes} selectedId={selectedId} onSelect={(id) => { setPanelOpen(false); selectItem(id); }}
          footer={<DayNote date={date} dayNote={data.dayNote} canEdit={!readOnly && data.canEditDayNote} onSave={(note) => saveDayNote.mutateAsync(note)} />} />
      </Drawer>}
    </Box>
  );
}
