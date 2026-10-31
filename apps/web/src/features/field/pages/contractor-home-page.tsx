import { canEditReport } from "@sts/shared";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { FieldBottomNav } from "@/components/field/field-bottom-nav.js";
import { EmptySection } from "@/components/ui/empty-state.js";
import { useAuthConfig, useMe } from "@/features/auth/index.js";
import { CopySourceButton } from "@/features/daily-reports/index.js";
import { addDaysIso, formatThaiDate, todayIso, clockTime } from "@/lib/dates.js";
import { useCurrentReport, useReviewQueue } from "@/features/daily-reports/index.js";
import { useInspectionRequests } from "@/features/qaqc/index.js";
import { PermitNoticeCard, usePermitNotices } from "@/features/daily-requests/index.js";
import { CoordinationWorkspace } from "@/features/site-coordination/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";
import { UnlinkedCompany } from "@/features/auth/components/unlinked-company.js";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Pagination from "@mui/material/Pagination";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { HISTORY_DAYS } from "../components/contractor-home-parts.js";
import { HISTORY_PAGE } from "../components/contractor-home-parts.js";
import { TaskRow } from "../components/contractor-home-parts.js";
import { HistoryRow } from "../components/contractor-home-parts.js";

// Mobile-first field home. Answers "what do I still have to send today?" and lets the
// contractor reopen a recent report — edits stay open until 12:00 the day after.
export function ContractorHomePage() {
  const { projectId, projects } = useCurrentProject();
  const project = projects.find((p) => p.id === projectId);
  const me = useMe();
  const allowResubmit = Boolean(useAuthConfig().data?.data.allowResubmit);

  // Automatically bind to the contractor of the logged-in user
  const allContractors = me.data?.data.contractors ?? [];
  // Memberships are project-scoped; the field app works inside the selected project.
  const myContractors = projectId ? allContractors.filter((c) => c.projectId === projectId) : allContractors;
  const contractorId = myContractors[0]?.id;

  // The edit window closes at a fixed time, so keep "now" fresh while the page is open.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const today = todayIso();
  const tomorrow = addDaysIso(today, 1);
  const current = useCurrentReport(projectId, today, contractorId, Boolean(contractorId));
  const rfi = useInspectionRequests(projectId, { from: tomorrow, to: tomorrow, by: "inspection" });
  const history = useReviewQueue(projectId, { from: addDaysIso(today, -(HISTORY_DAYS - 1)), to: today });
  // Today feed: every company's work permits of today; the ones with location photos (floor cut open, guardrail
  // removed...) come first.
  const notices = usePermitNotices(projectId, today, today, Boolean(contractorId));

  const report = current.data?.data.report ?? null;
  const contractor = current.data?.data.contractor;
  const morningDone = report?.morningStatus === "submitted";
  const eveningDone = report?.eveningStatus === "submitted";
  const tomorrowRequests = report
    ? report.machinery.length + report.equipmentRequests.length + report.permits.length + report.roadUsage.length
    : 0;
  const tomorrowRfi = (rfi.data?.data ?? []).filter((r) => r.contractorId === contractorId && r.status !== "draft").length;
  const rows = useMemo(
    () => (history.data?.data ?? []).filter((r) => r.contractorId === contractorId),
    [history.data, contractorId],
  );

  // History pages; back to a valid page when the list gets shorter (e.g. switching contractor).
  const historyPages = Math.max(1, Math.ceil(rows.length / HISTORY_PAGE));
  const [pageState, setHistoryPage] = useState(1);
  const historyPage = Math.min(pageState, historyPages);

  const navigate = useNavigate();

  const reportLink = (date: string, shift?: "morning" | "evening") =>
    `/field/report?date=${date}${contractorId ? `&contractor=${contractorId}` : ""}${shift ? `&shift=${shift}` : ""}`;
  const isEditable = (date: string) => allowResubmit || canEditReport(date, now);
  const formatShiftStatus = (
    submittedAt: string | null | undefined,
    updatedAt: string | null | undefined,
    emptyText: string,
  ) => {
    if (!submittedAt) return emptyText;
    const sent = `ส่งแล้ว ${clockTime(submittedAt)} น.`;
    if (updatedAt && dayjs(updatedAt).diff(dayjs(submittedAt), "minute") >= 1) {
      const edit = clockTime(updatedAt);
      return `${sent} · แก้ไขล่าสุด ${edit} น.`;
    }
    return sent;
  };

  const next = !morningDone
    ? { label: "ส่ง Daily Report", to: reportLink(today, "morning") }
    : !eveningDone
      ? { label: "ส่ง Daily Request", to: reportLink(today, "evening") }
      : null;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const initial = (me.data?.data.user.displayName ?? me.data?.data.user.email ?? "?").charAt(0).toUpperCase();
  const loadError = [current.error, history.error].find((e) => e instanceof HttpError) as HttpError | undefined;

  if (me.isSuccess && !myContractors.length) return <UnlinkedCompany />;
  return (
    <Box sx={{ maxWidth: { xs: 480, md: 960 }, mx: "auto", pb: 10 }}>
      <Card sx={{ bgcolor: "navy.dark", border: "none", mb: 2 }}>
        <CardContent sx={{ p: 2.5, color: "common.white" }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Typography variant="caption" sx={{ color: "common.white", opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
                {clockTime(now)} · {formatThaiDate(today)}
              </Typography>
              <Typography variant="h4" sx={{ color: "common.white" }}>
                {greeting}
              </Typography>
              <Typography variant="body2" sx={{ color: "common.white", opacity: 0.85 }}>
                {project?.name ?? "STS Project"}
                {contractor ? ` · ${contractor.code}` : ""}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton aria-label="Notifications" sx={{ color: "common.white" }}>
                <NotificationsNoneOutlinedIcon />
              </IconButton>
              <Avatar sx={{ width: 36, height: 36, bgcolor: "info.main" }}>{initial}</Avatar>
            </Stack>
          </Stack>

        </CardContent>
      </Card>

      {loadError ? (
        <Alert severity={loadError.status === 403 ? "warning" : "error"} sx={{ mb: 2 }}>
          {loadError.status === 403 ? "บัญชีนี้ยังไม่ได้ผูกกับผู้รับเหมา — ติดต่อ EPS เพื่อเพิ่มสิทธิ์" : `โหลดข้อมูลไม่สำเร็จ: ${loadError.message}`}
        </Alert>
      ) : null}

      {/* Reporting leads (tasks + send); safety notices and the map support it; history is reference. On wide screens
          History fills the space under the tasks (the right column is taller); on a phone it comes last. */}
      <Box sx={{
        display: "grid", gap: 2, alignItems: "start",
        gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
        gridTemplateRows: { md: "auto 1fr" },
        gridTemplateAreas: { xs: '"tasks" "side" "history"', md: '"tasks side" "history side"' },
      }}>
      <Box sx={{ gridArea: "tasks" }}>
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h5" sx={{ mb: 1.5 }}>
            Today&apos;s Tasks
          </Typography>
          {current.isLoading ? (
            <Stack spacing={1.5}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rounded" height={44} />
              ))}
            </Stack>
          ) : (
            <Stack divider={<Divider flexItem />} spacing={1.5}>
              <TaskRow
                icon={morningDone ? CheckCircleOutlineIcon : ScheduleOutlinedIcon}
                tone={morningDone ? "success" : "warning"}
                title="Daily Report"
                caption={formatShiftStatus(report?.morningSubmittedAt, report?.morningUpdatedAt, "ยังไม่ส่ง · รายงานเช้า กำลังคน และแผนงาน")}
                below={
                  // Not sent yet: start from the latest morning report instead of typing it again.
                  !morningDone ? (
                    <Box sx={{ mt: 1 }}>
                      <CopySourceButton
                        projectId={projectId}
                        contractorId={contractorId}
                        date={today}
                        onPick={(day) => navigate(`${reportLink(today, "morning")}&copy=${day}`)}
                      />
                    </Box>
                  ) : null
                }
                action={
                  <Button
                    component={RouterLink}
                    to={reportLink(today, "morning")}
                    variant={morningDone ? "outlined" : "contained"}
                  >
                    {morningDone ? (isEditable(today) ? "แก้ไข" : "ดู") : "ส่ง"}
                  </Button>
                }
              />
              <TaskRow
                icon={eveningDone ? CheckCircleOutlineIcon : ScheduleOutlinedIcon}
                tone={eveningDone ? "success" : "warning"}
                title="Daily Request"
                caption={formatShiftStatus(report?.eveningSubmittedAt, report?.eveningUpdatedAt, "ยังไม่ส่ง · รายงานบ่าย ผลงาน และคำขอพรุ่งนี้")}
                action={
                  <Button
                    component={RouterLink}
                    to={reportLink(today, "evening")}
                    variant={eveningDone ? "outlined" : "contained"}
                  >
                    {eveningDone ? (isEditable(today) ? "แก้ไข" : "ดู") : "ส่ง"}
                  </Button>
                }
              />
              <TaskRow
                icon={EventNoteOutlinedIcon}
                tone="info"
                title="Tomorrow Plan"
                caption={
                  tomorrowRequests > 0 ? `${tomorrowRequests} คำขอสำหรับพรุ่งนี้` : "ยังไม่มีคำขอ — ส่งพร้อม Daily Request"
                }
              />
              <TaskRow
                icon={FactCheckOutlinedIcon}
                tone="info"
                title="QAQC"
                caption={tomorrowRfi > 0 ? `ขอตรวจพรุ่งนี้ ${tomorrowRfi} รายการ` : "ไม่มีการขอตรวจพรุ่งนี้"}
              />
            </Stack>
          )}
        </CardContent>
      </Card>

      {next ? (
        <Button component={RouterLink} to={next.to} fullWidth>
          {next.label}
        </Button>
      ) : !current.isLoading && report ? (
        <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
          ส่งครบทั้ง Daily Report และ Daily Request ของวันนี้แล้ว
        </Alert>
      ) : null}
      </Box>

      <Stack spacing={2} sx={{ gridArea: "side" }}>
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CampaignOutlinedIcon sx={{ color: "warning.dark" }} aria-hidden="true" />
              <Typography variant="h5">Today feed</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
              ใบอนุญาตทำงานของวันนี้ทุกบริษัท — งานที่แนบรูปตำแหน่ง (ช่องเปิด/รื้อราวกันตก) ขึ้นก่อน โปรดระวังเป็นพิเศษ
            </Typography>
            {notices.isLoading ? (
              <Skeleton variant="rounded" height={96} />
            ) : (notices.data?.data ?? []).length === 0 ? (
              <EmptySection dense icon={<CampaignOutlinedIcon />} title="วันนี้ยังไม่มีใบอนุญาตทำงาน" />
            ) : (
              <Stack spacing={1.25} sx={{ maxHeight: 520, overflowY: "auto" }}>
                {(notices.data?.data ?? []).map((n) => <PermitNoticeCard key={n.id} notice={n} />)}
              </Stack>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography variant="h5">Map</Typography>
              <Button component={RouterLink} to="/field/coordination" variant="text" size="small">Open Map</Button>
            </Stack>
            <CoordinationWorkspace readOnly compact />
          </CardContent>
        </Card>
      </Stack>

      <Card sx={{ gridArea: "history" }}>
        <CardContent sx={{ p: 2.5, pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <HistoryOutlinedIcon sx={{ color: "text.secondary" }} aria-hidden="true" />
            <Typography variant="h5">History</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {HISTORY_DAYS} วันล่าสุด · แก้ไขรายงานที่ส่งแล้วได้ถึง 12:00 น. ของวันถัดไป
          </Typography>
        </CardContent>
        {history.isLoading ? (
          <Stack spacing={1} sx={{ p: 2.5, pt: 1 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={56} />
            ))}
          </Stack>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <EmptySection dense icon={<AssignmentOutlinedIcon />} title={`ยังไม่มีรายงานใน ${HISTORY_DAYS} วันที่ผ่านมา`} />
          </Box>
        ) : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }} aria-label="Report history">
            {rows.slice((historyPage - 1) * HISTORY_PAGE, historyPage * HISTORY_PAGE).map((r) => (
              <HistoryRow
                key={`${r.contractorId}-${r.reportDate}`}
                row={r}
                today={today}
                editable={isEditable(r.reportDate)}
                to={reportLink(r.reportDate)}
              />
            ))}
          </Box>
        )}
        {rows.length > HISTORY_PAGE ? (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ px: 2.5, py: 1.25, borderTop: 1, borderColor: "divider" }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {(historyPage - 1) * HISTORY_PAGE + 1}–{Math.min(historyPage * HISTORY_PAGE, rows.length)} จาก {rows.length} วัน
            </Typography>
            <Pagination
              size="small"
              shape="rounded"
              color="primary"
              count={historyPages}
              page={historyPage}
              onChange={(_, p) => setHistoryPage(p)}
              aria-label="หน้าประวัติรายงาน"
            />
          </Stack>
        ) : null}
      </Card>
      </Box>

      <FieldBottomNav />
    </Box>
  );
}
