import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
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
import { PERMIT_TYPES } from "@sts/shared";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { PageHeader } from "@/components/ui/page-header.js";
import {
  ContractorBadge,
  TomorrowAgenda,
  addDaysIso,
  inspectionTypeLabel,
  sortAgenda,
  timeWindowLabel,
  todayIso,
  useInspectionRequests,
  useDailyRequests,
  type AgendaRow,
} from "@/features/daily-reports/index.js";
import { useSiteDay } from "@/features/site-plan/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type View = "requests" | "plan";

// Daily Request: everything contractors asked for on the selected day or date range
// (sent the evening before) — machines, equipment, road usage and QAQC inspections (RFI).
// The second view is tomorrow's plan: the same requests plus planned work, as one agenda
// for the 17:00 coordination meeting.
export function TodayRequestsPage() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get("view") === "plan" ? "plan" : "requests";
  // Range from the URL; an old ?date= link still works as a one-day range.
  const single = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : todayIso();
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : single;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const isRange = from !== to;
  const { projectId } = useCurrentProject();
  const week = useDailyRequests(projectId, from, to);
  const rfi = useInspectionRequests(projectId, { from, to, by: "inspection" });

  // Tomorrow's plan is always "today + 1", independent of the date range above.
  const tomorrow = addDaysIso(todayIso(), 1);
  const planRequests = useDailyRequests(projectId, tomorrow, tomorrow);
  const planInspections = useInspectionRequests(projectId, { from: tomorrow, to: tomorrow, by: "inspection" });
  const planDay = useSiteDay(projectId, tomorrow, tomorrow);
  const agenda: AgendaRow[] = useMemo(() => {
    const rows: AgendaRow[] = [];
    const req = planRequests.data?.data;
    for (const m of req?.machinery ?? []) {
      rows.push({
        id: `machine-${m.id}`,
        kind: "machine",
        startTime: m.startTime ?? "",
        timeLabel: timeWindowLabel(m.startTime, m.endTime),
        contractorCode: m.contractorCode,
        contractorName: null,
        buildingCode: m.buildingCode,
        buildingName: m.buildingName,
        title: `${m.machineType}${m.unitTag ? ` (${m.unitTag})` : ""}`,
        detail: m.purpose,
        clash: m.conflict === "conflict",
      });
    }
    for (const e of req?.equipmentRequests ?? []) {
      rows.push({
        id: `equipment-${e.id}`,
        kind: "equipment",
        startTime: "",
        timeLabel: timeWindowLabel(null, null),
        contractorCode: e.contractorCode,
        contractorName: null,
        buildingCode: e.buildingCode,
        buildingName: e.buildingName,
        title: `${e.equipmentType} ×${e.qty}`,
        detail: e.purpose,
        clash: false,
      });
    }
    for (const r of req?.roads ?? []) {
      rows.push({
        id: `road-${r.id}`,
        kind: "road",
        startTime: r.startTime,
        timeLabel: `${r.startTime}–${r.endTime}`,
        contractorCode: r.contractorCode,
        contractorName: null,
        buildingCode: r.buildingCode,
        buildingName: r.buildingName,
        title: r.roadLocation,
        detail: r.purpose,
        clash: r.conflict,
      });
    }
    for (const i of (planInspections.data?.data ?? []).filter((x) => x.status !== "draft")) {
      rows.push({
        id: `rfi-${i.id}`,
        kind: "rfi",
        startTime: i.inspectionTime,
        timeLabel: i.inspectionTime,
        contractorCode: i.contractorCode,
        contractorName: i.contractorName,
        buildingCode: i.buildingCode,
        buildingName: i.buildingName,
        title: i.inspectionType && i.inspectionType !== "other" ? `${inspectionTypeLabel(i.inspectionType)} · ${i.workItem}` : i.workItem,
        detail: i.location,
        clash: false,
      });
    }
    for (const b of planDay.data?.data?.buildings ?? []) {
      b.permits.forEach((p, idx) => {
        const label = PERMIT_TYPES.find((t) => t.code === p.permitType)?.label ?? p.permitType;
        rows.push({
          id: `permit-${b.id}-${p.permitType}-${idx}`,
          kind: "permit",
          startTime: "",
          timeLabel: timeWindowLabel(null, null),
          contractorCode: null,
          contractorName: null,
          buildingCode: b.code,
          buildingName: b.name,
          title: label,
          detail: `${p.workers} คน`,
          clash: false,
        });
      });
      b.activities.forEach((a, idx) => {
        rows.push({
          id: `work-${b.id}-${a.contractorCode}-${idx}`,
          kind: "work",
          startTime: "",
          timeLabel: timeWindowLabel(null, null),
          contractorCode: a.contractorCode,
          contractorName: a.contractorName,
          buildingCode: b.code,
          buildingName: b.name,
          title: a.workDescription,
          detail: `${a.headcount} คน${a.startTime && a.endTime ? ` · ${a.startTime}–${a.endTime}` : ""}${a.planPercent === null ? "" : ` · แผน ${a.planPercent}%`}`,
          clash: false,
        });
      });
    }
    return sortAgenda(rows);
  }, [planRequests.data, planInspections.data, planDay.data]);
  const planLoading = !planRequests.data || !planInspections.data || !planDay.data;
  const planError = [planRequests.error, planInspections.error, planDay.error].find((e) => e instanceof HttpError) as
    | HttpError
    | undefined;

  const data = week.data?.data;
  const machines = data?.machinery ?? [];
  const equipment = data?.equipmentRequests ?? [];
  const roads = data?.roads ?? [];
  // In a range every row needs its date; one day stays uncluttered.
  const dayCol = (d: string) => (isRange ? [dayjs(d).format("ddd D MMM")] : []);
  const dayHead = isRange ? ["Date"] : [];
  const inspections = (rfi.data?.data ?? []).filter((r) => r.status !== "draft");
  const loadError = [week.error, rfi.error].find((e) => e instanceof HttpError) as HttpError | undefined;

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
            ? "แผนงานและคำขอทั้งหมดของพรุ่งนี้ในที่เดียว — ใช้ในประชุมประสานงานประจำวัน"
            : "คำขอประจำวันจากผู้รับเหมา (ส่งในรายงานบ่ายของวันก่อน) — เครื่องจักร อุปกรณ์ ถนน และ QAQC"
        }
        actions={view === "requests" ? <DateRangeFields from={from} to={to} maxDays={62} onChange={setRange} /> : undefined}
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
        </ToggleButton>
        <ToggleButton value="plan" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <EventNoteOutlinedIcon fontSize="small" />
          แผนงานพรุ่งนี้{planLoading ? "" : ` (${agenda.length})`}
        </ToggleButton>
      </ToggleButtonGroup>

      {view === "plan" ? (
        planError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            โหลดข้อมูลไม่สำเร็จ: {planError.message}
          </Alert>
        ) : planLoading ? (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="rounded" height={240} />
          </Stack>
        ) : (
          <TomorrowAgenda tomorrow={tomorrow} rows={agenda} />
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
                cells: [
                  ...dayCol(r.targetDate),
                  <b key="r">{r.roadLocation}</b>,
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
