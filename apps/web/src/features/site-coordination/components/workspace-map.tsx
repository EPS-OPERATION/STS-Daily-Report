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
import { Suspense, lazy } from "react";
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
  const { date, canExport, reportHref, contractorIds, setContractorIds, types, setTypes, search, setSearch, display, setDisplay, selectedId, working, tool, setAddAnchor, textEditId, setTextEditId, creating, workingRef, mapBoxRef, draft, saveDayNote, dayLock, setLockConfirm, unlockDay, data, selected, company, editableCompanies, wide, clashes, clashCodes, roadLines, roadNameGroups, roadNames, q, items, typeFiltered, isFiltered, clearFilters, finish, patchItem, selectItem, startCreate, counter, datePicker, quickDayControl, contractorControl, mineControl, typeControl, searchControl, inspector, readOnly, compact } = ed;
  if (!data) return null;
  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden", bgcolor: "background.paper", mb: compact ? 0 : 2 }}>
      {!compact && <Stack spacing={1.25} sx={{ px: 1.5, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {datePicker}
          {quickDayControl}
          <Box sx={{ flex: 1 }} />
          {!readOnly && <Button variant="contained" disableElevation startIcon={<AddOutlined />} onClick={(e) => setAddAnchor(e.currentTarget)} disabled={!editableCompanies.length || creating || Boolean(draft)}
            sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Add item</Button>}
          {/* Draw the road this contractor will use today: tap points along it, arrows show the way. */}
          {!readOnly && <Button variant="outlined" startIcon={<RouteOutlined />} onClick={() => startCreate("road")} disabled={!editableCompanies.length || creating || Boolean(draft)}
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
          <DisplayOptions value={display} onChange={setDisplay} exclude={roadNames ? [] : ["roadNames"]} />
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
        <Suspense fallback={<BlockSkeleton height={compact ? 390 : 620} />}><CoordinationCanvas map={data.map} contractors={data.contractors} items={items} selectedId={selectedId} draft={draft} draftId={working?.id} tool={tool} compact={compact}
          onSelect={selectItem} onChange={patchItem} onFinish={finish}
          onDeselect={() => selectItem(null)}
          textEditing={textEditId !== null && textEditId === working?.id} onEditText={() => { if (workingRef.current) setTextEditId(workingRef.current.id); }}
          display={display} clashes={clashes} roads={roadLines} roadNames={roadNameGroups} /></Suspense>
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
              ไม่มีรายการงาน{isFiltered ? "ที่ตรงกับตัวกรอง" : ""}ในวันที่ {shortDate(date)}{!readOnly ? " — กด «เพิ่มรายการงาน» เพื่อเริ่มวางแผน" : ""}
            </Typography>
          </Stack>
        )}
      </Box>
      {!compact && selected && wide ? <Box sx={{ borderLeft: "1px solid", borderColor: "divider", height: 652, minHeight: 0 }}>{inspector}</Box>
        : !compact && display.jobList && <CoordinationJobList embedded items={items} contractors={data.contractors} clashCodes={clashCodes} selectedId={selectedId} onSelect={selectItem} onCollapse={() => setDisplay({ ...display, jobList: false })}
          footer={<DayNote date={date} dayNote={data.dayNote} canEdit={!readOnly && data.canEditDayNote} onSave={(note) => saveDayNote.mutateAsync(note)} />} />}
      </Box>
    </Box>
  );
}
