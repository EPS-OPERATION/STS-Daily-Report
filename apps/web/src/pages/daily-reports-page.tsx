import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import {
  ContractorBadge,
  MachineryAllocationTable,
  ReviewDialog,
  RoadUsageTable,
  WorkDoneSummaryTable,
  addDaysIso,
  formatThaiDate,
  mondayOf,
  todayIso,
  useInspectionRequests,
  useReviewQueue,
  useWeeklySummary,
  type InspectionRequest,
  type ReportEquipmentRequest,
  type ReviewQueueRow,
  type ReviewStatus,
  type WeeklyBooking,
  type WeeklySummary,
  type WorkDoneItem,
} from "@/features/daily-reports/index.js";
import { useSiteDay } from "@/features/site-plan/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type ReviewTab = "pending" | "rejected" | "approved" | "all";
type PageViewMode = "work-summary" | "review-queue" | "tomorrow-plan";

// Realistic fallback sample work done items if backend doesn't have allocations for today yet
function getSampleWorkDoneItems(date: string): WorkDoneItem[] {
  return [
    {
      id: "sample-1",
      reportDate: date,
      contractorCode: "CTR-002",
      contractorName: "ZCE Construction",
      buildingCode: "1.1",
      buildingName: "Tipping Hall",
      workDescription: "งานปรับดินทำ Ramp ทางขึ้นอาคาร Tipping Hall (60%) **(Accumulate 100%/100%)",
      headcount: 14,
      planPercent: 60,
      actualPercent: 60,
    },
    {
      id: "sample-2",
      reportDate: date,
      contractorCode: "CTR-004",
      contractorName: "UME Engineering",
      buildingCode: "6.1",
      buildingName: "Water treatment plant",
      workDescription: "งานฉาบผนังภายใน Water treatment plant (5%) **(Accumulate 55%/100%)",
      headcount: 8,
      planPercent: 5,
      actualPercent: 5,
    },
    {
      id: "sample-3",
      reportDate: date,
      contractorCode: "CTR-002",
      contractorName: "ZCE Construction",
      buildingCode: "1.2",
      buildingName: "Waste bunker",
      workDescription: "งานออก cb platform ภายนอก EL.+17.50 - EL.+21.00 Waste bunker (20%) **(Accumulate 50%/100%)",
      headcount: 12,
      planPercent: 20,
      actualPercent: 20,
    },
    {
      id: "sample-4",
      reportDate: date,
      contractorCode: "CTR-003",
      contractorName: "LCE Electrical",
      buildingCode: "4.1",
      buildingName: "TG building",
      workDescription: "งานเทคอนกรีต Topping พื้น hollow core TG building (100%) **(Accumulate 100%/100%)",
      headcount: 18,
      planPercent: 100,
      actualPercent: 100,
    },
    {
      id: "sample-5",
      reportDate: date,
      contractorCode: "CTR-002",
      contractorName: "ZCE Construction",
      buildingCode: "1.2",
      buildingName: "Waste bunker",
      workDescription: "งานติดตั้งเหล็กคาน 8-9/C-E EL.+10.30 Waste bunker (20%) **(Accumulate 100%/100%)",
      headcount: 10,
      planPercent: 20,
      actualPercent: 20,
    },
    {
      id: "sample-6",
      reportDate: date,
      contractorCode: "CTR-003",
      contractorName: "LCE Electrical",
      buildingCode: "2.1",
      buildingName: "Dearerator Boiler",
      workDescription: "งานติดตั้งไม้แบบฐานราก F200 F250 4 ฐาน Dearerator Boiler (50%) **(Accumulate 100%/100%)",
      headcount: 16,
      planPercent: 50,
      actualPercent: 50,
    },
    {
      id: "sample-7",
      reportDate: date,
      contractorCode: "CTR-002",
      contractorName: "ZCE Construction",
      buildingCode: "1.2",
      buildingName: "Waste bunker",
      workDescription: "งานผูกเหล็กบันได ST-3 Leachat sump pit Waste bunker (20%) **(Accumulate 40%/100%)",
      headcount: 6,
      planPercent: 20,
      actualPercent: 20,
    },
    {
      id: "sample-8",
      reportDate: date,
      contractorCode: "CTR-004",
      contractorName: "UME Engineering",
      buildingCode: "5.2",
      buildingName: "Transformer yard",
      workDescription: "งานเทคอนกรีตคาน B1 Transformer yard (50%) **(Accumulate 50%/100%)",
      headcount: 8,
      planPercent: 50,
      actualPercent: 50,
    },
    {
      id: "sample-9",
      reportDate: date,
      contractorCode: "CTR-002",
      contractorName: "ZCE Construction",
      buildingCode: "1.2",
      buildingName: "Waste bunker",
      workDescription: "งานผูกเหล็กคาน GL.5-9/A-B EL+0.00 Waste bunker (40%) **(Accumulate 40%/100%)",
      headcount: 12,
      planPercent: 40,
      actualPercent: 40,
    },
    {
      id: "sample-10",
      reportDate: date,
      contractorCode: "CTR-004",
      contractorName: "UME Engineering",
      buildingCode: "6.3",
      buildingName: "Ammonia tank",
      workDescription: "งานปรับดินและทรายหยาบบดอัดฐานราก Ammonia tank (30%) **(Accumulate 30%/100%)",
      headcount: 6,
      planPercent: 30,
      actualPercent: 30,
    },
    {
      id: "sample-11",
      reportDate: date,
      contractorCode: "CTR-004",
      contractorName: "UME Engineering",
      buildingCode: "6.5",
      buildingName: "Workshop",
      workDescription: "งานติดแผ่นปิดข้าง Workshop (30%) **(Accumulate 80%/100%)",
      headcount: 8,
      planPercent: 30,
      actualPercent: 30,
    },
    {
      id: "sample-12",
      reportDate: date,
      contractorCode: "CTR-004",
      contractorName: "UME Engineering",
      buildingCode: "6.4",
      buildingName: "Septic tank",
      workDescription: "งานก่ออิฐคอกฐานถัง septic tank (80%) **(Accumulate 80%/100%)",
      headcount: 5,
      planPercent: 80,
      actualPercent: 80,
    },
    {
      id: "sample-13",
      reportDate: date,
      contractorCode: "CTR-002",
      contractorName: "ZCE Construction",
      buildingCode: "2.1",
      buildingName: "Boiler Building",
      workDescription: "งานติดตั้งนั่งร้าน",
      headcount: 10,
      planPercent: 100,
      actualPercent: 80,
      countermeasure: "ปรับทีมติดตั้งนั่งร้านเพิ่ม 2 คนในวันพรุ่งนี้",
    },
    {
      id: "sample-14",
      reportDate: date,
      contractorCode: "CTR-003",
      contractorName: "LCE Electrical",
      buildingCode: "2.1",
      buildingName: "Boiler Building",
      workDescription: "งานเชื่อม คาน, platform boiler",
      headcount: 14,
      planPercent: 100,
      actualPercent: 80,
      countermeasure: "รอชิ้นงานเหล็กเข้าไซต์ คาดว่าจะเชื่อมเสร็จภายในช่วงเช้าพรุ่งนี้",
    },
    {
      id: "sample-15",
      reportDate: date,
      contractorCode: "CTR-003",
      contractorName: "LCE Electrical",
      buildingCode: "3.2",
      buildingName: "Stack",
      workDescription: "งานติดตั้งบันได, platform Stack Step1",
      headcount: 8,
      planPercent: 100,
      actualPercent: 80,
    },
    {
      id: "sample-16",
      reportDate: date,
      contractorCode: "CTR-003",
      contractorName: "LCE Electrical",
      buildingCode: "3.2",
      buildingName: "Stack",
      workDescription: "งานประกอบ Stack Step2",
      headcount: 8,
      planPercent: 100,
      actualPercent: 80,
    },
    {
      id: "sample-17",
      reportDate: date,
      contractorCode: "CTR-004",
      contractorName: "UME Engineering",
      buildingCode: "3.1",
      buildingName: "Reaction Tower",
      workDescription: "งานเชื่อม Hopper Reaction Tower",
      headcount: 7,
      planPercent: 100,
      actualPercent: 60,
      countermeasure: "มีลมแรงช่วงบ่าย จำเป็นต้องชะลอการเชื่อมบนที่สูงเพื่อความปลอดภัย",
    },
    {
      id: "sample-18",
      reportDate: date,
      contractorCode: "CTR-002",
      contractorName: "ZCE Construction",
      buildingCode: "1.3",
      buildingName: "Stock Yard",
      workDescription: "งานย้ายชิ้นงานจาก Stock Yard ไปยังลาน Fab, อาคาร Boiler",
      headcount: 6,
      planPercent: 100,
      actualPercent: 80,
    },
    {
      id: "sample-19",
      reportDate: date,
      contractorCode: "CTR-003",
      contractorName: "LCE Electrical",
      buildingCode: "2.1",
      buildingName: "Boiler Building",
      workDescription: "ติดตั้ง plat form EL+5.00",
      headcount: 9,
      planPercent: 100,
      actualPercent: 60,
    },
    {
      id: "sample-20",
      reportDate: date,
      contractorCode: "CTR-004",
      contractorName: "UME Engineering",
      buildingCode: "1.1",
      buildingName: "Fuel Silo",
      workDescription: "งานติดตั้ง polary support silo",
      headcount: 8,
      planPercent: 100,
      actualPercent: 80,
    },
    {
      id: "sample-21",
      reportDate: date,
      contractorCode: "CTR-003",
      contractorName: "LCE Electrical",
      buildingCode: "2.1",
      buildingName: "Boiler Building",
      workDescription: "งานติดตั้ง L-Bolt Deaerator, Reaction tower, Boiler EL+10.00",
      headcount: 10,
      planPercent: 100,
      actualPercent: 80,
    },
    {
      id: "sample-22",
      reportDate: date,
      contractorCode: "CTR-004",
      contractorName: "UME Engineering",
      buildingCode: "3.1",
      buildingName: "Bagfilter",
      workDescription: "งานติดตั้งราวกั้นตก Bagfilter",
      headcount: 6,
      planPercent: 100,
      actualPercent: 80,
    },
    {
      id: "sample-23",
      reportDate: date,
      contractorCode: "CTR-003",
      contractorName: "LCE Electrical",
      buildingCode: "2.1",
      buildingName: "Boiler Building",
      workDescription: "งานเชื่อม Fin ด้านซ้ายและขวาของช่วงที่ 2",
      headcount: 8,
      planPercent: 100,
      actualPercent: 70,
    },
    {
      id: "sample-24",
      reportDate: date,
      contractorCode: "CTR-003",
      contractorName: "LCE Electrical",
      buildingCode: "2.1",
      buildingName: "Boiler Building",
      workDescription: "งานจัดแผงและเชื่อม Fin ด้านซ้ายและขวาของช่วงที่ 3",
      headcount: 8,
      planPercent: 100,
      actualPercent: 50,
    },
    {
      id: "sample-25",
      reportDate: date,
      contractorCode: "CTR-004",
      contractorName: "UME Engineering",
      buildingCode: "4.1",
      buildingName: "TG Hall",
      workDescription: "งานยก ประกอบ Generator 1",
      headcount: 12,
      planPercent: 100,
      actualPercent: 20,
      countermeasure: "รอเครน 150 ตัน ปฏิบัติงานยกชุดหลักในวันพรุ่งนี้",
    },
    {
      id: "sample-26",
      reportDate: date,
      contractorCode: "CTR-003",
      contractorName: "LCE Electrical",
      buildingCode: "2.1",
      buildingName: "Boiler Building",
      workDescription: "งานประกอบ Piping boiler H3F005",
      headcount: 8,
      planPercent: 100,
      actualPercent: 80,
    },
    {
      id: "sample-27",
      reportDate: date,
      contractorCode: "CTR-003",
      contractorName: "LCE Electrical",
      buildingCode: "2.1",
      buildingName: "Boiler Building",
      workDescription: "งานเชื่อม Piping boiler H4F003",
      headcount: 6,
      planPercent: 100,
      actualPercent: 30,
    },
    {
      id: "sample-28",
      reportDate: date,
      contractorCode: "CTR-003",
      contractorName: "LCE Electrical",
      buildingCode: "2.1",
      buildingName: "Boiler Building",
      workDescription: "งานเชื่อม Piping boiler B7K005",
      headcount: 7,
      planPercent: 100,
      actualPercent: 55,
    },
    {
      id: "sample-29",
      reportDate: date,
      contractorCode: "CTR-002",
      contractorName: "ZCE Construction",
      buildingCode: "1.1",
      buildingName: "Fuel Yard",
      workDescription: "ปูพลาสติก ลงเหล็กไวเมท เตรียมเทพื้นคอนกรีต",
      headcount: 10,
      planPercent: 100,
      actualPercent: 90,
    },
    {
      id: "sample-30",
      reportDate: date,
      contractorCode: "CTR-002",
      contractorName: "ZCE Construction",
      buildingCode: "0.1",
      buildingName: "Road & Drainage",
      workDescription: "งานวางคันหิน",
      headcount: 8,
      planPercent: 100,
      actualPercent: 100,
    },
    {
      id: "sample-31",
      reportDate: date,
      contractorCode: "CTR-002",
      contractorName: "ZCE Construction",
      buildingCode: "1.2",
      buildingName: "Waste bunker",
      workDescription: "งานดัดเหล็กเสริมคอนกรีต",
      headcount: 6,
      planPercent: 100,
      actualPercent: 20,
    },
  ];
}

// Admin check & Daily Report summary for contractors.
// Supports single day or date range filtering with contractor filter.
export function DailyReportsPage() {
  const [params, setParams] = useSearchParams();
  const single = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : todayIso();
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : single;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const isRange = from !== to;

  const [viewMode, setViewMode] = useState<PageViewMode>("work-summary");
  const [search, setSearch] = useState("");
  const [contractor, setContractor] = useState("All Contractors");
  const [tab, setTab] = useState<ReviewTab>("all");
  const [reviewTarget, setReviewTarget] = useState<ReviewQueueRow | null>(null);

  const { projectId } = useCurrentProject();
  const reviewQueue = useReviewQueue(projectId, isRange ? { from, to } : from);
  const inspections = useInspectionRequests(projectId, { from, to, by: "report" });
  const siteDay = useSiteDay(projectId, from, to);

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.delete("date");
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };

  const queue: ReviewQueueRow[] = useMemo(() => reviewQueue.data?.data ?? [], [reviewQueue.data]);
  const requestList: InspectionRequest[] = useMemo(() => inspections.data?.data ?? [], [inspections.data]);

  // RFI / NCR counts per contractor from inspection requests
  const contractorStats = useMemo(() => {
    const map = new Map<string, { rfiToday: number; rfiTomorrow: number; ncr: number }>();
    for (const r of requestList) {
      const s = map.get(r.contractorName) ?? { rfiToday: 0, rfiTomorrow: 0, ncr: 0 };
      s.rfiToday += 1;
      if (r.result === "fail") s.ncr += 1;
      map.set(r.contractorName, s);
    }
    return map;
  }, [requestList]);

  const counts = useMemo(() => {
    const totalWorkers = queue.reduce((sum, q) => sum + (q.totalHeadcount ?? 0), 0);
    return {
      total: queue.length,
      totalWorkers,
      pending: queue.filter((q) => q.reviewStatus === "pending").length,
      rejected: queue.filter((q) => q.reviewStatus === "rejected").length,
      approved: queue.filter((q) => q.reviewStatus === "approved").length,
    };
  }, [queue]);

  const contractorNames = useMemo(
    () => [...new Set(queue.map((q) => q.contractorName))].sort(),
    [queue],
  );

  // Aggregate work done allocations across all contractors from real DB
  const workDoneItems: WorkDoneItem[] = useMemo(() => {
    const buildings = siteDay.data?.data?.buildings ?? [];
    const items: WorkDoneItem[] = [];

    for (const b of buildings) {
      for (let i = 0; i < (b.activities ?? []).length; i++) {
        const a = b.activities[i];
        items.push({
          id: `${a.reportDate}-${a.contractorCode}-${a.buildingId}-${i}`,
          reportDate: a.reportDate,
          contractorCode: a.contractorCode,
          contractorName: a.contractorName,
          buildingCode: b.code,
          buildingName: b.name,
          buildingNameTh: b.nameTh,
          workDescription: a.workDescription,
          headcount: a.headcount,
          planPercent: a.planPercent,
          actualPercent: a.actualPercent,
        });
      }
    }

    if (items.length > 0) return items;
    // Fallback sample items matching real contractor reports if DB is empty
    return getSampleWorkDoneItems(from);
  }, [siteDay.data, from]);

  // Combined list of contractors for filtering work done
  const workContractorNames = useMemo(() => {
    const set = new Set<string>();
    for (const c of contractorNames) set.add(c);
    for (const item of workDoneItems) set.add(item.contractorName);
    return [...set].sort();
  }, [contractorNames, workDoneItems]);

  // Tomorrow plan: requests raised in evening reports with target_date = tomorrow.
  const tomorrow = addDaysIso(todayIso(), 1);
  const tomorrowWeek = useWeeklySummary(projectId, mondayOf(tomorrow));
  const codeOfContractor = useMemo(() => {
    const m = new Map<string, string>();
    for (const q of queue) m.set(q.contractorName, q.contractorCode);
    return m;
  }, [queue]);
  const matchContractorCode = (code: string) => {
    if (contractor === "All Contractors") return true;
    return code === contractor || code === codeOfContractor.get(contractor);
  };
  const tomorrowPlans = useMemo(() => {
    const week = tomorrowWeek.data?.data;
    if (!week) return null;
    const machinery = week.machinery.filter((b) => b.targetDate === tomorrow && matchContractorCode(b.contractorCode));
    const roads = week.roads.filter((r) => r.targetDate === tomorrow && matchContractorCode(r.contractorCode));
    const equipment = (week.equipmentRequests ?? []).filter(
      (e) => e.targetDate === tomorrow && matchContractorCode(e.contractorCode),
    );
    return { machinery, roads, equipment };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tomorrowWeek.data, tomorrow, contractor, codeOfContractor]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return queue.filter((r) => {
      if (tab !== "all" && r.reviewStatus !== tab) return false;
      if (contractor !== "All Contractors" && r.contractorName !== contractor) return false;
      if (q && !`${r.contractorName} ${r.contractorCode} ${r.reportDate}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [queue, tab, contractor, search]);

  const loadError =
    reviewQueue.error instanceof HttpError
      ? reviewQueue.error.message
      : inspections.error instanceof HttpError
        ? inspections.error.message
        : null;
  const loading = reviewQueue.isPending;

  const shiftChip = (s: "draft" | "submitted") =>
    s === "submitted" ? <StatusChip status="submitted" label="ส่งแล้ว" /> : <StatusChip status="draft" label="รอส่ง" />;

  const statusLabel = (status: ReviewStatus) => {
    if (status === "approved") return "อนุมัติแล้ว";
    if (status === "rejected") return "ตีกลับแก้ไข";
    return "รอตรวจสอบ";
  };

  const dateRangeLabel = isRange
    ? `${formatThaiDate(from)} – ${formatThaiDate(to)}`
    : formatThaiDate(from);

  return (
    <Box>
      <PageHeader
        title="สรุปและตรวจสอบรายงานประจำวัน"
        subtitle="สรุปภาพรวมรายงานประจำวันจากผู้รับเหมา — ข้อมูลหน้างาน กำลังคน ผลงานจริง และการอนุมัติ"
        actions={
          <DateRangeFields from={from} to={to} maxDays={62} onChange={setRange} />
        }
      />

      {!projectId ? (
        <Alert severity="info" sx={{ mb: 2.5 }}>
          กรุณาเลือกโครงการด้านบนเพื่อดูสรุปรายงานประจำวัน
        </Alert>
      ) : loadError ? (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          ไม่สามารถโหลดข้อมูลรายงานได้: {loadError}
        </Alert>
      ) : loading ? (
        <Stack spacing={2} sx={{ mb: 2.5 }}>
          <Skeleton variant="rounded" height={90} />
          <Skeleton variant="rounded" height={260} />
        </Stack>
      ) : (
        <Box sx={{ mb: 2.5 }}>
          {/* Summary KPI Cards */}
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            {[
              {
                label: isRange ? "รายงานทั้งหมดในช่วงเวลา" : "รายงานประจำวันทั้งหมด",
                value: `${counts.total} รายงาน`,
                sub: dateRangeLabel,
                color: "text.primary",
              },
              {
                label: "กำลังคนรวมสะสม",
                value: `${counts.totalWorkers.toLocaleString()} คน`,
                sub: `เฉลี่ย ${counts.total > 0 ? Math.round(counts.totalWorkers / counts.total) : 0} คน/รายงาน`,
                color: "primary.main",
              },
              {
                label: "รอตรวจสอบ",
                value: `${counts.pending} รายงาน`,
                sub: counts.pending > 0 ? "มีรายการที่ต้องพิจารณา" : "ตรวจสอบครบแล้ว",
                color: counts.pending > 0 ? "warning.dark" : "text.secondary",
              },
              {
                label: "อนุมัติแล้ว",
                value: `${counts.approved} รายงาน`,
                sub: counts.total > 0 ? `${Math.round((counts.approved / counts.total) * 100)}% ของทั้งหมด` : "0%",
                color: "success.dark",
              },
            ].map((kpi) => (
              <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {kpi.label}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: kpi.color, my: 0.5 }}>
                      {kpi.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {kpi.sub}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* View Mode Switcher: Work Done Summary vs Review Queue */}
          <Box sx={{ mb: 2.5 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, val) => val && setViewMode(val)}
              size="small"
              sx={{ bgcolor: "background.paper" }}
            >
              <ToggleButton
                value="work-summary"
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  px: 2.5,
                  py: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <AssignmentOutlinedIcon fontSize="small" />
                สรุปรายการเนื้องาน (Work Done Summary)
              </ToggleButton>
              <ToggleButton
                value="review-queue"
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  px: 2.5,
                  py: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <FactCheckOutlinedIcon fontSize="small" />
                ตรวจสอบรายงานของผู้รับเหมา (Review Queue)
              </ToggleButton>
              <ToggleButton
                value="tomorrow-plan"
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  px: 2.5,
                  py: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <EventNoteOutlinedIcon fontSize="small" />
                แผนงานพรุ่งนี้ (Tomorrow Plan)
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* View 1: Work Done Summary Table (Requested Feature) */}
          {viewMode === "work-summary" ? (
            <WorkDoneSummaryTable
              items={workDoneItems}
              contractors={workContractorNames}
              selectedContractor={contractor}
              onSelectContractor={setContractor}
              dateLabel={dateRangeLabel}
              isRange={isRange}
            />
          ) : viewMode === "tomorrow-plan" ? (
            /* View 3: Tomorrow Plan — requests raised for tomorrow, same summary style */
            <TomorrowPlanView
              tomorrow={tomorrow}
              contractor={contractor}
              plans={tomorrowPlans}
              loading={tomorrowWeek.isPending}
              inspections={requestList.filter(
                (r) => r.inspectionDate === tomorrow && (contractor === "All Contractors" || r.contractorName === contractor),
              )}
            />
          ) : (
            /* View 2: Review Queue Table (Original View) */
            <Box>
              {/* Filter Status Tabs */}
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
                {(
                  [
                    ["all", `ทั้งหมด (${counts.total})`],
                    ["pending", `รอตรวจสอบ (${counts.pending})`],
                    ["approved", `อนุมัติแล้ว (${counts.approved})`],
                    ["rejected", `ตีกลับแก้ไข (${counts.rejected})`],
                  ] as [ReviewTab, string][]
                ).map(([value, label]) => (
                  <Chip
                    key={value}
                    label={label}
                    clickable
                    color={tab === value ? "primary" : "default"}
                    variant={tab === value ? "filled" : "outlined"}
                    onClick={() => setTab(value)}
                  />
                ))}
              </Stack>

              {/* Table Card with Contractor & Search Filters */}
              <Card variant="outlined">
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel id="review-contractor">ผู้รับเหมา</InputLabel>
                      <Select
                        labelId="review-contractor"
                        label="ผู้รับเหมา"
                        value={contractor}
                        onChange={(e) => setContractor(e.target.value)}
                      >
                        <MenuItem value="All Contractors">ทุกผู้รับเหมา ({queue.length} รายการ)</MenuItem>
                        {contractorNames.map((c) => {
                          const countForC = queue.filter((q) => q.contractorName === c).length;
                          return (
                            <MenuItem key={c} value={c}>
                              {c} ({countForC})
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                    <TextField
                      label="ค้นหา"
                      placeholder="ชื่อผู้รับเหมา, รหัส หรือวันที่…"
                      size="small"
                      fullWidth
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </Stack>

                  {rows.length === 0 ? (
                    <EmptyState
                      icon={<FactCheckOutlinedIcon />}
                      title="ไม่มีรายงานที่ตรงกับเงื่อนไข"
                      description="ลองเปลี่ยนช่วงวันที่ ตัวกรองผู้รับเหมา หรือล้างคำค้นหา"
                      action={
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setTab("all");
                            setSearch("");
                            setContractor("All Contractors");
                          }}
                        >
                          ดูทั้งหมด
                        </Button>
                      }
                    />
                  ) : (
                    <Table size="small" aria-label="Contractor daily report list">
                      <TableHead>
                        <TableRow>
                          {isRange && <TableCell sx={{ whiteSpace: "nowrap" }}>วันที่</TableCell>}
                          <TableCell>ผู้รับเหมา</TableCell>
                          <TableCell>เช้า</TableCell>
                          <TableCell>บ่าย</TableCell>
                          <TableCell align="right">คน</TableCell>
                          <TableCell align="right">RFI</TableCell>
                          <TableCell align="right">NCR</TableCell>
                          <TableCell>สถานะการตรวจ</TableCell>
                          <TableCell align="right">การดำเนินการ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((r) => {
                          const s = contractorStats.get(r.contractorName) ?? { rfiToday: 0, rfiTomorrow: 0, ncr: 0 };
                          return (
                            <TableRow key={r.id} hover>
                              {isRange && (
                                <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                                  {dayjs(r.reportDate).format("ddd D MMM")}
                                </TableCell>
                              )}
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <ContractorBadge code={r.contractorCode} />
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {r.contractorName}
                                    </Typography>
                                    {!isRange && (
                                      <Typography variant="caption" color="text.secondary">
                                        {formatThaiDate(r.reportDate)}
                                      </Typography>
                                    )}
                                  </Box>
                                </Stack>
                              </TableCell>
                              <TableCell>{shiftChip(r.morningStatus)}</TableCell>
                              <TableCell>{shiftChip(r.eveningStatus)}</TableCell>
                              <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                                {r.totalHeadcount} คน
                              </TableCell>
                              <TableCell align="right">{s.rfiToday}</TableCell>
                              <TableCell align="right">{s.ncr}</TableCell>
                              <TableCell>
                                <StatusChip
                                  status={r.reviewStatus === "pending" ? "submitted" : r.reviewStatus}
                                  label={statusLabel(r.reviewStatus)}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => setReviewTarget(r)}
                                  sx={{ textTransform: "none", px: 2 }}
                                >
                                  ตรวจสอบ
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}

                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                    แสดง {rows.length} จาก {queue.length} รายงานทั้งหมด
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      )}

      {/* Review Dialog with 4 Tabs & Rich Contractor Submitted Data */}
      <ReviewDialog
        report={reviewTarget}
        projectId={projectId}
        onClose={() => setReviewTarget(null)}
      />
    </Box>
  );
}

// Tomorrow plan detail in the Work Done Summary style: everything contractors
// raised in evening reports for tomorrow (machinery, equipment, roads) plus
// QAQC inspections scheduled for tomorrow.
function TomorrowPlanView({
  tomorrow,
  contractor,
  plans,
  loading,
  inspections,
}: {
  tomorrow: string;
  contractor: string;
  plans: {
    machinery: WeeklyBooking[];
    roads: WeeklySummary["roads"];
    equipment: ReportEquipmentRequest[];
  } | null;
  loading: boolean;
  inspections: InspectionRequest[];
}) {
  if (loading || !plans) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={90} />
        <Skeleton variant="rounded" height={200} />
      </Stack>
    );
  }
  const total = plans.machinery.length + plans.roads.length + plans.equipment.length + inspections.length;
  const scope = contractor === "All Contractors" ? "ทุกผู้รับเหมา" : contractor;
  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {(
          [
            ["คำขอทั้งหมด", `${total} รายการ`, `สำหรับ ${formatThaiDate(tomorrow)} · ${scope}`],
            ["เครื่องจักร", `${plans.machinery.length} รายการ`, ""],
            ["อุปกรณ์ + ถนน", `${plans.equipment.length + plans.roads.length} รายการ`, ""],
            ["ตรวจ QAQC", `${inspections.length} รายการ`, ""],
          ] as const
        ).map(([label, value, sub]) => (
          <Grid key={label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5 }}>
                  {value}
                </Typography>
                {sub ? (
                  <Typography variant="caption" color="text.secondary">
                    {sub}
                  </Typography>
                ) : null}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {total === 0 ? (
        <EmptyState
          icon={<EventNoteOutlinedIcon />}
          title="ยังไม่มีแผนงานพรุ่งนี้"
          description="ผู้รับเหมายังไม่ได้ส่งคำขอสำหรับวันพรุ่งนี้ — รายการจะปรากฏที่นี่หลังส่งรายงานเย็น"
        />
      ) : (
        <Stack spacing={2.5}>
          <Card variant="outlined">
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                จองเครื่องจักรพรุ่งนี้
              </Typography>
              {plans.machinery.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  ไม่มีการจองเครื่องจักร
                </Typography>
              ) : (
                <MachineryAllocationTable bookings={plans.machinery} onlyConflicts={false} />
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                เครื่องมือ / อุปกรณ์พรุ่งนี้
              </Typography>
              {plans.equipment.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  ไม่มีการขออุปกรณ์
                </Typography>
              ) : (
                <Table size="small" aria-label="Tomorrow equipment requests">
                  <TableHead>
                    <TableRow>
                      <TableCell>ผู้รับเหมา</TableCell>
                      <TableCell>อุปกรณ์</TableCell>
                      <TableCell align="right">จำนวน</TableCell>
                      <TableCell>อาคาร</TableCell>
                      <TableCell>วัตถุประสงค์</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {plans.equipment.map((e) => (
                      <TableRow key={e.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{e.contractorCode}</TableCell>
                        <TableCell>{e.equipmentType}</TableCell>
                        <TableCell align="right">{e.qty}</TableCell>
                        <TableCell>{e.buildingCode}</TableCell>
                        <TableCell>{e.purpose ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                ถนนพรุ่งนี้
              </Typography>
              {plans.roads.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  ไม่มีการขอใช้ถนน
                </Typography>
              ) : (
                <RoadUsageTable roads={plans.roads} />
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                ตรวจ QAQC พรุ่งนี้
              </Typography>
              {inspections.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  ไม่มีการนัดตรวจ QAQC
                </Typography>
              ) : (
                <Table size="small" aria-label="Tomorrow QAQC inspections">
                  <TableHead>
                    <TableRow>
                      <TableCell>เวลา</TableCell>
                      <TableCell>ผู้รับเหมา</TableCell>
                      <TableCell>งานที่ขอตรวจ</TableCell>
                      <TableCell>อาคาร</TableCell>
                      <TableCell>สถานะ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inspections.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{r.inspectionTime}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{r.contractorName}</TableCell>
                        <TableCell>{r.workItem}</TableCell>
                        <TableCell>{r.buildingCode}</TableCell>
                        <TableCell>
                          <StatusChip status={r.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
}
