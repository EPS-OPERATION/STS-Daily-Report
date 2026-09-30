import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import WbTwilightOutlinedIcon from "@mui/icons-material/WbTwilightOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FieldBottomNav } from "@/components/field/field-bottom-nav.js";
import {
  EveningForm,
  MorningForm,
  ReportSummary,
  formatThaiDate,
  todayIso,
  useBuildings,
  useCurrentReport,
  type Shift,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Contractor daily report: morning check-in (manpower → building allocation,
// machinery, permits) and evening check-out (OT, actual %, photos, signature).
// ?date=YYYY-MM-DD back-fills another day; ?shift=morning|evening picks the tab.
export function FieldReportPage() {
  const [params, setParams] = useSearchParams();
  const date = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : todayIso();
  const { projectId, projects } = useCurrentProject();
  const project = projects.find((p) => p.id === projectId);
  const current = useCurrentReport(projectId, date);
  const buildings = useBuildings(projectId);
  const [toast, setToast] = useState<string | null>(null);

  const report = current.data?.data.report ?? null;
  const contractor = current.data?.data.contractor;
  const morningDone = report?.morningStatus === "submitted";
  const eveningDone = report?.eveningStatus === "submitted";
  const requested = params.get("shift");
  const shift: Shift =
    requested === "morning" || requested === "evening" ? requested : morningDone && !eveningDone ? "evening" : "morning";

  const setShift = (next: Shift) => {
    const p = new URLSearchParams(params);
    p.set("shift", next);
    setParams(p, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadError = current.error instanceof HttpError ? current.error : null;

  return (
    <Box sx={{ maxWidth: { xs: 520, md: 760 }, mx: "auto", pb: 10 }}>
      <Card sx={{ bgcolor: "navy.dark", border: "none", mb: 2 }}>
        <CardContent sx={{ p: 2.5, color: "common.white" }}>
          <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ opacity: 0.8 }}>
            <Typography variant="caption" sx={{ color: "inherit" }}>
              {project?.name ?? "STS 9.9 MW Biomass Power Plant"}
            </Typography>
            <Typography variant="caption" sx={{ color: "inherit", textAlign: "right" }}>
              {contractor ? `${contractor.code} · ${contractor.name}` : ""}
            </Typography>
          </Stack>
          <Typography variant="h4" sx={{ color: "common.white", mt: 0.5, mb: 1.5 }}>
            รายงานประจำวัน · {formatThaiDate(date)}
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={shift}
            onChange={(_, v: Shift | null) => v && setShift(v)}
            aria-label="เลือกรอบรายงาน"
            sx={{
              bgcolor: "rgba(255,255,255,0.12)",
              borderRadius: 2,
              p: 0.375,
              "& .MuiToggleButtonGroup-grouped.MuiToggleButton-root": {
                border: 0,
                borderRadius: 2,
                color: "rgba(255,255,255,0.75)",
                fontWeight: 600,
                py: 1,
                gap: 0.75,
                whiteSpace: "nowrap",
              },
              // Palette paths can't carry !important, so win on specificity instead.
              "& .MuiToggleButtonGroup-grouped.MuiToggleButton-root.Mui-selected, & .MuiToggleButtonGroup-grouped.MuiToggleButton-root.Mui-selected:hover":
                { bgcolor: "common.white", color: "navy.dark" },
            }}
          >
            <ToggleButton value="morning">
              <WbSunnyOutlinedIcon fontSize="small" />
              เช้า<Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}> — Check-in</Box>
              {morningDone ? <CheckCircleOutlineIcon fontSize="small" color="success" /> : null}
            </ToggleButton>
            <ToggleButton value="evening">
              <WbTwilightOutlinedIcon fontSize="small" />
              เย็น<Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}> — Check-out</Box>
              {eveningDone ? <CheckCircleOutlineIcon fontSize="small" color="success" /> : null}
            </ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>

      {current.isLoading || buildings.isLoading || !projectId ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={160} />
          <Skeleton variant="rounded" height={280} />
        </Stack>
      ) : loadError ? (
        <Alert severity={loadError.status === 403 ? "warning" : "error"}>
          {loadError.status === 403
            ? "บัญชีนี้ยังไม่ได้ผูกกับผู้รับเหมา — ติดต่อ EPS เพื่อเพิ่มสิทธิ์"
            : `โหลดรายงานไม่สำเร็จ: ${loadError.message}`}
        </Alert>
      ) : !contractor ? null : eveningDone && report ? (
        <ReportSummary report={report} buildings={buildings.data?.data ?? []} />
      ) : shift === "morning" ? (
        <MorningForm
          key={`${report?.id ?? "new"}-${report?.morningSubmittedAt ?? ""}`}
          projectId={projectId}
          date={date}
          contractor={contractor}
          buildings={buildings.data?.data ?? []}
          report={report}
          onSubmitted={() => {
            setToast("ส่งรายงานเช้าแล้ว");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : !report || !morningDone ? (
        <Card>
          <CardContent sx={{ p: 3, textAlign: "center" }}>
            <Stack spacing={2} alignItems="center">
              <WbSunnyOutlinedIcon color="warning" sx={{ fontSize: 40 }} />
              <Typography variant="h5">ยังไม่ได้ส่งรายงานเช้า</Typography>
              <Typography variant="body2" color="text.secondary">
                ต้องส่ง Check-in เช้า (จัดสรรคนลงอาคารครบ) ก่อน จึงจะรายงานผลงานเย็นได้
              </Typography>
              <Button onClick={() => setShift("morning")}>ไปกรอกรายงานเช้า</Button>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <EveningForm
          key={report.id}
          report={report}
          buildings={buildings.data?.data ?? []}
          onSubmitted={() => {
            setToast("ส่งรายงานเย็นเรียบร้อย");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast(null)}>
          {toast}
        </Alert>
      </Snackbar>

      <FieldBottomNav />
    </Box>
  );
}
