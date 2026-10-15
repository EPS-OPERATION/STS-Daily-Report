import AddIcon from "@mui/icons-material/AddOutlined";
import CloudQueueOutlinedIcon from "@mui/icons-material/CloudQueueOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MoreTimeOutlinedIcon from "@mui/icons-material/MoreTimeOutlined";
import ThunderstormOutlinedIcon from "@mui/icons-material/ThunderstormOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { EmptySection } from "@/components/ui/empty-state.js";
import { KpiCard } from "@/components/ui/kpi-card.js";
import { formatThaiDate } from "@/features/daily-reports/index.js";
import { useRainLogs } from "../hooks/use-rain-logs.js";
import type { RainIntensity, RainLogEntry } from "../types/rain-log.types.js";
import { RainLogDialog } from "./rain-log-dialog.js";
import { RainTrendChart } from "./rain-trend-chart.js";

const INTENSITY_COLOR: Record<RainIntensity, { label: string; color: "default" | "info" | "warning" | "error" }> = {
  light: { label: "ฝนตกเล็กน้อย", color: "info" },
  moderate: { label: "ฝนตกปานกลาง", color: "default" },
  heavy: { label: "ฝนตกหนัก", color: "warning" },
  storm: { label: "พายุฝนฟ้าคะนอง", color: "error" },
};

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
  const { logs, stats, addRainLog, updateRainLog, deleteRainLog } = useRainLogs(
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

      {/* Rain Trend Chart */}
      <Card variant="outlined">
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Box>
              <Typography variant="h6">กราฟชั่วโมงหยุดงานจากเหตุฝนตก (Work Stoppage Hours)</Typography>
              <Typography variant="caption" color="text.secondary">
                บันทึกชั่วโมงที่สั่งหยุดงานจริงจากเหตุฝนตก เพื่อพิสูจน์สาเหตุงาน Delay (EOT Claim)
              </Typography>
            </Box>
            <Chip
              label={`รวมหยุดงาน ${stats.totalStoppageHours} ชม.`}
              color={stats.totalStoppageHours > 0 ? "error" : "default"}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Stack>
          <RainTrendChart stats={stats} height={300} />
        </CardContent>
      </Card>

      {/* Rain Log Records Table */}
      <Card variant="outlined">
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6">ตารางประวัติฝนตกจริง & บันทึกผลกระทบต่องาน</Typography>
              <Typography variant="caption" color="text.secondary">
                แสดง {logs.length} เหตุการณ์ฝนตกที่บันทึกไว้ในช่วงเวลานี้
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setDialogEntry("new")}
            >
              Add record
            </Button>
          </Stack>

          {logs.length === 0 ? (
            <EmptySection
              icon={<ThunderstormOutlinedIcon />}
              title="ไม่มีประวัติฝนตกในช่วงเวลานี้"
              description="กด “Log actual rain time” เพื่อเพิ่มข้อมูล"
            />
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>วันที่</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ช่วงเวลาฝนตก</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>เวลาหยุดงาน</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ระดับฝน / ปริมาณ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>งานที่ต้องสั่งหยุด</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ข้อชี้แจงเพื่อต่อรอง Delay (EOT Claim)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ผู้บันทึก</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((item) => {
                    const intCfg = item.intensity ? (INTENSITY_COLOR[item.intensity] ?? { label: item.intensity, color: "default" }) : null;
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                          {formatThaiDate(item.date)}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {item.startTime} – {item.endTime} น.
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Chip
                            label={`${item.stoppageHours} ชม.`}
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            {intCfg ? <Chip label={intCfg.label} color={intCfg.color} size="small" sx={{ fontWeight: 600 }} /> : "—"}
                            {item.rainfallMm != null && (
                              <Typography variant="caption" color="text.secondary">
                                ({item.rainfallMm} มม.)
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {(item.affectedActivities ?? []).map((act) => (
                              <Chip
                                key={act}
                                label={act.split("(")[0]?.trim() || act}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: 11, height: 22 }}
                              />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300 }}>
                          <Typography variant="body2" sx={{ fontSize: 13 }}>
                            {item.delayClaimNote || item.impactSummary}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Typography variant="caption" color="text.secondary">
                            {item.recordedBy}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => setDialogEntry(item)}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <DeleteOutlineOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Edit / Add Dialog */}
      <RainLogDialog
        open={Boolean(dialogEntry)}
        entry={dialogEntry}
        projectId={projectId}
        onClose={() => setDialogEntry(null)}
        onSave={(data) => {
          if (dialogEntry && dialogEntry !== "new") {
            updateRainLog(dialogEntry.id, data);
          } else {
            addRainLog(data);
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete rain record?"
        description="บันทึกประวัติฝนตกนี้จะถูกลบ"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteRainLog(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </Stack>
  );
}
