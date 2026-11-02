import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { QueryError } from "@/components/ui/query-error.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { formatNumber } from "@/lib/format.js";
import { formatThaiDate } from "@/lib/dates.js";
import { useReviewDialog, type ReviewPart } from "../hooks/use-review-dialog.js";
import { overtimeSummary } from "../utils/overtime.js";
import { ReviewMorning } from "./review-morning.js";
import { ReviewEvening } from "./review-evening.js";

function ShiftChip({ label, sent, at }: { label: string; sent: boolean; at?: string | null }) {
  return (
    <Chip
      size="small"
      icon={sent ? <CheckCircleOutlineIcon /> : <RadioButtonUncheckedIcon />}
      label={`${label}: ${sent ? "Submitted" : "Not submitted"}`}
      sx={{ bgcolor: sent ? "common.white" : "transparent", color: sent ? "primary.main" : "common.white", border: 1, borderColor: "rgba(255,255,255,0.5)", fontWeight: 600, "& .MuiChip-icon": { color: "inherit" } }}
      title={sent && at ? `ส่งเมื่อ ${at}` : undefined}
    />
  );
}

// Everything the contractor filled that day, as the two forms (Daily Report = morning, Daily Request = evening).
export function ReviewDialog(props: Parameters<typeof useReviewDialog>[0]) {
  const ed = useReviewDialog(props);
  const { part, setPart, reportQuery, data, dataLoading, dataError, report, onClose } = ed;
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("md"));
  const morningSent = report?.morningStatus === "submitted", eveningSent = report?.eveningStatus === "submitted";

  // Summary strip: the totals the dashboards use (server-calculated), whichever shifts were sent.
  const morningTotal = data ? data.thaiMale + data.thaiFemale + data.foreignMale + data.foreignFemale : 0;
  const headcount = morningSent ? morningTotal : eveningSent ? data?.eveningHeadcount ?? 0 : 0;
  const hoursKnown = data?.workHours != null;
  const summary = data ? [
    { label: "กำลังคน", value: `${headcount} คน`, sub: [morningSent ? `เช้า ${morningTotal}` : "ยังไม่ส่งเช้า", eveningSent ? `บ่าย ${data.eveningHeadcount}` : "ยังไม่ส่งบ่าย"].join(" · ") },
    { label: "เวลาทำงาน / OT", value: hoursKnown ? `${data.workHours} ชม.` : "—", sub: eveningSent ? overtimeSummary(data) : "ยังไม่ส่งบ่าย" },
    { label: "Man-day · NMH", value: hoursKnown ? `${formatNumber(data.manDays)} · ${formatNumber(data.manHours)} ชม.` : "—", sub: hoursKnown ? "คน-วัน · ชั่วโมงคนรวม" : "รอเวลาทำงานจากรายงานเช้า" },
  ] : [];

  return (
    <Dialog open={report !== null} onClose={onClose} fullWidth maxWidth="lg" fullScreen={phone} scroll="paper" slotProps={{ paper: { sx: { height: phone ? undefined : "min(92vh, 960px)" } } }}>
      <DialogTitle sx={{ p: 2.5, pb: 1.5, bgcolor: "navy.dark", color: "common.white" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={report?.contractorCode ?? "CTR"} size="small" sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "common.white", fontWeight: 700 }} />
              <Typography variant="h6" noWrap sx={{ color: "common.white", fontWeight: 700 }}>{report?.contractorName}</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mt: 0.5 }}>
              รายงานประจำวัน · {report ? formatThaiDate(report.reportDate) : ""}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
              <ShiftChip label="Daily Report (เช้า)" sent={morningSent} at={data?.morningSubmittedAt ? new Date(data.morningSubmittedAt).toLocaleString("th-TH") : null} />
              <ShiftChip label="Daily Request (บ่าย)" sent={eveningSent} at={data?.eveningSubmittedAt ? new Date(data.eveningSubmittedAt).toLocaleString("th-TH") : null} />
            </Stack>
          </Box>
          <IconButton aria-label="Close" onClick={onClose} sx={{ color: "common.white", mr: -1, mt: -0.5 }}><CloseOutlinedIcon /></IconButton>
        </Stack>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}>
        <Tabs value={part} onChange={(_, v: ReviewPart) => setPart(v)} variant="fullWidth" aria-label="Daily forms">
          <Tab value="morning" icon={morningSent ? <CheckCircleOutlineIcon /> : <RadioButtonUncheckedIcon />} iconPosition="start" label={phone ? "เช้า" : "เช้า · Daily Report"} />
          <Tab value="evening" icon={eveningSent ? <CheckCircleOutlineIcon /> : <RadioButtonUncheckedIcon />} iconPosition="start" label={phone ? "บ่าย" : "บ่าย · Daily Request"} />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 2.5, bgcolor: "background.default" }}>
        {dataLoading ? (
          <Stack spacing={1.5} aria-busy="true">
            <BlockSkeleton height={72} />
            <BlockSkeleton height={160} />
            <BlockSkeleton height={120} />
          </Stack>
        ) : dataError ? (
          <QueryError error={dataError} onRetry={() => void reportQuery.refetch()} />
        ) : !data ? (
          <Alert severity="info">ยังไม่มีข้อมูลรายงานของรายการนี้ในระบบ — ผู้รับเหมายังไม่ได้ส่งข้อมูล</Alert>
        ) : (
          <Stack spacing={2.5}>
            {/* Phone: three compact cells in one row (the detail line is hidden) so the form starts on screen one. */}
            <Grid container spacing={{ xs: 0.75, sm: 1.5 }}>
              {summary.map((s) => (
                <Grid key={s.label} size={4}>
                  <Box sx={{ px: { xs: 1, sm: 2 }, py: { xs: 0.75, sm: 1.25 }, height: "100%", border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{s.label}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3, fontSize: { xs: "0.95rem", sm: undefined } }}>{s.value}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>{s.sub}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            {part === "morning" ? <ReviewMorning ed={ed} /> : <ReviewEvening ed={ed} />}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="outlined" startIcon={<PictureAsPdfOutlinedIcon />} disabled={!report?.id}
          onClick={() => report?.id && window.open(`/daily-reports/${report.id}/print`, "_blank", "noopener")}>
          Export PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
