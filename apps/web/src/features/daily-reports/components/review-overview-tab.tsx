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
  return (
    <Stack spacing={2}>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
            <Typography variant="caption" color="text.secondary">
              กำลังคนทั้งหมด
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>
              {data.totalHeadcount} <Typography component="span" variant="body2">คน</Typography>
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card variant="outlined" sx={{ p: 1.5, textAlign: "center", bgcolor: "grey.50" }}>
            <Typography variant="caption" color="text.secondary">
              เวลาทำงาน / โอที
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {data.workHours ?? 8} ชม.
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
              {formatNumber(data.manHours)} ชม.
            </Typography>
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
            สัดส่วนสัญชาติและเพศ (Demographics)
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  สัญชาติไทย: {data.thaiMale + data.thaiFemale} คน
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ชาย {data.thaiMale} คน · หญิง {data.thaiFemale} คน
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  สัญชาติต่างด้าว: {data.foreignMale + data.foreignFemale} คน
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ชาย {data.foreignMale} คน · หญิง {data.foreignFemale} คน
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            กำลังคนแยกตามตำแหน่งงาน (Positions)
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {data.positions.map((p) => (
              <Chip
                key={p.position}
                variant="outlined"
                label={`${positionLabel(p.position)}: ${p.headcount} คน`}
                sx={{ fontWeight: 500 }}
              />
            ))}
          </Stack>
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
