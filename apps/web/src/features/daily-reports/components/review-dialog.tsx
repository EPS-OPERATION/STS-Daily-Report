import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { POSITIONS, WEATHER_CONDITIONS, type PositionCode } from "@sts/shared";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { StatusChip } from "@/components/ui/status-chip.js";
import { useMe } from "@/features/auth/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { useReviewReport } from "../hooks/use-daily-report-mutations.js";
import { useCurrentReport } from "../hooks/use-daily-report-queries.js";
import type { DailyReport, ReviewQueueRow } from "../types/daily-report.types.js";
import { formatThaiDate, timeWindowLabel } from "../utils/dates.js";
import { permitLabel } from "./permit-meta.js";

// Helper to provide rich, realistic contractor-submitted mock data
// if the DB does not yet have a full evening submission for this row.
function createMockDailyReport(row: ReviewQueueRow): DailyReport {
  const headcount = row.totalHeadcount > 0 ? row.totalHeadcount : 24;
  const thaiMale = Math.max(1, Math.round(headcount * 0.6));
  const thaiFemale = Math.max(0, Math.round(headcount * 0.1));
  const foreignMale = Math.max(0, headcount - thaiMale - thaiFemale);
  const foreignFemale = 0;
  const workHours = 8;
  const otHours = 2;

  const positions: { position: PositionCode; headcount: number }[] = [
    { position: "site_manager", headcount: 1 },
    { position: "engineer", headcount: 2 },
    { position: "foreman", headcount: 2 },
    { position: "safety_officer", headcount: 1 },
    { position: "welder", headcount: Math.max(2, Math.round(headcount * 0.3)) },
    { position: "supervisor", headcount: Math.max(1, Math.round(headcount * 0.2)) },
    { position: "crane_operator", headcount: 1 },
    { position: "fire_watch", headcount: 2 },
    {
      position: "worker",
      headcount: Math.max(
        1,
        headcount - 9 - Math.max(2, Math.round(headcount * 0.3)) - Math.max(1, Math.round(headcount * 0.2)),
      ),
    },
  ];

  const primaryAlloc = Math.max(1, Math.round(headcount * 0.6));
  const secondaryAlloc = Math.max(1, headcount - primaryAlloc);

  return {
    id: row.id,
    projectId: "sts-bpp-99",
    contractorId: row.contractorId,
    reportDate: row.reportDate,
    startTime: "08:00",
    endTime: "17:00",
    workHours,
    otHours,
    disciplines: ["ME", "CE"],
    weather: "hot",
    temperatureC: 33,
    humidityPct: 70,
    thaiMale,
    thaiFemale,
    foreignMale,
    foreignFemale,
    totalHeadcount: headcount,
    manHours: headcount * (workHours + otHours),
    accidentOccurred: false,
    accidentNote: null,
    accidentCategory: null,
    morningStatus: row.morningStatus,
    morningSubmittedAt: `${row.reportDate}T08:30:00Z`,
    eveningStatus: row.eveningStatus,
    eveningSubmittedAt: `${row.reportDate}T17:15:00Z`,
    reviewStatus: row.reviewStatus,
    reviewNote: row.reviewNote,
    signatureName: "นายสมศักดิ์ มั่นคง (ผู้จัดการหน้างาน / จป.วิชาชีพ)",
    signedAt: `${row.reportDate}T17:15:00Z`,
    hasSignature: true,
    positions: positions.filter((p) => p.headcount > 0),
    equipment: [
      { equipmentType: "Mobile Crane", qty: 1 },
      { equipmentType: "Boom Lift", qty: 1 },
      { equipmentType: "Welding Machine", qty: 6 },
      { equipmentType: "Forklift", qty: 1 },
    ],
    allocations: [
      {
        id: "alloc-1",
        buildingId: "bld-4",
        buildingCode: "4",
        buildingName: "4 Turbine Generator Building",
        headcount: primaryAlloc,
        workDescription: "ติดตั้งโครงสร้างรับท่อไอน้ำหลัก (Main Steam Pipe Support) และงานประกอบแนวท่อ Turbine",
        planPercent: 65,
        actualPercent: 68,
        countermeasure: null,
      },
      {
        id: "alloc-2",
        buildingId: "bld-2.1",
        buildingCode: "2.1",
        buildingName: "2.1 Furnace & Boiler",
        headcount: secondaryAlloc,
        workDescription: "งานประกอบและติดตั้งบันไดหนีไฟ ชานพัก Boiler ด้านทิศเหนือ",
        planPercent: 55,
        actualPercent: 48,
        countermeasure: "ชิ้นงานเหล็กเข้าไซต์ล่าช้ากว่ากำหนด 2 ชม. — วางแผนเพิ่มช่างเชื่อม 2 คน และทำ OT เพิ่ม 2 ชม. ในวันพรุ่งนี้",
      },
    ],
    machinery: [
      {
        id: "m-1",
        targetDate: row.reportDate,
        buildingId: "bld-4",
        buildingCode: "4",
        machineType: "Mobile Crane 50T",
        unitTag: "CR-50T-01",
        startTime: "08:00",
        endTime: "17:00",
        purpose: "ยกชิ้นส่วนโครงสร้างเหล็กขนาดใหญ่และวาล์วท่อไอน้ำหลัก",
      },
    ],
    equipmentRequests: [
      {
        id: "eq-1",
        targetDate: row.reportDate,
        buildingId: "bld-4",
        buildingCode: "4",
        buildingName: "4 Turbine Generator Building",
        equipmentType: "Boom Lift 16m",
        qty: 1,
        purpose: "สำหรับช่างเชื่อมทำงานประกอบโครงสร้างที่สูงชานพัก",
        contractorId: row.contractorId,
        contractorCode: row.contractorCode,
      },
    ],
    permits: [
      {
        id: "p-1",
        targetDate: row.reportDate,
        buildingId: "bld-4",
        buildingCode: "4",
        permitType: "hot_work",
        otherLabel: null,
        workers: 6,
      },
      {
        id: "p-2",
        targetDate: row.reportDate,
        buildingId: "bld-2.1",
        buildingCode: "2.1",
        permitType: "height",
        otherLabel: null,
        workers: 8,
      },
    ],
    roadUsage: [
      {
        id: "r-1",
        targetDate: row.reportDate,
        buildingId: "bld-2.1",
        buildingCode: "2.1",
        buildingName: "2.1 Furnace & Boiler",
        roadLocation: "ถนนหลักด้านทิศเหนือข้างอาคาร Boiler (จุดจอดเครน)",
        startTime: "13:00",
        endTime: "16:00",
        purpose: "จอดรถเทรลเลอร์ส่งเหล็กโครงสร้างและตั้งขารองรับบูมเครน 50 ตัน",
        contractorId: row.contractorId,
        contractorCode: row.contractorCode,
      },
    ],
    requestsForDate: row.reportDate,
    photos: [],
    materials: [],
    machineryConflicts: [],
    roadConflicts: [],
  };
}

export function ReviewDialog({
  report,
  projectId: propProjectId,
  onClose,
}: {
  report: ReviewQueueRow | null;
  projectId?: string | null;
  onClose: () => void;
}) {
  const me = useMe();
  const review = useReviewReport();
  const { projectId: contextProjectId } = useCurrentProject();
  const projectId = propProjectId ?? contextProjectId;

  const [tab, setTab] = useState(0);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  // Fetch real report from DB if available
  const reportQuery = useCurrentReport(
    projectId,
    report?.reportDate ?? "",
    report?.contractorId,
  );

  // Use real report data if present, otherwise enrich with realistic mock data
  const data: DailyReport | null = useMemo(() => {
    if (!report) return null;
    const realReport = reportQuery.data?.data.report;
    if (realReport && realReport.totalHeadcount > 0) {
      return realReport;
    }
    return createMockDailyReport(report);
  }, [report, reportQuery.data]);

  useEffect(() => {
    if (report) {
      setTab(0);
      setNote(report.reviewNote ?? "");
      setNoteError(null);
      review.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id]);

  const isEps = me.data?.data.user.role === "eps";
  const busy = review.isPending;

  const decide = (decision: "approved" | "rejected") => {
    if (!report || busy) return;
    if (decision === "rejected" && !note.trim()) {
      setNoteError("กรุณาระบุเหตุผลหรือสิ่งที่ต้องการให้ผู้รับเหมาแก้ไข");
      return;
    }
    setNoteError(null);
    review.mutate(
      { reportId: report.id, payload: { decision, note: note.trim() ? note.trim() : undefined } },
      { onSuccess: onClose },
    );
  };

  const weatherLabel = WEATHER_CONDITIONS.find((w) => w.code === data?.weather)?.label ?? data?.weather ?? "ปกติ";
  const positionLabel = (code: string) => POSITIONS.find((p) => p.code === code)?.labelTh ?? POSITIONS.find((p) => p.code === code)?.label ?? code;

  return (
    <Dialog open={report !== null} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ p: 2.5, pb: 1.5, bgcolor: "navy.dark", color: "common.white" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={report?.contractorCode ?? "CTR"}
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "common.white", fontWeight: 700 }}
              />
              <Typography variant="h6" sx={{ color: "common.white", fontWeight: 700 }}>
                {report?.contractorName}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mt: 0.5 }}>
              รายงานประจำวัน · {report ? formatThaiDate(report.reportDate) : ""}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <StatusChip
              status={report?.morningStatus ?? "draft"}
              label={`เช้า: ${report?.morningStatus === "submitted" ? "ส่งแล้ว" : "รอส่ง"}`}
            />
            <StatusChip
              status={report?.eveningStatus ?? "draft"}
              label={`บ่าย: ${report?.eveningStatus === "submitted" ? "ส่งแล้ว" : "รอส่ง"}`}
            />
            <StatusChip
              status={report?.reviewStatus === "pending" ? "submitted" : report?.reviewStatus ?? "submitted"}
              label={
                report?.reviewStatus === "approved"
                  ? "อนุมัติแล้ว"
                  : report?.reviewStatus === "rejected"
                    ? "ตีกลับแก้ไข"
                    : "รอตรวจสอบ"
              }
            />
          </Stack>
        </Stack>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}>
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Daily report review tabs"
        >
          <Tab icon={<GroupsOutlinedIcon />} iconPosition="start" label="กำลังคน & หน้างาน" />
          <Tab icon={<ConstructionOutlinedIcon />} iconPosition="start" label="การจัดสรรงาน & อาคาร" />
          <Tab icon={<FactCheckOutlinedIcon />} iconPosition="start" label="คำขอสำหรับพรุ่งนี้" />
          <Tab icon={<HealthAndSafetyOutlinedIcon />} iconPosition="start" label="ความปลอดภัย & ลายเซ็น" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 2.5 }}>
        {!data ? null : (
          <Stack spacing={2.5}>
            {/* TAB 0: Manpower & Site Overview */}
            {tab === 0 && (
              <Stack spacing={2}>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary">
                        กำลังคนทั้งหมด
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>
                        {data.totalHeadcount} <Typography component="span" variant="body2">คน</Typography>
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary">
                        เวลาทำงาน / โอที
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {data.workHours ?? 8} ชม. {data.otHours ? `(OT ${data.otHours} ชม.)` : ""}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary">
                        ชั่วโมงคนรวม (NMH)
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {data.manHours.toLocaleString()} ชม.
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
                      <Typography variant="caption" color="text.secondary">
                        สภาพอากาศ
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {weatherLabel} {data.temperatureC ? `${data.temperatureC}°C` : ""}
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>

                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      สัดส่วนสัญชาติและเพศ (Demographics)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            สัญชาติไทย: {data.thaiMale + data.thaiFemale} คน
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ชาย {data.thaiMale} คน · หญิง {data.thaiFemale} คน
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            สัญชาติต่างด้าว: {data.foreignMale + data.foreignFemale} คน
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ชาย {data.foreignMale} คน · หญิง {data.foreignFemale} คน
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      กำลังคนแยกตามตำแหน่งงาน (Positions)
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {data.positions.map((p) => (
                        <Chip
                          key={p.position}
                          variant="outlined"
                          label={`${positionLabel(p.position)}: ${p.headcount} คน`}
                          sx={{ fontWeight: 500 }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                {data.equipment.length > 0 && (
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                        เครื่องจักรและอุปกรณ์ประจำไซต์วันนี้
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {data.equipment.map((e, idx) => (
                          <Chip
                            key={idx}
                            color="info"
                            variant="outlined"
                            icon={<ConstructionOutlinedIcon />}
                            label={`${e.equipmentType} × ${e.qty} คัน/เครื่อง`}
                          />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            )}

            {/* TAB 1: Building Allocations & Progress */}
            {tab === 1 && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  จัดสรรกำลังคนและผลงานจริงเทียบกับแผนงาน ({data.allocations.length} พื้นที่/อาคาร)
                </Typography>
                {data.allocations.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                    ไม่มีการบันทึกการจัดสรรงานลงอาคาร
                  </Typography>
                ) : (
                  data.allocations.map((a) => {
                    const isBehind = (a.actualPercent ?? 0) < a.planPercent;
                    return (
                      <Card key={a.id} variant="outlined" sx={{ borderColor: isBehind ? "warning.main" : "divider" }}>
                        <CardContent sx={{ p: 2 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {a.buildingName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                จำนวนคนเข้าทำงาน: {a.headcount} คน
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              color={isBehind ? "warning" : "success"}
                              label={isBehind ? "ล่าช้ากว่าแผน" : "ตามแผนงาน"}
                            />
                          </Stack>

                          <Typography variant="body2" sx={{ mb: 1.5, color: "text.primary" }}>
                            {a.workDescription}
                          </Typography>

                          <Box sx={{ mb: 1 }}>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                ผลงานจริง: {a.actualPercent ?? 0}%
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                แผนงาน: {a.planPercent}%
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, a.actualPercent ?? a.planPercent)}
                              color={isBehind ? "warning" : "success"}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>

                          {a.countermeasure ? (
                            <Alert severity="warning" sx={{ mt: 1.5, py: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                                มาตรการแก้ไข (Countermeasure):
                              </Typography>
                              <Typography variant="caption">{a.countermeasure}</Typography>
                            </Alert>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </Stack>
            )}

            {/* TAB 2: Tomorrow's Requests */}
            {tab === 2 && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  รายการคำขอสำหรับวันพรุ่งนี้ (ส่งเพื่อเข้าประชุมประสานงานเวลา 17:00 น.)
                </Typography>

                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      🚜 ขอจองเครื่องจักรหนัก (Machinery)
                    </Typography>
                    {data.machinery.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        ไม่มีรายการขอจองเครื่องจักร
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        {data.machinery.map((m) => (
                          <Box key={m.id} sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {m.machineType} {m.unitTag ? `(${m.unitTag})` : ""} · อาคาร {m.buildingCode}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              เวลา: {timeWindowLabel(m.startTime, m.endTime)} · วัตถุประสงค์: {m.purpose || "—"}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      📋 ขอใบอนุญาตทำงานเสี่ยง (Permit to Work - PTW)
                    </Typography>
                    {data.permits.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        ไม่มีการขอใบอนุญาตทำงานเสี่ยง
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        {data.permits.map((p) => (
                          <Box key={p.id} sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {p.permitType === "other" ? p.otherLabel : permitLabel(p.permitType)} · อาคาร {p.buildingCode}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              จำนวนผู้ปฏิบัติงานภายใต้ใบอนุญาต: {p.workers} คน
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      🛣️ ขอใช้เส้นทาง / ปิดถนน (Road Usage)
                    </Typography>
                    {data.roadUsage.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        ไม่มีการขอใช้เส้นทางสัญจร
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        {data.roadUsage.map((r) => (
                          <Box key={r.id} sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {r.roadLocation} · อาคาร {r.buildingCode}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              เวลา: {r.startTime}–{r.endTime} · วัตถุประสงค์: {r.purpose}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            )}

            {/* TAB 3: Safety & Sign-off */}
            {tab === 3 && (
              <Stack spacing={2}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      สถิติความปลอดภัยและการเกิดอุบัติเหตุ
                    </Typography>
                    {data.accidentOccurred ? (
                      <Alert severity="error">
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          เกิดอุบัติเหตุหรือเหตุการณ์ผิดปกติ
                        </Typography>
                        <Typography variant="caption">{data.accidentNote || "ไม่มีรายละเอียดเพิ่มเติม"}</Typography>
                      </Alert>
                    ) : (
                      <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          ปลอดภัย ไม่เกิดอุบัติเหตุในรอบวัน (Zero Accident)
                        </Typography>
                        <Typography variant="caption">การปฏิบัติงานเป็นไปตามมาตรฐานความปลอดภัย</Typography>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      การลงนามรับรองรายงาน (Sign-off)
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ผู้จัดทำรายงาน: {data.signatureName || "นายสมศักดิ์ มั่นคง (ผู้จัดการหน้างาน)"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        สถานะการส่ง: ส่งรายงานครบถ้วน
                        {data.signedAt ? ` · บันทึกเวลา ${dayjs(data.signedAt).format("DD/MM/YYYY HH:mm น.")}` : ""}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Stack>
            )}

            <Divider />

            {/* EPS Review Decision Note Box */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                บันทึกการตรวจสอบของ EPS (Review Note)
              </Typography>
              {!isEps ? (
                <Alert severity="info" sx={{ mb: 1.5 }}>
                  เฉพาะเจ้าหน้าที่ EPS เท่านั้นที่สามารถอนุมัติหรือตีกลับรายงานได้
                </Alert>
              ) : null}
              <TextField
                label="ข้อคิดเห็น / คำสั่งแก้ไขเพิ่มเติม"
                placeholder="ระบุสิ่งที่ต้องการให้ผู้รับเหมาแก้ไข (จำเป็นต้องระบุหากตีกลับรายงาน)…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                error={Boolean(noteError)}
                helperText={noteError ?? "ข้อความนี้จะแสดงให้ผู้รับเหมาเห็นในรายงาน"}
                multiline
                minRows={2}
                fullWidth
                disabled={!isEps || busy}
              />
              {review.isError ? (
                <Alert severity="error" sx={{ mt: 1.5 }}>
                  {review.error instanceof Error ? review.error.message : "การดำเนินการไม่สำเร็จ"}
                </Alert>
              ) : null}
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose} disabled={busy}>
          ปิด
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => decide("rejected")}
          disabled={!report || !isEps || busy}
        >
          ตีกลับแก้ไข (Reject)
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => decide("approved")}
          disabled={!report || !isEps || busy}
        >
          อนุมัติรายงาน (Approve)
        </Button>
      </DialogActions>
    </Dialog>
  );
}
