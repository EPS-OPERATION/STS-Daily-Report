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
import { formatThaiDate, timeWindowLabel } from "../utils/dates.js";

// Read-only view once the evening shift is submitted (the day is closed).
export function ReportSummary({ report, buildings }: { report: DailyReport; buildings: Building[] }) {
  const weather = WEATHER_CONDITIONS.find((w) => w.code === report.weather)?.label;
  const positionLabel = (code: string) => POSITIONS.find((p) => p.code === code)?.label ?? code;
  return (
    <Stack spacing={2}>
      <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
        {report.morningStatus === "submitted" ? "ส่งรายงานครบทั้งเช้าและเย็นแล้ว" : "ส่งรายงานเย็นแล้ว (ไม่มีรายงานเช้า)"}
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
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" color="text.secondary">
            ลงนามโดย {report.signatureName ?? "-"}
            {report.signedAt ? ` · ${dayjs(report.signedAt).format("DD/MM HH:mm")}` : ""}
          </Typography>
        </CardContent>
      </Card>
      <SectionCard
        index={1}
        title="คำขอสำหรับวันพรุ่งนี้ (Tomorrow's Requests)"
        subtitle={`สำหรับ ${formatThaiDate(report.requestsForDate)} — ส่งแล้วพร้อมรายงานเย็น`}
      >
        {report.machinery.length + report.equipmentRequests.length + report.permits.length + report.roadUsage.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            ไม่มีการจองเครื่องจักร / ถนน / ใบอนุญาตสำหรับพรุ่งนี้
          </Typography>
        ) : (
          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            {report.machinery.map((m) => (
              <Typography key={m.id} variant="body2">
                เครื่องจักร · {m.machineType}
                {m.unitTag ? ` (${m.unitTag})` : ""} · {m.buildingCode} · {timeWindowLabel(m.startTime, m.endTime)}
                {m.purpose ? ` · ${m.purpose}` : ""}
              </Typography>
            ))}
            {report.equipmentRequests.map((e) => (
              <Typography key={e.id} variant="body2">
                อุปกรณ์ · {e.equipmentType} ×{e.qty} · {e.buildingCode}
                {e.purpose ? ` · ${e.purpose}` : ""}
              </Typography>
            ))}
            {report.roadUsage.map((r) => (
              <Typography key={r.id} variant="body2">
                ถนน · {r.roadLocation} · {r.startTime}–{r.endTime} · {r.purpose}
              </Typography>
            ))}
            {report.permits.map((p) => (
              <Typography key={p.id} variant="body2">
                PTW · {p.permitType === "other" ? p.otherLabel : permitLabel(p.permitType)} · {p.buildingCode} · {p.workers} คน
              </Typography>
            ))}
          </Stack>
        )}
        {report.machineryConflicts.length + report.roadConflicts.length > 0 ? (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {report.machineryConflicts.map((c) => (
              <Typography key={c.bookingIds.join("-")} variant="body2">
                {c.machineType}
                {c.unitTag ? ` (${c.unitTag})` : ""} ชนกับ {c.with.map((w) => `${w.contractorCode} ${timeWindowLabel(w.startTime, w.endTime)}`).join(", ")}
              </Typography>
            ))}
            {report.roadConflicts.map((c, i) => (
              <Typography key={`road-${i}`} variant="body2">
                ถนน {c.roadLocation} ชนกับ {c.with.map((w) => `${w.contractorCode} ${w.startTime}–${w.endTime}`).join(", ")}
              </Typography>
            ))}
            — แจ้งในประชุม 17:00 เพื่อจัดคิว
          </Alert>
        ) : null}
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
          ขอตรวจ QAQC (เพิ่มเติมได้)
        </Typography>
        <RequestSection
          projectId={report.projectId}
          contractorId={report.contractorId}
          reportDate={report.reportDate}
          buildings={buildings}
          eveningSubmitted
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
