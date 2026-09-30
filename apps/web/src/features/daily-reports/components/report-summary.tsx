import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { POSITIONS, WEATHER_CONDITIONS } from "@sts/shared";
import dayjs from "dayjs";
import type { Building, DailyReport } from "../types/daily-report.types.js";
import { permitLabel } from "./permit-meta.js";
import { PhotoSection } from "./photo-section.js";
import { RequestSection } from "./request-section.js";
import { SectionCard } from "./section-card.js";

// Read-only view once the evening shift is submitted (the day is closed).
export function ReportSummary({ report, buildings }: { report: DailyReport; buildings: Building[] }) {
  const weather = WEATHER_CONDITIONS.find((w) => w.code === report.weather)?.label;
  const positionLabel = (code: string) => POSITIONS.find((p) => p.code === code)?.label ?? code;
  return (
    <Stack spacing={2}>
      <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
        ส่งรายงานครบทั้งเช้าและเย็นแล้ว
        {report.eveningSubmittedAt ? ` · ${dayjs(report.eveningSubmittedAt).format("HH:mm")}` : ""} — รอ EPS ตรวจสอบ
      </Alert>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h5">กำลังคน</Typography>
            <Typography variant="h5">{report.totalHeadcount} คน</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {report.positions.map((p) => `${positionLabel(p.position)} ${p.headcount}`).join(" · ")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ไทย ช {report.thaiMale} / ญ {report.thaiFemale} · ต่างชาติ ช {report.foreignMale} / ญ {report.foreignFemale} · OT{" "}
            {report.otHours ?? 0} ชม.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {report.startTime ?? "-"}–{report.endTime ?? "-"} · {report.workHours ?? 0} ชม./คน · NMH {report.manHours.toLocaleString()} ชม.
            {weather ? ` · ${weather}` : ""}
            {report.temperatureC !== null ? ` ${report.temperatureC}°C` : ""}
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 0.5, fontWeight: 700, color: report.accidentOccurred ? "error.main" : "success.dark" }}
          >
            {report.accidentOccurred ? `เกิดอุบัติเหตุ: ${report.accidentNote ?? ""}` : "ไม่เกิดอุบัติเหตุ"}
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1.25}>
            {report.allocations.map((a) => {
              const behind = (a.actualPercent ?? 0) < a.planPercent;
              return (
                <Box key={a.id}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {a.buildingName} · {a.headcount} คน
                    </Typography>
                    <Typography variant="body2" color={behind ? "warning.dark" : "success.dark"} sx={{ fontWeight: 700 }}>
                      {a.actualPercent ?? "-"}% / แผน {a.planPercent}%
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {a.workDescription}
                  </Typography>
                  {a.countermeasure ? (
                    <Typography variant="caption" sx={{ display: "block", color: "warning.dark" }}>
                      Countermeasure: {a.countermeasure}
                    </Typography>
                  ) : null}
                </Box>
              );
            })}
          </Stack>
          {report.permits.length > 0 ? (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Work Permits
              </Typography>
              {report.permits.map((p) => (
                <Typography key={p.id} variant="caption" sx={{ display: "block" }}>
                  {p.permitType === "other" ? p.otherLabel : permitLabel(p.permitType)} · {p.buildingCode} · {p.workers} คน
                </Typography>
              ))}
            </>
          ) : null}
          {report.equipment.length > 0 ? (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                เครื่องจักรในไซต์
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                {report.equipment.map((e) => `${e.equipmentType} ×${e.qty}`).join(" · ")}
              </Typography>
            </>
          ) : null}
          {report.machinery.length > 0 ? (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                การจองเครื่องจักร
              </Typography>
              {report.machinery.map((m) => (
                <Typography key={m.id} variant="caption" sx={{ display: "block" }}>
                  {m.machineType}
                  {m.unitTag ? ` (${m.unitTag})` : ""} · {m.buildingCode} · {m.startTime}–{m.endTime}
                </Typography>
              ))}
            </>
          ) : null}
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" color="text.secondary">
            ลงนามโดย {report.signatureName ?? "-"}
            {report.signedAt ? ` · ${dayjs(report.signedAt).format("DD/MM HH:mm")}` : ""}
          </Typography>
        </CardContent>
      </Card>
      <SectionCard index={1} title="คำขอตรวจ QAQC (Daily Request)" subtitle="เพิ่มคำขอสำหรับพรุ่งนี้ได้ แม้ส่งรายงานเย็นแล้ว">
        <RequestSection
          projectId={report.projectId}
          contractorId={report.contractorId}
          reportDate={report.reportDate}
          buildings={buildings}
          morningSubmitted
        />
      </SectionCard>
      {report.photos.length > 0 ? (
        <Card>
          <CardContent>
            <PhotoSection reportId={report.id} photos={report.photos} locked />
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
