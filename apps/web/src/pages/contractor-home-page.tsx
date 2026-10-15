import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
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
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { canEditReport } from "@sts/shared";
import dayjs from "dayjs";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { FieldBottomNav } from "@/components/field/field-bottom-nav.js";
import { EmptySection } from "@/components/ui/empty-state.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import { useAuthConfig, useMe } from "@/features/auth/index.js";
import {
  CopySourceButton,
  addDaysIso,
  formatThaiDate,
  todayIso,
  useCurrentReport,
  useInspectionRequests,
  useReviewQueue,
  type ReviewQueueRow,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";
import { UnlinkedCompany } from "@/features/auth/components/unlinked-company.js";

const HISTORY_DAYS = 14;
const HISTORY_PAGE = 5;

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
    const sent = `ส่งแล้ว ${dayjs(submittedAt).format("HH:mm")} น.`;
    if (updatedAt && dayjs(updatedAt).diff(dayjs(submittedAt), "minute") >= 1) {
      const edit = dayjs(updatedAt).format("HH:mm");
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
                {dayjs(now).format("HH:mm")} · {formatThaiDate(today)}
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
        <Button component={RouterLink} to={next.to} fullWidth sx={{ mb: 2 }}>
          {next.label}
        </Button>
      ) : !current.isLoading && report ? (
        <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mb: 2 }}>
          ส่งครบทั้ง Daily Report และ Daily Request ของวันนี้แล้ว
        </Alert>
      ) : null}

      <Card>
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

      <FieldBottomNav />
    </Box>
  );
}

function TaskRow({
  icon: Icon,
  tone,
  title,
  caption,
  below,
  action,
}: {
  icon: ComponentType<SvgIconProps>;
  tone: "success" | "warning" | "info";
  title: string;
  caption: string;
  /** Optional secondary action under the caption (keeps the row wide on phones). */
  below?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minHeight: 44 }}>
      <Icon color={tone} aria-hidden="true" />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
        {below ? <Box>{below}</Box> : null}
      </Box>
      {action}
    </Stack>
  );
}

function HistoryRow({
  row,
  today,
  editable,
  to,
}: {
  row: ReviewQueueRow;
  today: string;
  editable: boolean;
  to: string;
}) {
  const morning = row.morningStatus === "submitted";
  const evening = row.eveningStatus === "submitted";
  const anySent = morning || evening;
  const relative = row.reportDate === today ? "วันนี้" : row.reportDate === addDaysIso(today, -1) ? "เมื่อวาน" : null;
  // Only today's and yesterday's reports can still be inside the window.
  const until = row.reportDate === today ? "ถึงพรุ่งนี้ 12:00" : "ถึงวันนี้ 12:00";

  return (
    <Box component="li" sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: "divider" }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="baseline">
            <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {formatThaiDate(row.reportDate)}
            </Typography>
            {relative ? (
              <Typography variant="caption" color="text.secondary">
                {relative}
              </Typography>
            ) : null}
          </Stack>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
            <StatusChip
              status={morning ? "submitted" : "draft"}
              label={
                morning
                  ? `Daily Report${row.morningUpdatedAt && dayjs(row.morningUpdatedAt).diff(dayjs(row.morningSubmittedAt), "minute") >= 1 ? ` (แก้ ${dayjs(row.morningUpdatedAt).format("HH:mm")})` : row.morningSubmittedAt ? ` (${dayjs(row.morningSubmittedAt).format("HH:mm")})` : ""}`
                  : "Daily Report ยังไม่ส่ง"
              }
            />
            <StatusChip
              status={evening ? "submitted" : "draft"}
              label={
                evening
                  ? `Daily Request${row.eveningUpdatedAt && dayjs(row.eveningUpdatedAt).diff(dayjs(row.eveningSubmittedAt), "minute") >= 1 ? ` (แก้ ${dayjs(row.eveningUpdatedAt).format("HH:mm")})` : row.eveningSubmittedAt ? ` (${dayjs(row.eveningSubmittedAt).format("HH:mm")})` : ""}`
                  : "Daily Request ยังไม่ส่ง"
              }
            />
          </Stack>
          {/* The 12:00 rule only reaches today and yesterday (trial mode leaves older days editable). */}
          {editable && anySent && relative ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
              แก้ไขได้{until} น.
            </Typography>
          ) : !editable && anySent && relative ? (
            // Only worth saying where the window just closed; the section subtitle states the rule.
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.75 }}>
              ปิดแก้ไขแล้ว
            </Typography>
          ) : null}
        </Box>
        <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {evening && row.id ? (
              <Tooltip title="Export PDF">
                <IconButton
                  size="small"
                  aria-label={`Export PDF ${formatThaiDate(row.reportDate)}`}
                  onClick={() => window.open(`/daily-reports/${row.id}/print`, "_blank", "noopener")}
                >
                  <PictureAsPdfOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            <Button
              component={RouterLink}
              to={to}
              variant={editable && anySent ? "contained" : "outlined"}
              sx={{ minWidth: 64 }}
            >
              {editable ? (anySent ? "แก้ไข" : "ส่ง") : "ดู"}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
