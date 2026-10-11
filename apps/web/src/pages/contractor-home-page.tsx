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
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { canEditReport } from "@sts/shared";
import dayjs from "dayjs";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { FieldBottomNav } from "@/components/field/field-bottom-nav.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import { useAuthConfig, useMe } from "@/features/auth/index.js";
import {
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

const HISTORY_DAYS = 14;

// Mobile-first field home. Answers "what do I still have to send today?" and lets the
// contractor reopen a recent report — edits stay open until 12:00 the day after.
export function ContractorHomePage() {
  const { projectId, projects } = useCurrentProject();
  const project = projects.find((p) => p.id === projectId);
  const me = useMe();
  const allowResubmit = Boolean(useAuthConfig().data?.data.allowResubmit);

  // Automatically bind to the contractor of the logged-in user
  const myContractors = me.data?.data.contractors ?? [];
  const contractorId = myContractors[0]?.id;

  // The edit window closes at a fixed time, so keep "now" fresh while the page is open.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const today = todayIso();
  const tomorrow = addDaysIso(today, 1);
  const current = useCurrentReport(projectId, today, contractorId);
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

  const reportLink = (date: string, shift?: "morning" | "evening") =>
    `/field/report?date=${date}${contractorId ? `&contractor=${contractorId}` : ""}${shift ? `&shift=${shift}` : ""}`;
  const isEditable = (date: string) => allowResubmit || canEditReport(date, now);
  const sentAt = (iso: string | null | undefined) => (iso ? `ส่งแล้ว ${dayjs(iso).format("HH:mm")} น.` : "ส่งแล้ว");

  const next = !morningDone
    ? { label: "ส่ง Daily Report", to: reportLink(today, "morning") }
    : !eveningDone
      ? { label: "ส่ง Daily Request", to: reportLink(today, "evening") }
      : null;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const initial = (me.data?.data.user.displayName ?? me.data?.data.user.email ?? "?").charAt(0).toUpperCase();
  const loadError = [current.error, history.error].find((e) => e instanceof HttpError) as HttpError | undefined;

  return (
    <Box sx={{ maxWidth: { xs: 480, md: 960 }, mx: "auto", pb: 10 }}>
      <Card sx={{ bgcolor: "navy.dark", border: "none", mb: 2 }}>
        <CardContent sx={{ p: 2.5, color: "common.white" }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Typography variant="caption" sx={{ color: "#9DB4CC", fontVariantNumeric: "tabular-nums" }}>
                {dayjs(now).format("HH:mm")} · {formatThaiDate(today)}
              </Typography>
              <Typography variant="h4" sx={{ color: "common.white" }}>
                {greeting}
              </Typography>
              <Typography variant="body2" sx={{ color: "#C9D6E3" }}>
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
                caption={morningDone ? sentAt(report?.morningSubmittedAt) : "ยังไม่ส่ง · รายงานเช้า กำลังคน และแผนงาน"}
                action={
                  <Button
                    component={RouterLink}
                    to={reportLink(today, "morning")}
                    size="small"
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
                caption={eveningDone ? sentAt(report?.eveningSubmittedAt) : "ยังไม่ส่ง · รายงานบ่าย ผลงาน และคำขอพรุ่งนี้"}
                action={
                  <Button
                    component={RouterLink}
                    to={reportLink(today, "evening")}
                    size="small"
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
        <Button component={RouterLink} to={next.to} size="large" fullWidth sx={{ minHeight: 48, mb: 2 }}>
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
          <Stack alignItems="center" spacing={1} sx={{ p: 3, color: "text.secondary" }}>
            <AssignmentOutlinedIcon />
            <Typography variant="body2">ยังไม่มีรายงานใน {HISTORY_DAYS} วันที่ผ่านมา</Typography>
          </Stack>
        ) : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }} aria-label="ประวัติรายงาน">
            {rows.map((r) => (
              <HistoryRow
                key={r.id}
                row={r}
                today={today}
                editable={isEditable(r.reportDate)}
                to={reportLink(r.reportDate)}
              />
            ))}
          </Box>
        )}
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
  action,
}: {
  icon: ComponentType<SvgIconProps>;
  tone: "success" | "warning" | "info";
  title: string;
  caption: string;
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
  const review =
    row.reviewStatus === "approved"
      ? { status: "approved", label: "EPS อนุมัติ" }
      : row.reviewStatus === "rejected"
        ? { status: "rejected", label: "ตีกลับแก้ไข" }
        : { status: "pending", label: "รอ EPS ตรวจ" };

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
            <StatusChip status={morning ? "submitted" : "draft"} label={morning ? "Daily Report" : "Daily Report ยังไม่ส่ง"} />
            <StatusChip status={evening ? "submitted" : "draft"} label={evening ? "Daily Request" : "Daily Request ยังไม่ส่ง"} />
            {anySent ? <StatusChip status={review.status} label={review.label} /> : null}
          </Stack>
          {row.reviewStatus === "rejected" && row.reviewNote ? (
            <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "error.dark" }}>
              EPS: {row.reviewNote}
            </Typography>
          ) : null}
        </Box>
        <Stack alignItems="flex-end" spacing={0.25} sx={{ flexShrink: 0 }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {evening ? (
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
              size="small"
              variant={editable && anySent ? "contained" : "outlined"}
              sx={{ minWidth: 64 }}
            >
              {editable ? (anySent ? "แก้ไข" : "ส่ง") : "ดู"}
            </Button>
          </Stack>
          {editable && anySent ? (
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
              {until}
            </Typography>
          ) : !editable && anySent && relative ? (
            // Only worth saying where the window just closed; the section subtitle states the rule.
            <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: "nowrap" }}>
              ปิดแก้ไขแล้ว
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}
