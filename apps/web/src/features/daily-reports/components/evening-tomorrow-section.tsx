import { YesNoGate } from "./form-aids.js";
import { formatThaiDate } from "@/lib/dates.js";
import { RequestSection } from "@/features/qaqc/index.js";
import { SectionCard } from "./section-card.js";
import { ForecastActivities } from "./forecast-activities.js";
import { RoadUsageRequests } from "./road-usage-requests.js";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { SubHeading } from "./evening-crew-block.js";
import type { UseEveningFormState } from "../hooks/use-evening-form.js";

export function EveningTomorrowSection({ ed }: { ed: UseEveningFormState }) {
  const { tomorrow, ctx, control, setValue, setRequestsAsked, inspectionRows, setQaqcAsked, qaqcOpen, roadRows, requestsOpen, projectId, date, contractor, report, buildings } = ed;
  return (
    <SectionCard
      id="sec-tomorrow"
      index={5}
      tone="navy"
      title="คำขอและแผนงานสำหรับวันพรุ่งนี้ (Tomorrow's Requests)"
      subtitle={`สำหรับ ${formatThaiDate(tomorrow)} — ใช้ในประชุมประสานงาน 17:00 ส่งพร้อมรายงานบ่าย`}
    >
      <SubHeading>แผนงานพรุ่งนี้ (Tomorrow Forecast Activities)</SubHeading>
      <ForecastActivities control={control} buildings={buildings} />
      <Divider sx={{ my: 2.5 }} />
      <YesNoGate
        icon={<FactCheckOutlinedIcon color="primary" fontSize="small" />}
        question="มีการนัดตรวจ (RFI) หรือไม่"
        open={qaqcOpen}
        filled={inspectionRows.length}
        onYes={() => setQaqcAsked(true)}
        onNo={() => setQaqcAsked(false)}
      >
        <Box sx={{ mt: 1.5 }}>
          <RequestSection
            projectId={projectId}
            contractorId={contractor.id}
            reportDate={date}
            buildings={buildings}
            eveningSubmitted={false}
          />
        </Box>
      </YesNoGate>
      <Divider sx={{ my: 2.5 }} />
      {/* Machine and equipment requests are no longer asked here (Oct 2026); requests saved earlier stay
          in the form values and are sent back unchanged. Only road usage is requested. */}
      <YesNoGate
        question="พรุ่งนี้ต้องขอใช้ / ปิดถนนหรือไม่"
        open={requestsOpen}
        filled={roadRows.length}
        onYes={() => setRequestsAsked(true)}
        onNo={() => {
          setRequestsAsked(false);
          setValue("roadUsage", [], { shouldDirty: true });
        }}
      >
        {(report?.roadUsage ?? []).some((r) => r.adjusted) ? (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            EPS ปรับเวลาถนนบางรายการแล้ว ฟอร์มนี้แสดงเวลาที่คุณขอไว้ เมื่อส่งซ้ำ ระบบจะคงเวลาที่ EPS ปรับไว้
          </Alert>
        ) : null}
        <RoadUsageRequests control={control} buildings={buildings} ctx={ctx} />
      </YesNoGate>
    </SectionCard>
  );
}
