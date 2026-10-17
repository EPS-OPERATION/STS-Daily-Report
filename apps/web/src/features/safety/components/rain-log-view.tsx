import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/AddOutlined";
import CloudQueueOutlinedIcon from "@mui/icons-material/CloudQueueOutlined";
import MoreTimeOutlinedIcon from "@mui/icons-material/MoreTimeOutlined";
import ThunderstormOutlinedIcon from "@mui/icons-material/ThunderstormOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { KpiCard } from "@/components/ui/kpi-card.js";
import { formatThaiDate } from "@/features/daily-reports/index.js";
import { ActualRainChart, HourlyWeatherPanel } from "@/features/weather/index.js";
import type { WeatherHour } from "@sts/shared";
import { useRainLogs } from "../hooks/use-rain-logs.js";
import type { RainLogEntry } from "../types/rain-log.types.js";
import { RainLogDialog } from "./rain-log-dialog.js";
import { RainHistoryCompare } from "./rain-history-compare.js";

function KpiTile({
  label,
  value,
  unit,
  sub,
  alert,
  icon,
}: {
  label: string;
  value: string | number;
  unit: string;
  sub?: string;
  alert?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <KpiCard label={label} value={String(value)} unit={unit} sub={sub} subTone={alert ? "error" : "muted"} icon={icon} />
    </Grid>
  );
}

interface RainLogViewProps {
  projectId: string;
  from: string;
  to: string;
}

export function RainLogView({ projectId, from, to }: RainLogViewProps) {
  const { logs, stats, error, addRainLog, updateRainLog, deleteRainLog } = useRainLogs(
    projectId,
    from,
    to,
  );

  const [dialogEntry, setDialogEntry] = useState<RainLogEntry | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RainLogEntry | null>(null);

  const equivalentWorkDays = (stats.totalStoppageHours / 8).toFixed(1);

  return (
    <Stack spacing={2.5}>
      {/* Top Banner Notice */}
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: "navy.dark",
          color: "common.white",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "inherit" }}>
            🌧️ ประวัติฝนตกจริง & บันทึกชั่วโมงหยุดงาน (Rainfall & Delay Evidence)
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", display: "block" }}>
            บันทึกเวลาฝนตกจริงของแต่ละวันเพื่อเป็นหลักฐานอ้างอิงและต่อรองขยายเวลาก่อสร้าง (EOT Claim) กับ PM ส่วนกลาง
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="warning"
          startIcon={<AddIcon />}
          onClick={() => setDialogEntry("new")}
          sx={{ fontWeight: 700, textTransform: "none", flexShrink: 0 }}
        >
          Log actual rain time
        </Button>
      </Box>

      {/* Recorded hourly site weather (API, hourly) — the evidence beside the manual rain log. */}
      <HourlyWeatherPanel
        projectId={projectId || null}
        actual={(range) => <EpsActualRain projectId={projectId || null} from={range.from} to={range.to} hours={range.hours} />}
      />

      {error ? <Alert severity="error">{error.message || "บันทึกประวัติฝนไม่สำเร็จ"}</Alert> : null}

      {/* KPI Tiles */}
      <Grid container spacing={1.5}>
        <KpiTile
          label="วันที่ฝนตกสะสม"
          value={stats.totalRainyDays}
          unit="วัน"
          sub={`ในช่วง ${formatThaiDate(from)} – ${formatThaiDate(to)}`}
          icon={<CloudQueueOutlinedIcon color="primary" />}
        />
        <KpiTile
          label="ชั่วโมงหยุดงานสะสม"
          value={stats.totalStoppageHours}
          unit="ชม."
          sub={`เทียบเท่า ~${equivalentWorkDays} วันทำงาน (กะ 8 ชม.)`}
          alert={stats.totalStoppageHours > 16}
          icon={<MoreTimeOutlinedIcon color="error" />}
        />
        <KpiTile
          label="ฝนตกหนัก / พายุ"
          value={stats.heavyRainEvents}
          unit="ครั้ง"
          sub="งานยกเครนและงานบนที่สูงหยุด 100%"
          icon={<ThunderstormOutlinedIcon color="warning" />}
        />
        <KpiTile
          label="งานที่กระทบสูงสุด"
          value={stats.mostAffectedActivity ? "1st" : "–"}
          unit={stats.mostAffectedActivity ? "" : "ไม่มี"}
          sub={stats.mostAffectedActivity ?? "ยังไม่มีบันทึกผลกระทบ"}
          icon={<WarningAmberOutlinedIcon color="action" />}
        />
      </Grid>

      {/* Rain history: weather service (left) vs EPS log (right), same dates. */}
      <RainHistoryCompare
        projectId={projectId || null}
        from={from}
        to={to}
        logs={logs}
        onAdd={() => setDialogEntry("new")}
        onEdit={(entry) => setDialogEntry(entry)}
        onDelete={(entry) => setDeleteTarget(entry)}
      />

      {/* Edit / Add Dialog */}
      <RainLogDialog
        open={Boolean(dialogEntry)}
        entry={dialogEntry}
        projectId={projectId}
        onClose={() => setDialogEntry(null)}
        onSave={(data) => (dialogEntry && dialogEntry !== "new" ? updateRainLog(dialogEntry.id, data) : addRainLog(data))}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete rain record?"
        description="บันทึกประวัติฝนตกนี้จะถูกลบ"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void deleteRainLog(deleteTarget.id).catch(() => undefined);
          setDeleteTarget(null);
        }}
      />
    </Stack>
  );
}

// EPS-recorded rain (this log) for the hourly panel's range, on the same hours as the weather chart.
function EpsActualRain({ projectId, from, to, hours }: { projectId: string | null; from: string; to: string; hours: WeatherHour[] }) {
  const { logs } = useRainLogs(projectId, from, to);
  return <ActualRainChart hours={hours} periods={logs.map((l) => ({ date: l.date, startTime: l.startTime, endTime: l.endTime, note: l.impactSummary }))} />;
}
