import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import WbTwilightOutlinedIcon from "@mui/icons-material/WbTwilightOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
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
import { useAuthConfig, useMe } from "@/features/auth/index.js";
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
  const me = useMe();
  const allowResubmit = Boolean(useAuthConfig().data?.data.allowResubmit);
  // One login can hold several contractors (shared trial account): pick which one is reporting.
  const myContractors = me.data?.data.contractors ?? [];
  const requestedContractor = params.get("contractor");
  const contractorId =
    myContractors.find((c) => c.id === requestedContractor)?.id ?? myContractors[0]?.id;
  const current = useCurrentReport(projectId, date, contractorId);
  const buildings = useBuildings(projectId);
  const [toast, setToast] = useState<string | null>(null);

  const report = current.data?.data.report ?? null;
  const contractor = current.data?.data.contractor;
  const morningDone = report?.morningStatus === "submitted";
  const eveningDone = report?.eveningStatus === "submitted";
  const requested = params.get("shift");
  const shift: Shift =
    requested === "morning" || requested === "evening"
      ? requested
      : morningDone && !eveningDone
        ? "evening"
        : !morningDone && new Date().getHours() >= 15
          ? "evening"
          : "morning";

  const setContractor = (id: string) => {
    const p = new URLSearchParams(params);
    p.set("contractor", id);
    setParams(p, { replace: true });
  };

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
          {myContractors.length > 1 ? (
            <TextField
              select
              size="small"
              label="รายงานในนามผู้รับเหมา"
              value={contractorId ?? ""}
              onChange={(e) => setContractor(e.target.value)}
              sx={{
                mt: 1.5,
                bgcolor: "common.white",
                borderRadius: 1,
                width: "100%",
              }}
            >
              {myContractors.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
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
              บ่าย<Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}> — Check-out</Box>
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
      ) : !contractor || !current.data ? null : shift === "morning" ? (
        !allowResubmit && morningDone && eveningDone && report ? (
          <ReportSummary report={report} buildings={buildings.data?.data ?? []} />
        ) : (
        <MorningForm
          key={`${contractor.id}-${report?.id ?? "new"}-${report?.morningSubmittedAt ?? ""}`}
          projectId={projectId}
          date={date}
          contractor={contractor}
          buildings={buildings.data?.data ?? []}
          report={report}
          plannedToday={current.data.data.plannedToday}
          onSubmitted={() => {
            setToast("ส่งรายงานเช้าแล้ว");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
        )
      ) : !allowResubmit && eveningDone && report ? (
        <ReportSummary report={report} buildings={buildings.data?.data ?? []} />
      ) : (
        // Evening never waits for the morning shift.
        <>
        {eveningDone && report ? (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => window.open(`/daily-reports/${report.id}/print`, "_blank", "noopener")}>
                Export PDF
              </Button>
            }
          >
            ส่งรายงานบ่ายแล้ว — แก้ไขและส่งซ้ำได้ (โหมดทดลอง)
          </Alert>
        ) : null}
        <EveningForm
          key={`${contractor.id}-${report?.id ?? "new"}-${report?.eveningSubmittedAt ?? ""}`}
          projectId={projectId}
          date={date}
          contractor={contractor}
          report={report}
          buildings={buildings.data?.data ?? []}
          onSubmitted={() => {
            setToast("ส่งรายงานบ่ายเรียบร้อย");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
        </>
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
