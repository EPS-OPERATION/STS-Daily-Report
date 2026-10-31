import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { ContractorFilterPopover } from "@/features/contractors/index.js";
import { ForecastHistory } from "../components/forecast-history.js";
import { MachineVisualizationDashboard } from "../components/machine-visualization-dashboard.js";
import { formatThaiDate } from "@/lib/dates.js";
import { ExportButtons } from "../components/export-buttons.js";
import { downloadCsv, printSections } from "../utils/report-export.js";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import type { View } from "../components/today-requests-parts.js";
import { useTodayRequests } from "../hooks/use-today-requests.js";
import { DayOverview } from "../components/day-overview.js";
import { MachineSection } from "../components/machine-section.js";
import { EquipmentSection } from "../components/equipment-section.js";
import { RoadSection } from "../components/road-section.js";
import { QaqcSection } from "../components/qaqc-section.js";

// Daily Request: everything contractors asked for on the selected day or date range
// (sent the evening before) — machines, equipment, road usage and QAQC inspections (RFI).
// The second view is the Tomorrow Forecast Activities history (paper form R003) for the
// same date range. Road bookings that clash between contractors are flagged red (warn only).
export function TodayRequestsPage() {
  const ed = useTodayRequests();
  const { view, from, to, isRange, week, rfi, data, allCodes, selectedCodes, machines, equipment, hasMachines, hasEquipment, roads, inspections, loadError, forecasts, requestSections, shownDays, selectedDay, dayIndex, setDay, filterItems, setContractors, clashingRoads, rangeLabel, projectId, setView, setRange } = ed;

  return (
    <Box>
      <PageHeader
        title="Daily Request"
        subtitle={
          view === "plan"
            ? "ประวัติแผนงานล่วงหน้าที่ผู้รับเหมาแจ้งไว้ (Tomorrow Forecast Activities) — เลือกช่วงวันที่ได้"
            : view === "machines"
            ? "การวิเคราะห์และสรุปการใช้เครื่องจักรของผู้รับเหมา — ทั้งเครื่องจักรในไซต์และคำขอใช้"
            : "คำขอประจำวันจากผู้รับเหมา (ส่งในรายงานบ่ายของวันก่อน) — เครื่องจักร อุปกรณ์ ถนน และ QAQC"
        }
        actions={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <DateRangeFields from={from} to={to} maxDays={62} onChange={setRange} />
            {allCodes.length > 0 ? <ContractorFilterPopover items={filterItems} selectedCodes={selectedCodes} onChange={setContractors} /> : null}
          </Stack>
        }
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 2.5 }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={view}
        onChange={(_, v: View | null) => v && setView(v)}
        aria-label="Daily Request view"
        sx={{ bgcolor: "background.paper", alignSelf: "flex-start" }}
      >
        <ToggleButton value="requests" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <AssignmentOutlinedIcon fontSize="small" />
          คำขอประจำวัน
          {clashingRoads.length > 0 ? (
            <StatusChip status="blocked" label={`Road clashes ${clashingRoads.length}`} />
          ) : null}
        </ToggleButton>
        <ToggleButton value="plan" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <EventNoteOutlinedIcon fontSize="small" />
          Tomorrow Forecast Activities{data ? ` (${forecasts.length})` : ""}
        </ToggleButton>
        <ToggleButton value="machines" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <PrecisionManufacturingOutlinedIcon fontSize="small" />
          เครื่องจักร (Machines)
        </ToggleButton>
      </ToggleButtonGroup>
      {view === "requests" ? (
        <ExportButtons
          disabled={!data || machines.length + equipment.length + roads.length + inspections.length === 0}
          onPrint={() => printSections("Daily Request — คำขอประจำวัน", `${rangeLabel} · ผู้รับเหมา ${selectedCodes.size === allCodes.length ? "ทั้งหมด" : [...selectedCodes].join(", ")}`, requestSections(true))}
          onCsv={() => downloadCsv(`STS_Daily_Request_${isRange ? `${from}_${to}` : from}.csv`, requestSections(false))}
        />
      ) : null}
      </Stack>

      {view === "plan" ? (
        loadError ? (
          <QueryError error={loadError} onRetry={() => { void week.refetch(); void rfi.refetch(); }} />
        ) : !data ? (
          <Stack spacing={2}>
            <BlockSkeleton height={120} />
            <BlockSkeleton height={240} />
          </Stack>
        ) : (
          <ForecastHistory rows={forecasts} rangeLabel={rangeLabel} fileTag={isRange ? `${from}_${to}` : from} />
        )
      ) : null}

      {view === "machines" && (
        <MachineVisualizationDashboard
          projectId={projectId}
          from={from}
          to={to}
          selectedCodes={selectedCodes}
        />
      )}

      {view === "requests" && loadError ? (
        <QueryError error={loadError} onRetry={() => { void week.refetch(); void rfi.refetch(); }} />
      ) : null}

      {view !== "requests" ? null : !data || !rfi.data ? (
        <Stack spacing={2}>
          <BlockSkeleton height={140} />
          <BlockSkeleton height={140} />
        </Stack>
      ) : (
        <Stack spacing={3}>
          {clashingRoads.length > 0 ? (
            <Alert severity="error">
              <b>มีการขอใช้เส้นทางทับซ้อนกัน {clashingRoads.length} รายการ</b> — ผู้รับเหมาต่างรายขอใช้ถนนเดียวกันในช่วงเวลาที่ทับกัน
              ตรวจสอบในตาราง Road usage (แถวสีแดง) แล้วปรับเวลาจากปุ่มแก้เวลา หรือจัดคิวในที่ประชุมประสานงาน
            </Alert>
          ) : null}
          <Typography variant="body2" color="text.secondary">
            {[hasMachines && `${machines.length} machine`, hasEquipment && `${equipment.length} equipment`, `${roads.length} road`, `${inspections.length} RFI`]
              .filter(Boolean)
              .join(" · ")}
          </Typography>
          <DayOverview ed={ed} />
          {isRange && shownDays.length > 0 ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton aria-label="Previous day" disabled={dayIndex <= 0} onClick={() => setDay(shownDays[dayIndex - 1]!.date)}>
                <ChevronLeftOutlinedIcon />
              </IconButton>
              <Typography variant="h4">{formatThaiDate(selectedDay)}</Typography>
              <IconButton
                aria-label="Next day"
                disabled={dayIndex < 0 || dayIndex >= shownDays.length - 1}
                onClick={() => setDay(shownDays[dayIndex + 1]!.date)}
              >
                <ChevronRightOutlinedIcon />
              </IconButton>
            </Stack>
          ) : null}

          {hasMachines ? <MachineSection ed={ed} /> : null}

          {hasEquipment ? <EquipmentSection ed={ed} /> : null}

          <RoadSection ed={ed} />

          <QaqcSection ed={ed} />
        </Stack>
      )}

    </Box>
  );
}
