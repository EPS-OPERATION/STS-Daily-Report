import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
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
import { useMemo, type ReactNode } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { PageHeader } from "@/components/ui/page-header.js";
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
  useDailyRequests,
} from "@/features/daily-reports/index.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";
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
  const dayCol = (d: string) => (isRange ? [dayjs(d).format("ddd D MMM")] : []);
  const dayHead = isRange ? ["Date"] : [];
  const inspections = allInspections.filter(keep);
  const loadError = [week.error, rfi.error].find((e) => e instanceof HttpError) as HttpError | undefined;
  const forecasts = allForecasts.filter(keep);

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

      <ToggleButtonGroup
        exclusive
        size="small"
        value={view}
        onChange={(_, v: View | null) => v && setView(v)}
        aria-label="มุมมอง Daily Request"
        sx={{ mb: 2.5, bgcolor: "background.paper" }}
      >
        <ToggleButton value="requests" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <AssignmentOutlinedIcon fontSize="small" />
          คำขอประจำวัน
          {clashingRoads.length > 0 ? (
            <Chip size="small" color="error" label={`เส้นทางทับซ้อน ${clashingRoads.length}`} sx={{ height: 20, ml: 0.5 }} />
          ) : null}
        </ToggleButton>
        <ToggleButton value="plan" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <EventNoteOutlinedIcon fontSize="small" />
          Tomorrow Forecast Activities{data ? ` (${forecasts.length})` : ""}
        </ToggleButton>
      </ToggleButtonGroup>

      {view === "plan" ? (
        loadError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            โหลดข้อมูลไม่สำเร็จ: {loadError.message}
          </Alert>
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
        <Alert severity="error" sx={{ mb: 2 }}>
          โหลดข้อมูลไม่สำเร็จ: {loadError.message}
        </Alert>
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
              ตรวจสอบในตาราง Road usage (แถวสีแดง) แล้วจัดคิวในที่ประชุมประสานงาน
            </Alert>
          ) : null}
          <Typography variant="body2" color="text.secondary">
            {machines.length} machine · {equipment.length} equipment · {roads.length} road · {inspections.length} RFI
          </Typography>

          <Section title="Machine request">
            <SimpleTable
              empty="ไม่มีการจองเครื่องจักร"
              head={[...dayHead, "Machine", "Building", "Contractor", "Time", "วัตถุประสงค์"]}
              rows={machines.map((m) => ({
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

          <Section title="Equipment request">
            <SimpleTable
              empty="ไม่มีการขอเครื่องมือ/อุปกรณ์"
              head={[...dayHead, "Equipment", "Qty", "Building", "Contractor", "วัตถุประสงค์"]}
              rows={equipment.map((e) => ({
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

          <Section title="Road usage">
            <SimpleTable
              empty="ไม่มีการขอใช้/ปิดถนน"
              head={[...dayHead, "Road / lane", "Time", "Contractor", "Next to", "วัตถุประสงค์"]}
              rows={roads.map((r) => ({
                key: r.id,
                tone: r.conflict ? ("error" as const) : undefined,
                cells: [
                  ...dayCol(r.targetDate),
                  <Stack key="r" direction="row" spacing={0.75} alignItems="center">
                    <b>{r.roadLocation}</b>
                    {r.conflict ? <Chip size="small" color="error" label="ชนกัน" sx={{ height: 20 }} /> : null}
                  </Stack>,
                  `${r.startTime}–${r.endTime}`,
                  <ContractorBadge key="c" code={r.contractorCode} />,
                  r.buildingName,
                  r.purpose,
                ],
              }))}
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
              head={[...dayHead, "Type", "Time", "Contractor", "Work item", "Building"]}
              rows={inspections.map((r) => ({
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
}: {
  head: string[];
  rows: { key: string; tone?: "error" | "warning"; cells: ReactNode[] }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        {empty}
      </Typography>
    );
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
