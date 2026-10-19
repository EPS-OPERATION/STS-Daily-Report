import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { formatNumber } from "@/lib/format.js";
import { overtimeLines, overtimeSummary } from "../utils/overtime.js";
import type { UseReviewDialogState } from "../hooks/use-review-dialog.js";

export function ReviewOverviewTab({ ed }: { ed: UseReviewDialogState }) {
  const { data, weatherLabel, positionLabel } = ed;
  if (!data) return null;
  // Either shift may be the only one sent (the afternoon is often sent first): use what exists.
  const morningSent = data.morningStatus === "submitted";
  const eveningSent = data.eveningStatus === "submitted" && data.eveningThaiMale !== null;
  const morningTotal = data.thaiMale + data.thaiFemale + data.foreignMale + data.foreignFemale;
  const headcount = morningSent ? morningTotal : eveningSent ? data.eveningHeadcount : 0;
  const shiftLine = [morningSent ? `เช้า ${morningTotal}` : "ยังไม่ส่งเช้า", eveningSent ? `บ่าย ${data.eveningHeadcount}` : "ยังไม่ส่งบ่าย"].join(" · ");
  // Nationality/sex: the morning split, else the afternoon one.
  const nat = morningSent
    ? { label: "เช้า", tm: data.thaiMale, tf: data.thaiFemale, fm: data.foreignMale, ff: data.foreignFemale }
    : eveningSent
      ? { label: "บ่าย", tm: data.eveningThaiMale ?? 0, tf: data.eveningThaiFemale ?? 0, fm: data.eveningForeignMale ?? 0, ff: data.eveningForeignFemale ?? 0 }
      : null;
  const hoursKnown = data.workHours !== null;
  const positionRows = [
    morningSent && data.positions.length ? { label: "เช้า", rows: data.positions } : null,
    eveningSent && data.eveningPositions.length ? { label: "บ่าย", rows: data.eveningPositions } : null,
  ].filter((r): r is { label: string; rows: typeof data.positions } => r !== null);
  return (
    <Stack spacing={2}>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
            <Typography variant="caption" color="text.secondary">
              กำลังคนทั้งหมด
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>
              {headcount} <Typography component="span" variant="body2">คน</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {shiftLine}
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
            <Typography variant="caption" color="text.secondary">
              เวลาทำงาน / โอที
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {hoursKnown ? `${data.workHours} ชม.` : "—"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }} title={overtimeLines(data.overtime).join(" · ")}>
              {overtimeSummary(data)}
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
            <Typography variant="caption" color="text.secondary">
              ชั่วโมงคนรวม (NMH)
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {hoursKnown ? `${formatNumber(data.manHours)} ชม.` : "—"}
            </Typography>
            {!hoursKnown ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                รอเวลาทำงานจากรายงานเช้า
              </Typography>
            ) : null}
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
            <Typography variant="caption" color="text.secondary">
              สภาพอากาศ
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {weatherLabel} {data.temperatureC ? `${data.temperatureC}°C` : ""}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            สัดส่วนสัญชาติและเพศ (Demographics){nat ? ` · ${nat.label}` : ""}
          </Typography>
          {!nat ? (
            <Typography variant="body2" color="text.secondary">
              ยังไม่มีข้อมูล
            </Typography>
          ) : (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  สัญชาติไทย: {nat.tm + nat.tf} คน
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ชาย {nat.tm} คน · หญิง {nat.tf} คน
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  สัญชาติต่างด้าว: {nat.fm + nat.ff} คน
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ชาย {nat.fm} คน · หญิง {nat.ff} คน
                </Typography>
              </Box>
            </Grid>
          </Grid>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            กำลังคนแยกตามตำแหน่งงาน (Positions)
          </Typography>
          {positionRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              ยังไม่มีข้อมูล
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              {positionRows.map((g) => (
                <Stack key={g.label} direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 32 }}>
                    {g.label}
                  </Typography>
                  {g.rows.map((p) => (
                    <Chip key={p.position} variant="outlined" label={`${positionLabel(p.position)}: ${p.headcount} คน`} sx={{ fontWeight: 500 }} />
                  ))}
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {data.equipment.length > 0 && (
        <Card variant="outlined">
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              เครื่องจักรและอุปกรณ์ประจำไซต์วันนี้
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {data.equipment.map((e, idx) => (
                <Chip
                  key={idx}
                  color="info"
                  variant="outlined"
                  icon={<ConstructionOutlinedIcon />}
                  label={`${e.equipmentType} × ${e.qty} คัน/เครื่อง`}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
