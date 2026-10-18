import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useMemo, useState, type ReactNode } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { EmptySection } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import {
  ContractorBadge,
  ContractorFilterPopover,
  ForecastHistory,
  contractorColorMap,
  addDaysIso,
  formatThaiDate,
  inspectionTypeLabel,
  timeWindowLabel,
  todayIso,
  useInspectionRequests,
  RoadStatusChip,
  RoadTimeDialog,
  RoadTimelines,
  useAdjustRoadUsage,
  useDailyRequests,
} from "@/features/daily-reports/index.js";
import { ExportButtons } from "@/features/daily-reports/components/export-buttons.js";
import { downloadCsv, printSections, type ExportSection } from "@/features/daily-reports/utils/report-export.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";
import { useMe } from "@/features/auth/index.js";
import { isEpsStaff, roadPlacesMeet } from "@sts/shared";
import { toast } from "sonner";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type View = "requests" | "plan";

// Daily Request: everything contractors asked for on the selected day or date range
// (sent the evening before) — machines, equipment, road usage and QAQC inspections (RFI).
// The second view is the Tomorrow Forecast Activities history (paper form R003) for the
// same date range. Road bookings that clash between contractors are flagged red (warn only).
export function TodayRequestsPage() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get("view") === "plan" ? "plan" : "requests";
  // Range from the URL; an old ?date= link still works as a one-day range.
  // Forecasts are about tomorrow, so that view opens on tomorrow when no range is given.
  const fallback = view === "plan" ? addDaysIso(todayIso(), 1) : todayIso();
  const single = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : fallback;
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : single;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const isRange = from !== to;
  const { projectId } = useCurrentProject();
  const projectContractors = useProjectContractors(projectId).data?.data ?? [];
  const week = useDailyRequests(projectId, from, to);
  const rfi = useInspectionRequests(projectId, { from, to, by: "inspection" });

  const data = week.data?.data;
  const allMachines = useMemo(() => data?.machinery ?? [], [data]);
  const allEquipment = useMemo(() => data?.equipmentRequests ?? [], [data]);
  const allRoads = useMemo(() => data?.roads ?? [], [data]);
  const allForecasts = useMemo(() => data?.forecasts ?? [], [data]);
  const allInspections = useMemo(() => (rfi.data?.data ?? []).filter((r) => r.status !== "draft"), [rfi.data]);
  const me = useMe();
  const canEdit = isEpsStaff(me.data?.data.user.role);
  const adjustRoad = useAdjustRoadUsage(projectId);
  // EPS only: the booking whose time is being settled.
  const [editing, setEditing] = useState<(typeof allRoads)[number] | null>(null);

  // Contractor filter (same popover as Manpower): everyone with a request or forecast in the range.
  // ?contractors=A,B in the URL; absent = all. Road clashes stay flagged even when the other side is hidden.
  const contractorNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of projectContractors) {
      if (c.code) m.set(c.code, c.name);
    }
    for (const r of [...allMachines, ...allEquipment, ...allRoads, ...allForecasts, ...allInspections]) {
      const name = "contractorName" in r && r.contractorName ? r.contractorName : undefined;
      if (name || !m.has(r.contractorCode)) m.set(r.contractorCode, name ?? m.get(r.contractorCode) ?? "");
    }
    return m;
  }, [projectContractors, allMachines, allEquipment, allRoads, allForecasts, allInspections]);

  const activeCodes = useMemo(() => {
    const set = new Set<string>();
    for (const r of [...allMachines, ...allEquipment, ...allRoads, ...allForecasts, ...allInspections]) {
      set.add(r.contractorCode);
    }
    return set;
  }, [allMachines, allEquipment, allRoads, allForecasts, allInspections]);

  const allCodes = useMemo(() => {
    const codes = activeCodes.size > 0 ? [...activeCodes] : projectContractors.map((c) => c.code);
    return codes.sort((a, b) => a.localeCompare(b));
  }, [activeCodes, projectContractors]);

  const selectedCodes = useMemo<Set<string>>(() => {
    const raw = params.get("contractors");
    if (raw === null) return new Set(allCodes);
    return new Set(raw.split(",").map((c) => c.trim()).filter((c) => allCodes.includes(c)));
  }, [params, allCodes]);
  const keep = (r: { contractorCode: string }) => selectedCodes.has(r.contractorCode);
  const machines = allMachines.filter(keep);
  const equipment = allEquipment.filter(keep);
  const roads = allRoads.filter(keep);
  // In a range every row needs its date; one day stays uncluttered.
  const dayCol = (_d: string): ReactNode[] => [];
  const dayHead: string[] = [];
  const inspections = allInspections.filter(keep);
  const loadError = [week.error, rfi.error].find((e) => e instanceof HttpError) as HttpError | undefined;
  const forecasts = allForecasts.filter(keep);
  // Print / CSV: every request in the range for the chosen contractors, one table per kind.
  const who = (r: { contractorCode: string; contractorName?: string }) => `${r.contractorCode} ${r.contractorName ?? contractorNames.get(r.contractorCode) ?? ""}`.trim();
  // The evening form no longer asks for machines/equipment: their blocks only show when older requests fall in range.
  const hasMachines = machines.length > 0;
  const hasEquipment = equipment.length > 0;
  const requestSections = (): ExportSection[] => [
    ...(hasMachines ? [{ title: "เครื่องจักร (Machinery)", head: ["วันที่", "ผู้รับเหมา", "เครื่องจักร", "หมายเลข", "เวลา", "พื้นที่", "วัตถุประสงค์"],
      rows: machines.map((m) => [m.targetDate, who(m), m.machineType, m.unitTag, m.startTime && m.endTime ? `${m.startTime}–${m.endTime}` : "ทั้งวัน", `${m.buildingCode} ${m.buildingName}`, m.purpose]) }] : []),
    ...(hasEquipment ? [{ title: "อุปกรณ์ (Equipment)", head: ["วันที่", "ผู้รับเหมา", "อุปกรณ์", "จำนวน", "พื้นที่", "วัตถุประสงค์"],
      rows: equipment.map((e) => [e.targetDate, who(e), e.equipmentType, e.qty, `${e.buildingCode} ${e.buildingName}`, e.purpose]) }] : []),
    { title: "ขอใช้ / ปิดถนน (Road usage)", head: ["วันที่", "ผู้รับเหมา", "ถนน", "เวลา", "วัตถุประสงค์", "สถานะ"],
      rows: roads.map((r) => [r.targetDate, who(r), r.roadLocation, `${r.startTime}–${r.endTime}`, r.purpose, [r.conflict ? "ชนกัน" : "", r.adjusted ? `EPS ปรับเวลา (ขอ ${r.requestedStartTime}–${r.requestedEndTime})` : ""].filter(Boolean).join(" · ")]) },
    { title: "QAQC (ขอตรวจ)", head: ["วันที่ตรวจ", "เวลา", "ผู้รับเหมา", "ประเภท", "งาน", "พื้นที่", "สถานะ", "ผล"],
      rows: inspections.map((i) => [i.inspectionDate, i.inspectionTime, who(i), i.inspectionType, i.workItem, [`${i.buildingCode} ${i.buildingName}`, i.location].filter(Boolean).join(" · "), i.status, i.result]) },
  ];
  // A range (up to 62 days) is shown as an overview of its days; one day is opened in detail (?day=YYYY-MM-DD).
  const [clashOnly, setClashOnly] = useState(false);
  const dayRows = useMemo(() => {
    const byDay = new Map<string, { date: string; machines: number; equipment: number; roads: number; clashes: number; rfi: number }>();
    const at = (date: string) => {
      const found = byDay.get(date) ?? { date, machines: 0, equipment: 0, roads: 0, clashes: 0, rfi: 0 };
      byDay.set(date, found);
      return found;
    };
    for (const m of machines) at(m.targetDate).machines += 1;
    for (const e of equipment) at(e.targetDate).equipment += 1;
    for (const r of roads) {
      const day = at(r.targetDate);
      day.roads += 1;
      if (r.conflict) day.clashes += 1;
    }
    for (const i of inspections) at(i.inspectionDate).rfi += 1;
    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [machines, equipment, roads, inspections]);
  const shownDays = clashOnly ? dayRows.filter((d) => d.clashes > 0) : dayRows;
  const requestedDay = params.get("day");
  const selectedDay =
    shownDays.find((d) => d.date === requestedDay)?.date ??
    shownDays.find((d) => d.clashes > 0)?.date ??
    shownDays[0]?.date ??
    from;
  const dayIndex = shownDays.findIndex((d) => d.date === selectedDay);
  const setDay = (date: string) => {
    const p = new URLSearchParams(params);
    p.set("day", date);
    setParams(p, { replace: true });
  };
  const dayMachines = isRange ? machines.filter((m) => m.targetDate === selectedDay) : machines;
  const dayEquipment = isRange ? equipment.filter((e) => e.targetDate === selectedDay) : equipment;
  const dayRoads = isRange ? roads.filter((r) => r.targetDate === selectedDay) : roads;
  const dayInspections = isRange ? inspections.filter((i) => i.inspectionDate === selectedDay) : inspections;
  const dayAllRoads = isRange ? allRoads.filter((r) => r.targetDate === selectedDay) : allRoads;

  const colors = useMemo(() => contractorColorMap(allCodes), [allCodes]);
  const filterItems = allCodes.map((code) => {
    const n =
      view === "plan"
        ? allForecasts.filter((r) => r.contractorCode === code).length
        : [...allMachines, ...allEquipment, ...allRoads, ...allInspections].filter((r) => r.contractorCode === code).length;
    return { code, name: contractorNames.get(code), color: colors.get(code) ?? "#999", countLabel: `${n} รายการ` };
  });
  const setContractors = (next: Set<string>) => {
    const p = new URLSearchParams(params);
    if (next.size === allCodes.length) p.delete("contractors");
    else p.set("contractors", [...next].sort().join(","));
    setParams(p, { replace: true });
  };
  // Pairs of clashing road bookings (warn only — sorted out at the coordination meeting).
  const clashingRoads = roads.filter((r) => r.conflict);
  const rangeLabel = isRange ? `${formatThaiDate(from)} – ${formatThaiDate(to)}` : formatThaiDate(from);

  const setView = (next: View) => {
    const p = new URLSearchParams(params);
    if (next === "plan") p.set("view", "plan");
    else p.delete("view");
    setParams(p, { replace: true });
  };

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.delete("date");
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };

  return (
    <Box>
      <PageHeader
        title="Daily Request"
        subtitle={
          view === "plan"
            ? "ประวัติแผนงานล่วงหน้าที่ผู้รับเหมาแจ้งไว้ (Tomorrow Forecast Activities) — เลือกช่วงวันที่ได้"
            : "คำขอประจำวันจากผู้รับเหมา (ส่งในรายงานบ่ายของวันก่อน) — เครื่องจักร อุปกรณ์ ถนน และ QAQC"
        }
        actions={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <DateRangeFields from={from} to={to} maxDays={62} onChange={setRange} />
            {allCodes.length > 0 ? <ContractorFilterPopover items={filterItems} selectedCodes={selectedCodes} onChange={setContractors} /> : null}
          </Stack>
        }
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 2.5 }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={view}
        onChange={(_, v: View | null) => v && setView(v)}
        aria-label="Daily Request view"
        sx={{ bgcolor: "background.paper", alignSelf: "flex-start" }}
      >
        <ToggleButton value="requests" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <AssignmentOutlinedIcon fontSize="small" />
          คำขอประจำวัน
          {clashingRoads.length > 0 ? (
            <Chip size="small" color="error" label={`Road clashes ${clashingRoads.length}`} sx={{ height: 20, ml: 0.5 }} />
          ) : null}
        </ToggleButton>
        <ToggleButton value="plan" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <EventNoteOutlinedIcon fontSize="small" />
          Tomorrow Forecast Activities{data ? ` (${forecasts.length})` : ""}
        </ToggleButton>
      </ToggleButtonGroup>
      {view === "requests" ? (
        <ExportButtons
          disabled={!data || machines.length + equipment.length + roads.length + inspections.length === 0}
          onPrint={() => printSections("Daily Request — คำขอประจำวัน", `${rangeLabel} · ผู้รับเหมา ${selectedCodes.size === allCodes.length ? "ทั้งหมด" : [...selectedCodes].join(", ")}`, requestSections())}
          onCsv={() => downloadCsv(`STS_Daily_Request_${isRange ? `${from}_${to}` : from}.csv`, requestSections())}
        />
      ) : null}
      </Stack>

      {view === "plan" ? (
        loadError ? (
          <QueryError error={loadError} onRetry={() => { void week.refetch(); void rfi.refetch(); }} />
        ) : !data ? (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="rounded" height={240} />
          </Stack>
        ) : (
          <ForecastHistory rows={forecasts} rangeLabel={rangeLabel} fileTag={isRange ? `${from}_${to}` : from} />
        )
      ) : null}

      {view === "requests" && loadError ? (
        <QueryError error={loadError} onRetry={() => { void week.refetch(); void rfi.refetch(); }} />
      ) : null}

      {view !== "requests" ? null : !data || !rfi.data ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={140} />
          <Skeleton variant="rounded" height={140} />
        </Stack>
      ) : (
        <Stack spacing={3}>
          {clashingRoads.length > 0 ? (
            <Alert severity="error">
              <b>มีการขอใช้เส้นทางทับซ้อนกัน {clashingRoads.length} รายการ</b> — ผู้รับเหมาต่างรายขอใช้ถนนเดียวกันในช่วงเวลาที่ทับกัน
              ตรวจสอบในตาราง Road usage (แถวสีแดง) แล้วปรับเวลาจากปุ่มแก้เวลา หรือจัดคิวในที่ประชุมประสานงาน
            </Alert>
          ) : null}
          <Typography variant="body2" color="text.secondary">
            {[hasMachines && `${machines.length} machine`, hasEquipment && `${equipment.length} equipment`, `${roads.length} road`, `${inspections.length} RFI`]
              .filter(Boolean)
              .join(" · ")}
          </Typography>
          {isRange ? (
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>ภาพรวมรายวัน</Typography>
                <Typography variant="caption" color="text.secondary">{dayRows.length} วันที่มีคำขอ</Typography>
                <Box sx={{ flex: 1 }} />
                <Chip
                  size="small"
                  color={clashOnly ? "error" : "default"}
                  variant={clashOnly ? "filled" : "outlined"}
                  label="Clashing days only"
                  onClick={() => setClashOnly((v) => !v)}
                />
              </Stack>
              {shownDays.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 2 }}>ไม่มีคำขอในช่วงนี้</Typography>
              ) : (
                <Table size="small" aria-label="Daily overview">
                  <TableHead>
                    <TableRow>
                      <TableCell>วันที่</TableCell>
                      {hasMachines ? <TableCell align="right">เครื่องจักร</TableCell> : null}
                      {hasEquipment ? <TableCell align="right">เครื่องมือ</TableCell> : null}
                      <TableCell align="right">ถนน</TableCell>
                      <TableCell align="right">ชนกัน</TableCell>
                      <TableCell align="right">RFI</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shownDays.map((d) => (
                      <TableRow
                        key={d.date}
                        hover
                        selected={d.date === selectedDay}
                        tabIndex={0}
                        aria-current={d.date === selectedDay ? "true" : undefined}
                        onClick={() => setDay(d.date)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setDay(d.date);
                        }}
                        sx={{ cursor: "pointer", fontVariantNumeric: "tabular-nums" }}
                      >
                        <TableCell>{dayjs(d.date).format("ddd D MMM")}</TableCell>
                        {hasMachines ? <TableCell align="right">{d.machines}</TableCell> : null}
                        {hasEquipment ? <TableCell align="right">{d.equipment}</TableCell> : null}
                        <TableCell align="right">{d.roads}</TableCell>
                        <TableCell align="right">
                          {d.clashes > 0 ? <Chip size="small" color="error" label={d.clashes} sx={{ height: 20 }} /> : "—"}
                        </TableCell>
                        <TableCell align="right">{d.rfi}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          ) : null}
          {isRange && shownDays.length > 0 ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton aria-label="Previous day" disabled={dayIndex <= 0} onClick={() => setDay(shownDays[dayIndex - 1]!.date)}>
                <ChevronLeftOutlinedIcon />
              </IconButton>
              <Typography variant="h4">{formatThaiDate(selectedDay)}</Typography>
              <IconButton
                aria-label="Next day"
                disabled={dayIndex < 0 || dayIndex >= shownDays.length - 1}
                onClick={() => setDay(shownDays[dayIndex + 1]!.date)}
              >
                <ChevronRightOutlinedIcon />
              </IconButton>
            </Stack>
          ) : null}

          {hasMachines ? (
          <Section title="Machine request">
            <SimpleTable
              empty="ไม่มีการจองเครื่องจักร"
              emptyIcon={<PrecisionManufacturingOutlinedIcon />}
              head={[...dayHead, "Machine", "Building", "Contractor", "Time", "วัตถุประสงค์"]}
              rows={dayMachines.map((m) => ({
                key: m.id,
                cells: [
                  ...dayCol(m.targetDate),
                  <b key="m">{m.machineType}</b>,
                  m.buildingName,
                  <ContractorBadge key="c" code={m.contractorCode} />,
                  timeWindowLabel(m.startTime, m.endTime),
                  m.purpose ?? "—",
                ],
              }))}
            />
          </Section>
          ) : null}

          {hasEquipment ? (
          <Section title="Equipment request">
            <SimpleTable
              empty="ไม่มีการขอเครื่องมือ/อุปกรณ์"
              emptyIcon={<HandymanOutlinedIcon />}
              head={[...dayHead, "Equipment", "Qty", "Building", "Contractor", "วัตถุประสงค์"]}
              rows={dayEquipment.map((e) => ({
                key: e.id,
                cells: [
                  ...dayCol(e.targetDate),
                  <b key="e">{e.equipmentType}</b>,
                  e.qty,
                  e.buildingName,
                  <ContractorBadge key="c" code={e.contractorCode} />,
                  e.purpose ?? "—",
                ],
              }))}
            />
          </Section>
          ) : null}

          <Section title="Road usage">
            <RoadTimelines
              allRoads={dayAllRoads}
              visibleIds={new Set(dayRoads.map((r) => r.id))}
              canEdit={canEdit}
              onEdit={setEditing}
            />
            <SimpleTable
              empty="ไม่มีการขอใช้/ปิดถนน"
              emptyIcon={<RouteOutlinedIcon />}
              head={[...dayHead, "Road / lane", "Time", "Contractor", "Next to", "วัตถุประสงค์", ...(canEdit ? [""] : [])]}
              rows={dayRoads.map((r) => ({
                key: r.id,
                tone: r.conflict ? ("error" as const) : undefined,
                cells: [
                  ...dayCol(r.targetDate),
                  <Stack key="r" direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                    <b>{r.roadLocation}</b>
                    <RoadStatusChip clash={r.conflict} adjusted={r.adjusted} />
                  </Stack>,
                  r.adjusted ? (
                    <span key="t" style={{ fontVariantNumeric: "tabular-nums" }}>
                      <s>{r.requestedStartTime}–{r.requestedEndTime}</s> <b>{r.startTime}–{r.endTime}</b>
                    </span>
                  ) : (
                    `${r.startTime}–${r.endTime}`
                  ),
                  <ContractorBadge key="c" code={r.contractorCode} />,
                  r.buildingName,
                  r.purpose,
                  ...(canEdit
                    ? [
                        <IconButton key="e" size="small" aria-label={`Edit time ${r.contractorCode} ${r.roadLocation}`} onClick={() => setEditing(r)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>,
                      ]
                    : []),
                ],
              }))}
            />
            <RoadTimeDialog
              key={editing?.id ?? "none"}
              road={editing}
              bookings={
                editing
                  ? allRoads.filter(
                      (r) => r.targetDate === editing.targetDate && (r.id === editing.id || roadPlacesMeet(r, editing)),
                    )
                  : []
              }
              saving={adjustRoad.isPending}
              error={adjustRoad.isError ? (adjustRoad.error instanceof HttpError ? adjustRoad.error.message : "บันทึกเวลาไม่สำเร็จ") : null}
              onClose={() => {
                setEditing(null);
                adjustRoad.reset();
              }}
              onSave={(startTime, endTime) => {
                if (!editing) return;
                adjustRoad.mutate(
                  { id: editing.id, startTime, endTime },
                  { onSuccess: () => { toast.success("บันทึกเวลาแล้ว"); setEditing(null); } },
                );
              }}
              onRestore={() => {
                if (!editing) return;
                adjustRoad.mutate(
                  { id: editing.id, startTime: editing.requestedStartTime, endTime: editing.requestedEndTime },
                  { onSuccess: () => { toast.success("คืนเวลาที่ขอแล้ว"); setEditing(null); } },
                );
              }}
            />
          </Section>

          <Section
            title="QAQC inspections"
            action={
              <Link component={RouterLink} to="/qaqc" underline="always" variant="body2">
                Open QAQC board
              </Link>
            }
          >
            <SimpleTable
              empty="ไม่มีคำขอตรวจ"
              emptyIcon={<FactCheckOutlinedIcon />}
              head={[...dayHead, "Type", "Time", "Contractor", "Work item", "Building"]}
              rows={dayInspections.map((r) => ({
                key: r.id,
                cells: [
                  ...dayCol(r.inspectionDate),
                  "RFI",
                  r.inspectionTime,
                  <b key="c">{r.contractorName}</b>,
                  r.inspectionType && r.inspectionType !== "other"
                    ? `${inspectionTypeLabel(r.inspectionType)} · ${r.workItem}`
                    : r.workItem,
                  r.buildingCode,
                ],
              }))}
            />
          </Section>
        </Stack>
      )}

    </Box>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Box>
      <Stack direction="row" alignItems="baseline" spacing={2} sx={{ mb: 1 }}>
        <Typography variant="h4">{title}</Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

function SimpleTable({
  head,
  rows,
  empty,
  emptyIcon,
}: {
  head: string[];
  rows: { key: string; tone?: "error" | "warning"; cells: ReactNode[] }[];
  empty: string;
  emptyIcon?: ReactNode;
}) {
  if (rows.length === 0) {
    return <EmptySection dense icon={emptyIcon ?? <InboxOutlinedIcon />} title={empty} />;
  }
  return (
    <Box sx={{ overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
      <Table size="small" sx={{ minWidth: 640 }}>
        <TableHead>
          <TableRow>
            {head.map((h) => (
              <TableCell key={h} sx={{ color: "text.secondary", bgcolor: "grey.50" }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key} sx={{ bgcolor: r.tone === "error" ? "error.light" : r.tone === "warning" ? "warning.light" : undefined }}>
              {r.cells.map((c, i) => (
                <TableCell key={i}>{c}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
