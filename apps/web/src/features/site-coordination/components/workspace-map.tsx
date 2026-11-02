import { isEpsAdmin } from "@sts/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import FilterAltOffOutlined from "@mui/icons-material/FilterAltOffOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import DragIndicatorOutlined from "@mui/icons-material/DragIndicatorOutlined";
import ViewSidebarOutlined from "@mui/icons-material/ViewSidebarOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import FullscreenOutlined from "@mui/icons-material/FullscreenOutlined";
import FullscreenExitOutlined from "@mui/icons-material/FullscreenExitOutlined";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import Badge from "@mui/material/Badge";
import Drawer from "@mui/material/Drawer";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import FormatListBulletedOutlined from "@mui/icons-material/FormatListBulletedOutlined";
import { Link as RouterLink } from "react-router-dom";
import AddRoadOutlined from "@mui/icons-material/AddRoadOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import MapOutlined from "@mui/icons-material/MapOutlined";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { shortDate } from "@/lib/dates.js";
import { DayLockBanner, DayLockStamp } from "./day-lock.js";
import { DayNote } from "./day-note.js";
import { CoordinationJobList } from "./coordination-job-list.js";
import { DisplayOptions } from "./map-filters.js";
import { SectionLegend } from "./section-legend.js";
import { SectionDrawDialog } from "./section-draw-dialog.js";
import { areaLabel } from "../types/icon-labels.js";
import type { UseCoordinationWorkspaceState } from "../hooks/use-coordination-workspace.js";

const CoordinationCanvas = lazy(() => import("./coordination-canvas.js").then((module) => ({ default: module.CoordinationCanvas })));

export function WorkspaceMap({ ed }: { ed: UseCoordinationWorkspaceState }) {
  const { activeMap, isEps, mapControl, activeSections, highlightSectionId, setHighlightSectionId, sectionJobCounts, sectionWork, guard, openItem, date, canExport, reportHref, contractorIds, setContractorIds, types, setTypes, search, setSearch, display, setDisplay, selectedId, working, tool, setAddAnchor, textEditId, setTextEditId, creating, workingRef, mapBoxRef, draft, saveDayNote, dayLock, setLockConfirm, unlockDay, data, selected, company, editableCompanies, wide, clashes, clashCodes, roadNameGroups, roadNames, q, items, typeFiltered, isFiltered, clearFilters, finish, patchItem, selectItem, startCreate, counter, goToDate, datePicker, quickDayControl, contractorControl, mineControl, typeControl, searchControl, inspector, readOnly, compact, phone, fill, meeting, toggleMeeting, placing, setPlacing, placeItem } = ed;
  const [panelOpen, setPanelOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [sectionDrawOpen, setSectionDrawOpen] = useState(false);
  const [sectionCardOffset, setSectionCardOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [sectionCardDragging, setSectionCardDragging] = useState(false);
  const sectionCardDragRef = useRef<{ startX: number; startY: number; initDx: number; initDy: number } | null>(null);

  useEffect(() => {
    setSectionCardOffset({ dx: 0, dy: 0 });
  }, [highlightSectionId]);

  const onSectionCardPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    sectionCardDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initDx: sectionCardOffset.dx,
      initDy: sectionCardOffset.dy,
    };
    setSectionCardDragging(true);
  };

  const onSectionCardPointerMove = (e: React.PointerEvent) => {
    if (!sectionCardDragRef.current) return;
    const dx = sectionCardDragRef.current.initDx + (e.clientX - sectionCardDragRef.current.startX);
    const dy = sectionCardDragRef.current.initDy + (e.clientY - sectionCardDragRef.current.startY);
    setSectionCardOffset({ dx, dy });
  };

  const onSectionCardPointerUp = (e: React.PointerEvent) => {
    if (sectionCardDragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      sectionCardDragRef.current = null;
      setSectionCardDragging(false);
    }
  };
  if (!data) return null;
  const itemTypes = data.itemTypes ?? [];
  const typeByCode = new Map(itemTypes.map((t) => [t.code, t]));
  const canLock = !readOnly && data.canLock && !data.lock;
  const isAdmin = !readOnly && isEpsAdmin(ed.me.data?.data.user.role);
  const canManageItemTypes = isAdmin;
  const addDisabled = !editableCompanies.length || creating || Boolean(draft) || Boolean(placing);
  // Actions follow the area on screen. Main plant layout: site roads (Draw road = truck route on the road register,
  // Road register). Other areas (33 kV line …): their route sections — admin draws them here (วาดเส้นทาง), other EPS
  // staff open the Route sections page. Lock / export / item types / map areas apply everywhere.
  const onMain = ed.isMainMap;
  const canDrawRoad = !readOnly && onMain;
  const canDrawSections = isAdmin && !onMain;
  const canOpenSections = canExport && !onMain && !isAdmin;
  // EPS actions (lock / export / road register); on phones they move into the filter drawer.
  const epsActions = <>
    {canLock && <Button variant="outlined" startIcon={<LockOutlined />} onClick={() => setLockConfirm(true)}
      sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Lock plan</Button>}
    {canExport && <Button variant="outlined" startIcon={<PrintOutlined />} href={reportHref} target="_blank" rel="noopener"
      sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Export PDF</Button>}
    {/* EPS keeps the site road register that contractors pick road segments from. */}
    {canExport && onMain && <Button variant="outlined" startIcon={<AddRoadOutlined />} component={RouterLink} to="/site-coordination/roads"
      sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Road register</Button>}
    {canOpenSections && <Button variant="outlined" startIcon={<RouteOutlined />} component={RouterLink} to={`/site-coordination/sections${activeMap ? `?mapId=${activeMap.id}` : ""}`}
      sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Route sections</Button>}
    {canDrawSections && <Button variant="outlined" startIcon={<RouteOutlined />} onClick={() => setSectionDrawOpen(true)}
      sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>วาดเส้นทาง</Button>}
    {canManageItemTypes && <Button variant="outlined" startIcon={<TuneOutlined />} component={RouterLink} to="/site-coordination/item-types"
      sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Item types</Button>}
    {canManageItemTypes && <Button variant="outlined" startIcon={<MapOutlined />} component={RouterLink} to="/site-coordination/maps"
      sx={{ whiteSpace: "nowrap", width: { xs: "100%", sm: "auto" } }}>Map areas</Button>}
  </>;
  // Display switches that do nothing here: register road names off the main map, sections where none are drawn.
  const hidden = [...(roadNames ? [] : ["roadNames" as const]), ...(activeSections.length ? [] : ["sections" as const])];
  const onHighlightSection = (id: string | null) => {
    if (id && selectedId) selectItem(null);
    setHighlightSectionId(id);
  };
  const highlightedSection = activeSections.find((s) => s.id === highlightSectionId);
  const highlightedActivities = sectionWork.data?.activities.filter((a) => a.sectionId === highlightSectionId) ?? [];
  const highlightedPlans = sectionWork.data?.planned.filter((p) => p.sectionId === highlightSectionId) ?? [];
  const legend = display.sections ? <SectionLegend sections={activeSections} jobCounts={sectionJobCounts} work={sectionWork.data} workLoading={sectionWork.isLoading} highlightId={highlightSectionId} onHighlight={onHighlightSection} /> : null;
  const meetingLabel = meeting ? "Exit full screen" : "Full screen (meeting)";
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
        <IconButton aria-label={meetingLabel} aria-pressed={meeting} color={meeting ? "primary" : "default"} onClick={toggleMeeting} sx={{ p: 0.75 }}>{meeting ? <FullscreenExitOutlined /> : <FullscreenOutlined />}</IconButton>
      </Stack>}
      {phone && mapControl && <Box sx={{ px: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>{mapControl}</Box>}
      {/* Desktop/tablet, two rows that always fill the width:
          row 1 = day (left) + actions (right edge; rare EPS ones in ⋯); row 2 = filters, the search box takes the leftover width. */}
      {!compact && !phone && <Stack spacing={1} sx={{ px: 1.5, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {datePicker}
          {quickDayControl}
          {mapControl}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: "auto" }}>
            {!readOnly && <Button variant="contained" disableElevation startIcon={<AddOutlined />} onClick={(e) => setAddAnchor(e.currentTarget)} disabled={addDisabled} sx={{ whiteSpace: "nowrap" }}>Add item</Button>}
            {/* Draw the road this contractor will use today: tap points along it, arrows show the way. */}
            {canDrawRoad && <Button variant="outlined" startIcon={<RouteOutlined />} onClick={() => startCreate("road")} disabled={addDisabled} sx={{ whiteSpace: "nowrap" }}>Draw road</Button>}
            {/* Admin: draw/reshape the area's route line (e.g. the 33 kV sections A-B, C-D) without leaving the map. */}
            {canDrawSections && <Button variant="outlined" startIcon={<RouteOutlined />} onClick={() => setSectionDrawOpen(true)} sx={{ whiteSpace: "nowrap" }}>วาดเส้นทาง</Button>}
            <Tooltip title={meeting ? "Exit full screen (Esc)" : "Full screen for meetings — hides the menu bars"}>
              <Button variant={meeting ? "contained" : "outlined"} disableElevation startIcon={meeting ? <FullscreenExitOutlined /> : <FullscreenOutlined />} aria-pressed={meeting} onClick={toggleMeeting} sx={{ whiteSpace: "nowrap" }}>{meeting ? "Exit full screen" : "Full screen"}</Button>
            </Tooltip>
            {(canLock || canExport) && <>
              <Tooltip title="More actions"><Button variant="outlined" color="inherit" aria-label="More actions" aria-haspopup="menu" onClick={(e) => setMoreAnchor(e.currentTarget)} sx={{ minWidth: 40, px: 0, borderColor: "divider" }}><MoreHoriz /></Button></Tooltip>
              <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
                {canLock && <MenuItem onClick={() => { setMoreAnchor(null); setLockConfirm(true); }}><ListItemIcon><LockOutlined fontSize="small" /></ListItemIcon>Lock plan</MenuItem>}
                {canExport && <MenuItem component="a" href={reportHref} target="_blank" rel="noopener" onClick={() => setMoreAnchor(null)}><ListItemIcon><PrintOutlined fontSize="small" /></ListItemIcon>Export PDF</MenuItem>}
                {/* EPS keeps the site road register that contractors pick road segments from. */}
                {canExport && onMain && <MenuItem component={RouterLink} to="/site-coordination/roads" onClick={() => setMoreAnchor(null)}><ListItemIcon><AddRoadOutlined fontSize="small" /></ListItemIcon>Road register</MenuItem>}
                {canOpenSections && <MenuItem component={RouterLink} to={`/site-coordination/sections${activeMap ? `?mapId=${activeMap.id}` : ""}`} onClick={() => setMoreAnchor(null)}><ListItemIcon><RouteOutlined fontSize="small" /></ListItemIcon>Route sections</MenuItem>}
                {canManageItemTypes && <MenuItem component={RouterLink} to="/site-coordination/item-types" onClick={() => setMoreAnchor(null)}><ListItemIcon><TuneOutlined fontSize="small" /></ListItemIcon>Item types</MenuItem>}
                {canManageItemTypes && <MenuItem component={RouterLink} to="/site-coordination/maps" onClick={() => setMoreAnchor(null)}><ListItemIcon><MapOutlined fontSize="small" /></ListItemIcon>Map areas</MenuItem>}
              </Menu>
            </>}
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {mineControl}
          {contractorControl}
          {typeControl}
          <Box sx={{ flex: "1 1 200px", minWidth: 180, "& .MuiTextField-root": { width: "100%" } }}>{searchControl}</Box>
          <DisplayOptions value={display} onChange={setDisplay} exclude={hidden} />
        </Stack>
      </Stack>}
      {data.lock && <DayLockBanner lock={data.lock} canUnlock={!readOnly && data.canLock} busy={dayLock.isPending} onUnlock={() => void unlockDay()} />}
      {!compact && !phone && isFiltered && <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 1.5, py: 0.75, borderBottom: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>กำลังกรอง · แสดง {items.length} จาก {ed.mapItems.length} งาน</Typography>
        {contractorIds && <Chip size="small" label={`Contractor: ${contractorIds.size === 0 ? "none" : data.contractors.filter((c) => contractorIds.has(c.id)).map((c) => c.code).join(", ")}`} onDelete={() => guard(() => { openItem(null); setContractorIds(null); })} />}
        {typeFiltered && <Chip size="small" label={`Type: ${types.size ? [...types].map((t) => typeByCode.get(t)?.labelTh ?? t).join(", ") : "None"}`} onDelete={() => guard(() => { openItem(null); setTypes(new Set(itemTypes.map((t) => t.code))); })} />}
        {q && <Chip size="small" label={`Search: "${search.trim()}"`} onDelete={() => setSearch("")} />}
        <Button startIcon={<FilterAltOffOutlined fontSize="small" />} onClick={clearFilters} sx={{ ml: "auto" }}>Clear filters</Button>
      </Stack>}
      {/* map + detail panel (beside the map on wide screens, below it otherwise) */}
      <Box sx={phone ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } : { display: "grid", gridTemplateColumns: { xs: "1fr", lg: !compact && (display.jobList || selected) ? "minmax(0, 1fr) 360px" : "1fr" }, ...(fill && { flex: 1, minHeight: 0, gridTemplateRows: "minmax(0, 1fr)" }) }}>
      <Box ref={mapBoxRef} sx={{ position: "relative", minWidth: 0, scrollMarginTop: 64, ...(fill && { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }) }}>
        {data.lock && <DayLockStamp lock={data.lock} date={date} small={compact} />}
        <Suspense fallback={<BlockSkeleton height={compact ? 390 : 620} />}><CoordinationCanvas key={(activeMap ?? data.map).id} map={activeMap ?? data.map} contractors={data.contractors} items={items} itemTypes={itemTypes} selectedId={selectedId} draft={draft} draftId={working?.id} tool={tool} compact={compact} fill={fill} placing={Boolean(placing)} onPlace={placeItem} onCancelPlace={() => setPlacing(null)}
          onSelect={selectItem} onChange={patchItem} onFinish={finish}
          onDeselect={() => selectItem(null)}
          textEditing={textEditId !== null && textEditId === working?.id} onEditText={() => { if (workingRef.current) setTextEditId(workingRef.current.id); }}
          display={display} clashes={clashes} roadNames={roadNameGroups} sections={activeSections} highlightSectionId={highlightSectionId} labelsEditable={isEps}
          onHighlightSection={onHighlightSection} sectionWork={sectionWork.data} /></Suspense>
        {/* Detail card for the clicked job: two lines (+ the note when there is one). Below lg the bottom
            sheet already shows the same, so the card is for the dashboard and wide screens only. */}
        {(compact || (display.detailCard && wide)) && selected && !textEditId && tool === "move" && (
          <Box sx={{ position: "absolute", left: 12, top: compact ? 12 : 44, width: "min(340px, calc(100% - 24px))", px: 1.5, py: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: "0 6px 20px rgba(15, 23, 42, 0.12)", zIndex: 10 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box component="span" sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: company?.color ?? "divider", flexShrink: 0 }} />
              <Typography variant="body2" noWrap sx={{ fontWeight: 700, flex: 1, minWidth: 0 }}>{company?.code} · {draft?.title ?? selected.title}</Typography>
              <IconButton size="small" aria-label="Close details" onClick={() => selectItem(null)} sx={{ p: 0.25, mr: -0.75 }}><CloseOutlined sx={{ fontSize: 16 }} /></IconButton>
            </Stack>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {company?.name} · {typeByCode.get((draft ?? selected).icon)?.labelTh ?? (draft ?? selected).icon} · {areaLabel(draft ?? selected, true)}
            </Typography>
            {(draft?.note ?? selected.note) && <Typography variant="body2" sx={{ whiteSpace: "pre-line", mt: 0.5 }}>{draft?.note ?? selected.note}</Typography>}
          </Box>
        )}
        {/* Detail card for highlighted route section — default at 8% X / 20% Y as requested, draggable anywhere */}
        {(compact || display.detailCard) && !selected && highlightedSection && !textEditId && tool === "move" && (
          <Box sx={{
            position: "absolute",
            left: phone ? 12 : "8%",
            bottom: phone ? 72 : "20%",
            transform: sectionCardOffset.dx || sectionCardOffset.dy
              ? `translate(${sectionCardOffset.dx}px, ${sectionCardOffset.dy}px)`
              : undefined,
            width: phone ? "auto" : "min(360px, calc(92% - 32px))",
            maxWidth: phone ? "calc(100% - 24px)" : "calc(92% - 24px)",
            maxHeight: phone ? "calc(100% - 84px)" : "calc(80% - 24px)",
            overflowY: "auto",
            px: 1.5,
            py: 1.25,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.16)",
            zIndex: 20,
            transition: sectionCardDragging ? "none" : "box-shadow 0.15s ease",
          }}>
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              onPointerDown={onSectionCardPointerDown}
              onPointerMove={onSectionCardPointerMove}
              onPointerUp={onSectionCardPointerUp}
              onPointerCancel={onSectionCardPointerUp}
              onDoubleClick={() => setSectionCardOffset({ dx: 0, dy: 0 })}
              sx={{
                cursor: sectionCardDragging ? "grabbing" : "grab",
                userSelect: "none",
                touchAction: "none",
                pb: 0.5,
              }}
            >
              <Tooltip title="ลากเพื่อย้ายการ์ด (ดับเบิลคลิกเพื่อรีเซ็ต)">
                <DragIndicatorOutlined sx={{ fontSize: 16, color: "text.disabled", flexShrink: 0 }} />
              </Tooltip>
              <Box component="span" sx={{ width: 14, height: 6, borderRadius: "3px", bgcolor: highlightedSection.color, flexShrink: 0 }} />
              <Typography variant="body2" noWrap sx={{ fontWeight: 700, flex: 1, minWidth: 0 }}>
                {highlightedSection.code} {highlightedSection.work ? `· ${highlightedSection.work}` : ""}
              </Typography>
              <IconButton
                size="small"
                aria-label="Close details"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setHighlightSectionId(null)}
                sx={{ p: 0.25, mr: -0.75 }}
              >
                <CloseOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Stack>
            {highlightedActivities.length > 0 ? (() => {
              const sorted = [...highlightedActivities].sort((a, b) => (b.headcount ?? 0) - (a.headcount ?? 0) || a.contractorCode.localeCompare(b.contractorCode));
              const hasPeople = sorted.some((a) => a.headcount !== null);
              const totalPeople = sorted.reduce((sum, a) => sum + (a.headcount ?? 0), 0);
              return (
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "flex", alignItems: "center", gap: 0.5 }}>
                      <AssignmentOutlined sx={{ fontSize: 14 }} />จากรายงานประจำวัน ({sorted.length} รายการ)
                    </Typography>
                    {hasPeople ? (
                      <Chip
                        size="small"
                        label={`รวม ${totalPeople} คน`}
                        sx={{
                          height: 20,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          bgcolor: "primary.50",
                          color: "primary.main",
                          border: "1px solid",
                          borderColor: "primary.200",
                        }}
                      />
                    ) : null}
                  </Stack>
                  {sorted.map((a, i) => (
                    <Box key={a.id} sx={{ borderLeft: "3px solid", borderColor: highlightedSection.color, pl: 1, py: 0.25 }}>
                      <Typography variant="body2">
                        <b>{a.contractorCode}</b> · {a.work}
                        {sorted.length > 1 && i === 0 ? (
                          <Box component="span" sx={{ ml: 0.75, fontSize: "0.7rem", fontWeight: 700, px: 0.6, py: 0.1, bgcolor: "primary.50", color: "primary.main", borderRadius: 0.75, border: "1px solid", borderColor: "primary.100" }}>
                            หลัก
                          </Box>
                        ) : null}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[
                          a.discipline,
                          a.headcount !== null ? `${a.headcount} คน` : null,
                          a.startTime && a.endTime ? `${a.startTime}–${a.endTime}` : "ทั้งวัน",
                          a.planPercent !== null ? `แผน ${a.planPercent}%` : null,
                          a.actualPercent !== null ? `ทำได้ ${a.actualPercent}%` : null,
                          a.isAdditional ? "งานเพิ่มเติม" : null,
                        ].filter(Boolean).join(" · ")}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              );
            })() : null}
            {highlightedPlans.length > 0 ? (
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  แผนที่แจ้งไว้เมื่อวาน (Tomorrow Forecast)
                </Typography>
                {highlightedPlans.map((p) => (
                  <Box key={p.id} sx={{ borderLeft: "3px dashed", borderColor: highlightedSection.color, pl: 1, py: 0.25 }}>
                    <Typography variant="body2"><b>{p.contractorCode}</b> · {p.work}</Typography>
                  </Box>
                ))}
              </Stack>
            ) : null}
            {highlightedActivities.length === 0 && highlightedPlans.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                ยังไม่มีผู้รับเหมาลงงานในช่วงนี้วันนี้
              </Typography>
            ) : null}
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
        {/* Phone: the job list lives behind this button (a dot = there is a day note to read). */}
        {phone && !placing && tool === "move" && <Badge color="warning" variant="dot" invisible={!data.dayNote?.note} sx={{ position: "absolute", top: 12, right: 12, zIndex: 30 }}>
          <Button variant="outlined" startIcon={<FormatListBulletedOutlined />} onClick={() => setListOpen(true)}
            sx={{ whiteSpace: "nowrap", bgcolor: "background.paper", boxShadow: 3, "&:hover": { bgcolor: "background.paper" } }}>Jobs · {items.length}</Button>
        </Badge>}
        {/* Phone: big thumb-reach buttons on the map (zoom controls sit bottom-right). */}
        {phone && !readOnly && !draft && !selected && !placing && <Stack direction="row" spacing={1} sx={{ position: "absolute", left: 12, bottom: 14, zIndex: 30 }}>
          <Button variant="contained" size="large" startIcon={<AddOutlined />} onClick={(e) => setAddAnchor(e.currentTarget)} disabled={addDisabled} sx={{ whiteSpace: "nowrap", boxShadow: 3 }}>Add item</Button>
          {canDrawRoad && <Button variant="outlined" size="large" startIcon={<RouteOutlined />} onClick={() => startCreate("road")} disabled={addDisabled} sx={{ whiteSpace: "nowrap", bgcolor: "background.paper", boxShadow: 3, "&:hover": { bgcolor: "background.paper" } }}>Draw road</Button>}
        </Stack>}
      </Box>
      {!compact && selected && wide ? <Box sx={{ borderLeft: "1px solid", borderColor: "divider", height: "100%", minHeight: 0 }}>{inspector}</Box>
        : !compact && !phone && display.jobList && <CoordinationJobList embedded header={legend} filtered={isFiltered} items={items} contractors={data.contractors} itemTypes={itemTypes} clashCodes={clashCodes} selectedId={selectedId} onSelect={selectItem} onCollapse={() => setDisplay({ ...display, jobList: false })}
          footer={<DayNote date={date} dayNote={data.dayNote} canEdit={!readOnly && data.canEditDayNote} onSave={(note) => saveDayNote.mutateAsync(note)} />} />}
      </Box>
      {/* Phone drawer: quick days, filters, display, EPS actions. */}
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
            <DisplayOptions value={display} onChange={setDisplay} exclude={hidden} />
            {isFiltered && <Button startIcon={<FilterAltOffOutlined fontSize="small" />} onClick={clearFilters} sx={{ ml: "auto" }}>Clear filters</Button>}
          </Stack>
          {epsActions}
        </Stack>
      </Drawer>}
      {/* Phone: the job list + day note get their own drawer (opened from the Jobs button on the map). */}
      {phone && <Drawer anchor="bottom" open={listOpen} onClose={() => setListOpen(false)}
        slotProps={{ paper: { sx: { maxHeight: "75dvh", borderTopLeftRadius: 16, borderTopRightRadius: 16, display: "flex", flexDirection: "column" } } }}>
        <CoordinationJobList embedded header={legend} filtered={isFiltered} items={items} contractors={data.contractors} itemTypes={itemTypes} clashCodes={clashCodes} selectedId={selectedId}
          onSelect={(id) => { setListOpen(false); selectItem(id); }} onCollapse={() => setListOpen(false)}
          footer={<DayNote date={date} dayNote={data.dayNote} canEdit={!readOnly && data.canEditDayNote} onSave={(note) => saveDayNote.mutateAsync(note)} />} />
      </Drawer>}
      {/* Admin-only route line drawing, right on today's map (33 kV sections, etc.). */}
      <SectionDrawDialog open={sectionDrawOpen} onClose={() => setSectionDrawOpen(false)} projectId={ed.activeProject}
        maps={data.maps} sections={data.sections} initialMapId={(activeMap ?? data.map).id} />
    </Box>
  );
}
