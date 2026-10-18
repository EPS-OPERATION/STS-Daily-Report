import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { StatusChip } from "@/components/ui/status-chip.js";
import { QueryError } from "@/components/ui/query-error.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { formatThaiDate } from "@/lib/dates.js";
import { useReviewDialog } from "../hooks/use-review-dialog.js";
import { ReviewOverviewTab } from "./review-overview-tab.js";
import { ReviewAllocationsTab } from "./review-allocations-tab.js";
import { ReviewRequestsTab } from "./review-requests-tab.js";
import { ReviewSafetyTab } from "./review-safety-tab.js";

export function ReviewDialog(props: Parameters<typeof useReviewDialog>[0]) {
  const ed = useReviewDialog(props);
  const { tab, setTab, reportQuery, data, dataLoading, dataError, report, onClose } = ed;

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
              label={`Daily Report: ${report?.morningStatus === "submitted" ? "Submitted" : "Not submitted"}`}
            />
            <StatusChip
              status={report?.eveningStatus ?? "draft"}
              label={`Daily Request: ${report?.eveningStatus === "submitted" ? "Submitted" : "Not submitted"}`}
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
          <Tab icon={<GroupsOutlinedIcon />} iconPosition="start" label="Manpower & site" />
          <Tab icon={<ConstructionOutlinedIcon />} iconPosition="start" label="Allocation & buildings" />
          <Tab icon={<FactCheckOutlinedIcon />} iconPosition="start" label="Tomorrow's requests" />
          <Tab icon={<HealthAndSafetyOutlinedIcon />} iconPosition="start" label="Safety & signature" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 2.5 }}>
        {dataLoading ? (
          <Stack spacing={1.5} aria-busy="true">
            <BlockSkeleton height={56} />
            <BlockSkeleton height={160} />
            <BlockSkeleton height={120} />
          </Stack>
        ) : dataError ? (
          <QueryError error={dataError} onRetry={() => void reportQuery.refetch()} />
        ) : !data ? (
          <Alert severity="info" sx={{ my: 2 }}>
            ยังไม่มีข้อมูลรายงานเช้า/เย็นของรายการนี้ในระบบ — ไม่สามารถตรวจสอบได้จนกว่าผู้รับเหมาจะส่งข้อมูล
          </Alert>
        ) : (
          <Stack spacing={2.5}>
            {/* TAB 0: Manpower & Site Overview */}
            {tab === 0 && (
              <ReviewOverviewTab ed={ed} />
            )}

            {/* TAB 1: Building Allocations & Progress */}
            {tab === 1 && (
              <ReviewAllocationsTab ed={ed} />
            )}

            {/* TAB 2: Tomorrow's Requests */}
            {tab === 2 && (
              <ReviewRequestsTab ed={ed} />
            )}

            {/* TAB 3: Safety & Sign-off */}
            {tab === 3 && (
              <ReviewSafetyTab ed={ed} />
            )}

          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="outlined"
          startIcon={<PictureAsPdfOutlinedIcon />}
          disabled={!report?.id}
          onClick={() => report?.id && window.open(`/daily-reports/${report.id}/print`, "_blank", "noopener")}
        >
          Export PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
