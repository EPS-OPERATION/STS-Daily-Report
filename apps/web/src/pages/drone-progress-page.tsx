import { useMemo, useState } from "react";
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
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import CollectionsIcon from "@mui/icons-material/Collections";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import ContrastIcon from "@mui/icons-material/Contrast";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { PageHeader } from "@/components/ui/page-header.js";
import {
  DroneLogCard,
  DroneSingleViewer,
  DroneSplitSlider,
  DroneUploadDialog,
  MOCK_DRONE_LOGS,
  type DronePhotoLog,
} from "@/features/drone/index.js";

type DisplayMode = "single" | "comparison";

export function DroneProgressPage() {
  const [logs, setLogs] = useState<DronePhotoLog[]>(MOCK_DRONE_LOGS);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("comparison");

  // Single View selection
  const [singleDate, setSingleDate] = useState<Dayjs | null>(dayjs("2026-10-01"));

  // Comparison selection: Baseline (Date A) and Target (Date B)
  const [baseDate, setBaseDate] = useState<Dayjs | null>(dayjs("2026-09-05"));
  const [targetDate, setTargetDate] = useState<Dayjs | null>(dayjs("2026-10-01"));

  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  // Helper to find closest or matching log for a given date
  const findLogByDate = (d: Dayjs | null): DronePhotoLog => {
    if (!d || !d.isValid()) return logs[0];
    const iso = d.format("YYYY-MM-DD");
    const exact = logs.find((l) => l.date === iso);
    if (exact) return exact;

    // Pick closest date
    let closest = logs[0];
    let minDiff = Math.abs(dayjs(logs[0].date).diff(d, "day"));
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

  // Duration in days between two comparison dates
  const daysDiff = useMemo(() => {
    if (!baseDate || !targetDate) return 0;
    return Math.abs(targetDate.diff(baseDate, "day"));
  }, [baseDate, targetDate]);

  const handleAddLog = (newLog: DronePhotoLog) => {
    setLogs((prev) => [newLog, ...prev]);
    const d = dayjs(newLog.date);
    setSingleDate(d);
    setTargetDate(d);
  };

  const handleSwapComparison = () => {
    const temp = baseDate;
    setBaseDate(targetDate);
    setTargetDate(temp);
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Page Header */}
      <PageHeader
        title="Drone Site Inspection & Progress Survey"
        subtitle="ระบบบันทึกภาพถ่ายทางอากาศและการสำรวจความก้าวหน้าทางกายภาพ — โครงการโรงไฟฟ้าชีวมวล STS 9.9 MW"
        actions={
          <Button
            variant="contained"
            startIcon={<AddPhotoAlternateIcon />}
            onClick={() => setIsUploadOpen(true)}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            เพิ่มบันทึกภาพโดรน
          </Button>
        }
      />

      {/* Top Display Mode Switcher & Calendar Filter Card */}
      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, mb: 3, bgcolor: "background.paper" }}>
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Stack spacing={2.5}>
            {/* View Mode Toggle Row */}
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
                size="small"
                sx={{ bgcolor: "action.hover" }}
              >
                <ToggleButton
                  value="single"
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
                  <CameraAltOutlinedIcon fontSize="small" />
                  ตรวจสอบภาพเดี่ยว (Single View)
                </ToggleButton>
                <ToggleButton
                  value="comparison"
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
                  <ContrastIcon fontSize="small" />
                  เปรียบเทียบความก้าวหน้า (Comparison Mode)
                </ToggleButton>
              </ToggleButtonGroup>

              <Typography variant="caption" color="text.secondary">
                {displayMode === "single"
                  ? "กดเลือกวันที่จากปฏิทินเพื่อดูภาพถ่ายความละเอียดสูงรายรอบ"
                  : "เลือกวันที่ 2 ช่วงเวลาจากปฏิทินเพื่อเลื่อนเปรียบเทียบความเปลี่ยนแปลง"}
              </Typography>
            </Stack>

            {/* Mode 1: Single Date Picker */}
            {displayMode === "single" ? (
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                <DatePicker
                  label="เลือกวันที่สำรวจ (Survey Date)"
                  value={singleDate}
                  onChange={(newVal) => setSingleDate(newVal)}
                  format="D MMM YYYY"
                  slotProps={{
                    textField: {
                      size: "small",
                      sx: { minWidth: 240, bgcolor: "background.paper" },
                    },
                  }}
                />

                {/* Available survey quick chips */}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", gap: 0.75 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                    รอบสำรวจที่มีในระบบ:
                  </Typography>
                  {logs.map((l) => (
                    <Chip
                      key={l.id}
                      label={`${dayjs(l.date).format("D MMM YYYY")} — ${l.title}`}
                      size="small"
                      clickable
                      color={singlePhoto.id === l.id ? "primary" : "default"}
                      variant={singlePhoto.id === l.id ? "filled" : "outlined"}
                      onClick={() => setSingleDate(dayjs(l.date))}
                      sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                    />
                  ))}
                </Stack>
              </Stack>
            ) : (
              /* Mode 2: Dual Date Comparison Pickers */
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                {/* Baseline Date Picker */}
                <Stack spacing={0.5}>
                  <DatePicker
                    label="วันที่สำรวจฐาน (Baseline Date)"
                    value={baseDate}
                    onChange={(newVal) => setBaseDate(newVal)}
                    format="D MMM YYYY"
                    slotProps={{
                      textField: {
                        size: "small",
                        sx: { minWidth: 220, bgcolor: "background.paper" },
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                    {photoA.title}
                  </Typography>
                </Stack>

                {/* Swap Button */}
                <Box sx={{ alignSelf: { xs: "flex-start", md: "center" }, mb: { xs: 0, md: 2 } }}>
                  <Tooltip title="สลับฝั่งภาพฐานและภาพเปรียบเทียบ">
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      onClick={handleSwapComparison}
                      sx={{ minWidth: 40, p: 0.75 }}
                    >
                      <CompareArrowsIcon fontSize="small" />
                    </Button>
                  </Tooltip>
                </Box>

                {/* Target Date Picker */}
                <Stack spacing={0.5}>
                  <DatePicker
                    label="วันที่สำรวจเปรียบเทียบ (Target Date)"
                    value={targetDate}
                    onChange={(newVal) => setTargetDate(newVal)}
                    format="D MMM YYYY"
                    slotProps={{
                      textField: {
                        size: "small",
                        sx: { minWidth: 220, bgcolor: "background.paper" },
                      },
                    }}
                  />
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, pl: 0.5 }}>
                    {photoB.title}
                  </Typography>
                </Stack>

                {/* Duration Badge */}
                <Box sx={{ mb: { xs: 0, md: 2 } }}>
                  <Chip
                    icon={<CalendarMonthIcon fontSize="small" />}
                    label={`ช่วงห่างเวลา: ${daysDiff} วัน`}
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

      {/* Main Visual Display Section */}
      <Box sx={{ mb: 4 }}>
        {displayMode === "single" ? (
          <DroneSingleViewer photo={singlePhoto} />
        ) : (
          <DroneSplitSlider photoA={photoA} photoB={photoB} />
        )}
      </Box>

      {/* Photo Log Gallery / History */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CollectionsIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                คลังภาพสำรวจทางอากาศ ({logs.length} รอบบิน)
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              คลิกเลือกภาพเพื่อนำมาแสดงในมุมมองภาพเดี่ยว หรือตั้งเป็นภาพเปรียบเทียบในระบบ
            </Typography>
          </Stack>
        </Stack>

        <Grid container spacing={2.5}>
          {logs.map((log) => (
            <Grid key={log.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <DroneLogCard
                log={log}
                isSelectedA={displayMode === "single" ? singlePhoto.id === log.id : photoA.id === log.id}
                isSelectedB={displayMode === "single" ? false : photoB.id === log.id}
                onSelectA={(l) => {
                  if (displayMode === "single") {
                    setSingleDate(dayjs(l.date));
                  } else {
                    setBaseDate(dayjs(l.date));
                  }
                }}
                onSelectB={(l) => {
                  if (displayMode === "single") {
                    setSingleDate(dayjs(l.date));
                  } else {
                    setTargetDate(dayjs(l.date));
                  }
                }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Upload Dialog */}
      <DroneUploadDialog
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmit={handleAddLog}
      />
    </Box>
  );
}
