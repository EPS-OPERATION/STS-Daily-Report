import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import WbTwilightOutlinedIcon from "@mui/icons-material/WbTwilightOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { canEditReport } from "@sts/shared";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FieldBottomNav } from "@/components/field/field-bottom-nav.js";
import { EveningForm } from "@/features/daily-reports/index.js";
import { MorningForm } from "@/features/daily-reports/index.js";
import { ReportSummary } from "@/features/daily-reports/index.js";
import { addDaysIso, formatThaiDate, todayIso } from "@/lib/dates.js";
import { useBuildings } from "@/features/buildings/index.js";
import { useCurrentReport } from "@/features/daily-reports/index.js";
import { type Shift } from "@/features/daily-reports/index.js";
import { useAuthConfig, useMe } from "@/features/auth/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";
import { UnlinkedCompany } from "@/features/auth/components/unlinked-company.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Contractor daily report: morning report (manpower → building allocation,
// machinery, permits) and evening Daily Request (OT, actual %, tomorrow's requests, signature).
// ?date=YYYY-MM-DD back-fills another day; ?shift=morning|evening picks the tab.
export function FieldReportPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const date = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : todayIso();
  const { projectId, projects } = useCurrentProject();
  const project = projects.find((p) => p.id === projectId);
  const me = useMe();
  const allowResubmit = Boolean(useAuthConfig().data?.data.allowResubmit);
  // One login can hold several contractors (shared trial account): pick which one is reporting.
  const allContractors = me.data?.data.contractors ?? [];
  // Memberships are project-scoped; the field app works inside the selected project.
  const myContractors = projectId ? allContractors.filter((c) => c.projectId === projectId) : allContractors;
  const contractorId = myContractors[0]?.id;
  const current = useCurrentReport(projectId, date, contractorId, Boolean(contractorId));
  const buildings = useBuildings(projectId);

  const report = current.data?.data.report ?? null;
  const contractor = current.data?.data.contractor;
  const morningDone = report?.morningStatus === "submitted";
  const eveningDone = report?.eveningStatus === "submitted";
  // Sent shifts stay editable until 12:00 the next day (trial mode: no limit); same rule as the API.
  const editable = allowResubmit || canEditReport(date);
  const editUntil = `${formatThaiDate(addDaysIso(date, 1))} 12:00 น.`;
  const requested = params.get("shift");
  const shift: Shift =
    requested === "morning" || requested === "evening"
      ? requested
      : morningDone && !eveningDone
        ? "evening"
        : !morningDone && new Date().getHours() >= 15
          ? "evening"
          : "morning";

  const setShift = (next: Shift) => {
    const p = new URLSearchParams(params);
    p.set("shift", next);
    setParams(p, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadError = current.error instanceof HttpError ? current.error : null;

  if (me.isSuccess && !myContractors.length) return <UnlinkedCompany />;
  return (
    <Box sx={{ maxWidth: { xs: 520, md: 760 }, mx: "auto", pb: 10 }}>
      <Card sx={{ bgcolor: "navy.dark", border: "none", mb: 2 }}>
        <CardContent sx={{ p: 2.5, color: "common.white" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                component="img"
                src="/brand/logo-eps.png"
                alt="EPS"
                sx={{
                  height: 24,
                  bgcolor: "#FFFFFF",
                  borderRadius: 1,
                  px: 0.75,
                  py: 0.25,
                  objectFit: "contain",
                }}
              />
              <Typography variant="caption" sx={{ color: "inherit", opacity: 0.9, fontWeight: 600 }}>
                {project?.name ?? "STS 9.9 MW Biomass Power Plant"}
              </Typography>
            </Box>
            {contractor ? (
              <Chip
                label={`${contractor.code} · ${contractor.name}`}
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.18)",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: 12,
                  maxWidth: { xs: 200, sm: 340 },
                  "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
                }}
              />
            ) : null}
          </Stack>
          <Typography variant="h4" sx={{ color: "common.white", mt: 0.5, mb: 1.5 }}>
            รายงานประจำวัน · {formatThaiDate(date)}
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={shift}
            onChange={(_, v: Shift | null) => v && setShift(v)}
            aria-label="Select report shift"
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
              เช้า<Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}> · Daily Report</Box>
              {morningDone ? <CheckCircleOutlineIcon fontSize="small" color="success" /> : null}
            </ToggleButton>
            <ToggleButton value="evening">
              <WbTwilightOutlinedIcon fontSize="small" />
              บ่าย<Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}> · Daily Request</Box>
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
        !editable && morningDone && report ? (
          <ReportSummary report={report} buildings={buildings.data?.data ?? []} />
        ) : (
        <MorningForm
          key={`${contractor.id}-${report?.id ?? "new"}-${report?.morningSubmittedAt ?? ""}`}
          projectId={projectId}
          date={date}
          contractor={contractor}
          buildings={buildings.data?.data ?? []}
          report={report}
          autoCopyFrom={ISO_DATE.test(params.get("copy") ?? "") ? params.get("copy")! : undefined}
          onAutoCopyStarted={() => {
            // Copy once: drop the flag so a reload does not copy again.
            const p = new URLSearchParams(params);
            p.delete("copy");
            setParams(p, { replace: true });
          }}
          onSubmitted={() => {
            const isEdit = morningDone;
            const time = dayjs().format("HH:mm");
            toast.success(isEdit ? `บันทึกการแก้ไข Daily Report เรียบร้อย (เวลา ${time} น.)` : `ส่ง Daily Report เรียบร้อย (เวลา ${time} น.)`);
            navigate("/field");
          }}
        />
        )
      ) : !editable && eveningDone && report ? (
        <ReportSummary report={report} buildings={buildings.data?.data ?? []} />
      ) : (
        // Evening never waits for the morning shift.
        <>
        {eveningDone && report ? (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" onClick={() => window.open(`/daily-reports/${report.id}/print`, "_blank", "noopener")}>
                Export PDF
              </Button>
            }
          >
            {report.eveningUpdatedAt
              ? `ส่งรายงานบ่ายแล้วเมื่อ ${report.eveningSubmittedAt ? dayjs(report.eveningSubmittedAt).format("HH:mm") + " น." : ""} (แก้ไขล่าสุด ${dayjs(report.eveningUpdatedAt).format("HH:mm")} น.) — แก้ไขและส่งซ้ำได้`
              : allowResubmit
                ? `ส่งรายงานบ่ายแล้วเมื่อ ${report.eveningSubmittedAt ? dayjs(report.eveningSubmittedAt).format("HH:mm") + " น." : ""} — แก้ไขและส่งซ้ำได้`
                : `ส่งรายงานบ่ายแล้ว — แก้ไขและส่งใหม่ได้ถึง ${editUntil}`}
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
            const isEdit = eveningDone;
            const time = dayjs().format("HH:mm");
            toast.success(isEdit ? `บันทึกการแก้ไข Daily Request เรียบร้อย (เวลา ${time} น.)` : `ส่ง Daily Request เรียบร้อย (เวลา ${time} น.)`);
            navigate("/field");
          }}
        />
        </>
      )}

      <FieldBottomNav />
    </Box>
  );
}
