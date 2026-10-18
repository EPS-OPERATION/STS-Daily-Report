import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonthOutlined";
import CompareArrowsIcon from "@mui/icons-material/CompareArrowsOutlined";
import CollectionsIcon from "@mui/icons-material/CollectionsOutlined";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import ContrastIcon from "@mui/icons-material/ContrastOutlined";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { shortDate } from "@/lib/dates.js";
import { useCurrentProject } from "@/features/projects/index.js";
import {
  DroneLogCard,
  DroneSingleViewer,
  DroneSplitSlider,
  DroneUploadDialog,
  useDeleteDroneLog,
  useDroneLogs,
  type DronePhotoLog,
} from "@/features/drone/index.js";

type DisplayMode = "single" | "comparison";

export function DroneProgressPage() {
  const { projectId } = useCurrentProject();
  const query = useDroneLogs(projectId);
  const logs = useMemo(() => query.data?.data ?? [], [query.data]);
  const remove = useDeleteDroneLog();

  const [displayMode, setDisplayMode] = useState<DisplayMode>("comparison");
  const [singleDate, setSingleDate] = useState<Dayjs | null>(null);
  const [baseDate, setBaseDate] = useState<Dayjs | null>(null);
  const [targetDate, setTargetDate] = useState<Dayjs | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DronePhotoLog | null>(null);

  // First survey = baseline, latest = target, until the user picks dates.
  useEffect(() => {
    if (logs.length === 0) return;
    const first = logs[0]!;
    const last = logs[logs.length - 1]!;
    setSingleDate((v) => v ?? dayjs(last.date));
    setBaseDate((v) => v ?? dayjs(first.date));
    setTargetDate((v) => v ?? dayjs(last.date));
  }, [logs]);

  // Closest survey to the picked date (exact match preferred).
  const findLogByDate = (d: Dayjs | null): DronePhotoLog | undefined => {
    if (logs.length === 0) return undefined;
    if (!d || !d.isValid()) return logs[logs.length - 1];
    const iso = d.format("YYYY-MM-DD");
    const exact = logs.find((l) => l.date === iso);
    if (exact) return exact;
    let closest = logs[0]!;
    let minDiff = Math.abs(dayjs(closest.date).diff(d, "day"));
    for (const l of logs) {
      const diff = Math.abs(dayjs(l.date).diff(d, "day"));
      if (diff < minDiff) {
        minDiff = diff;
        closest = l;
      }
    }
    return closest;
  };

  const singlePhoto = useMemo(() => findLogByDate(singleDate), [logs, singleDate]);
  const photoA = useMemo(() => findLogByDate(baseDate), [logs, baseDate]);
  const photoB = useMemo(() => findLogByDate(targetDate), [logs, targetDate]);

  const daysDiff = useMemo(() => {
    if (!baseDate || !targetDate) return 0;
    return Math.abs(targetDate.diff(baseDate, "day"));
  }, [baseDate, targetDate]);

  const handleSwapComparison = () => {
    const temp = baseDate;
    setBaseDate(targetDate);
    setTargetDate(temp);
  };

  return (
    <Box sx={{ pb: 6 }}>
      <PageHeader
        title="Drone Site Inspection & Progress Survey"
        subtitle="ระบบบันทึกภาพถ่ายทางอากาศและการสำรวจความก้าวหน้าทางกายภาพ — โครงการโรงไฟฟ้าชีวมวล STS 9.9 MW"
        actions={
          <Button
            variant="contained"
            startIcon={<AddPhotoAlternateIcon />}
            onClick={() => setIsUploadOpen(true)}
            disabled={!projectId}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Add drone photo log
          </Button>
        }
      />

      {query.isError ? (
        <QueryError error={query.error as Error} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <BlockSkeleton height={480} />
      ) : logs.length === 0 ? (
        <Card variant="outlined">
          <EmptyState
            icon={<AddPhotoAlternateIcon />}
            title="No drone surveys yet"
            description="อัปโหลดภาพถ่ายโดรนรอบแรกเพื่อเริ่มติดตามความก้าวหน้าทางอากาศ"
            action={
              <Button variant="outlined" onClick={() => setIsUploadOpen(true)} disabled={!projectId}>
                Add drone photo log
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, mb: 3, bgcolor: "background.paper" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Stack spacing={2.5}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ sm: "center" }}
                  spacing={1.5}
                >
                  <ToggleButtonGroup
                    value={displayMode}
                    exclusive
                    onChange={(_, val) => val && setDisplayMode(val)}
                    sx={{ bgcolor: "action.hover" }}
                  >
                    <ToggleButton value="single" sx={{ textTransform: "none", fontWeight: 700, px: 2.5, py: 1, display: "flex", alignItems: "center", gap: 1 }}>
                      <CameraAltOutlinedIcon fontSize="small" />
                      Single View
                    </ToggleButton>
                    <ToggleButton value="comparison" sx={{ textTransform: "none", fontWeight: 700, px: 2.5, py: 1, display: "flex", alignItems: "center", gap: 1 }}>
                      <ContrastIcon fontSize="small" />
                      Comparison Mode
                    </ToggleButton>
                  </ToggleButtonGroup>

                  <Typography variant="caption" color="text.secondary">
                    {displayMode === "single"
                      ? "กดเลือกวันที่จากปฏิทินเพื่อดูภาพถ่ายความละเอียดสูงรายรอบ"
                      : "เลือกวันที่ 2 ช่วงเวลาจากปฏิทินเพื่อเลื่อนเปรียบเทียบความเปลี่ยนแปลง"}
                  </Typography>
                </Stack>

                {displayMode === "single" ? (
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                    <DatePicker
                      label="Survey date"
                      value={singleDate}
                      onChange={(newVal) => setSingleDate(newVal)}
                      format="D MMM YYYY"
                      slotProps={{ textField: { size: "small", sx: { minWidth: 240, bgcolor: "background.paper" } } }}
                    />
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", gap: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                        รอบสำรวจที่มีในระบบ:
                      </Typography>
                      {logs.map((l) => (
                        <Chip
                          key={l.id}
                          label={`${shortDate(l.date)} — ${l.title}`}
                          clickable
                          color={singlePhoto?.id === l.id ? "primary" : "default"}
                          variant={singlePhoto?.id === l.id ? "filled" : "outlined"}
                          onClick={() => setSingleDate(dayjs(l.date))}
                          sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                        />
                      ))}
                    </Stack>
                  </Stack>
                ) : (
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                    <Stack spacing={0.5}>
                      <DatePicker
                        label="Baseline date"
                        value={baseDate}
                        onChange={(newVal) => setBaseDate(newVal)}
                        format="D MMM YYYY"
                        slotProps={{ textField: { size: "small", sx: { minWidth: 220, bgcolor: "background.paper" } } }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                        {photoA?.title ?? ""}
                      </Typography>
                    </Stack>

                    <Box sx={{ alignSelf: { xs: "flex-start", md: "center" }, mb: { xs: 0, md: 2 } }}>
                      <Tooltip title="Swap baseline and target">
                        <Button variant="outlined" color="inherit" onClick={handleSwapComparison} sx={{ minWidth: 40, p: 0.75 }}>
                          <CompareArrowsIcon fontSize="small" />
                        </Button>
                      </Tooltip>
                    </Box>

                    <Stack spacing={0.5}>
                      <DatePicker
                        label="Target date"
                        value={targetDate}
                        onChange={(newVal) => setTargetDate(newVal)}
                        format="D MMM YYYY"
                        slotProps={{ textField: { size: "small", sx: { minWidth: 220, bgcolor: "background.paper" } } }}
                      />
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, pl: 0.5 }}>
                        {photoB?.title ?? ""}
                      </Typography>
                    </Stack>

                    <Box sx={{ mb: { xs: 0, md: 2 } }}>
                      <Chip
                        icon={<CalendarMonthIcon fontSize="small" />}
                        label={`Interval: ${daysDiff} days`}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Box sx={{ mb: 4 }}>
            {displayMode === "single" ? (
              singlePhoto ? <DroneSingleViewer photo={singlePhoto} /> : null
            ) : photoA && photoB ? (
              <DroneSplitSlider photoA={photoA} photoB={photoB} />
            ) : null}
          </Box>

          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <CollectionsIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                คลังภาพสำรวจทางอากาศ ({logs.length} รอบบิน)
              </Typography>
            </Stack>

            <Grid container spacing={2.5}>
              {logs.map((log) => (
                <Grid key={log.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <DroneLogCard
                    log={log}
                    isSelectedA={displayMode === "single" ? singlePhoto?.id === log.id : photoA?.id === log.id}
                    isSelectedB={displayMode === "single" ? false : photoB?.id === log.id}
                    onSelectA={(l) => {
                      if (displayMode === "single") setSingleDate(dayjs(l.date));
                      else setBaseDate(dayjs(l.date));
                    }}
                    onSelectB={(l) => {
                      if (displayMode === "single") setSingleDate(dayjs(l.date));
                      else setTargetDate(dayjs(l.date));
                    }}
                    onDelete={(l) => setDeleteTarget(l)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      )}

      <DroneUploadDialog
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        projectId={projectId}
        onSaved={(iso) => {
          setSingleDate(dayjs(iso));
          setTargetDate(dayjs(iso));
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete drone log?"
        description={deleteTarget ? `ภาพถ่ายรอบ ${shortDate(deleteTarget.date)} จะถูกลบถาวร` : undefined}
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          remove.mutate(deleteTarget.id, {
            onSuccess: () => toast.success("ลบภาพถ่ายโดรนแล้ว"),
            onSettled: () => setDeleteTarget(null),
          });
        }}
      />
    </Box>
  );
}
