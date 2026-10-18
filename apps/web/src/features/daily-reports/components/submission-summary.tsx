import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import type { UseDailyReportsPageState } from "../hooks/use-daily-reports-page.js";

export function SubmissionSummary({ ed }: { ed: UseDailyReportsPageState }) {
  const { counts, dateRangeLabel, pct } = ed;
  return (
    <Grid container spacing={2} sx={{ mb: 2.5 }}>
      {[
        { label: "รายการทั้งหมด", value: `${counts.all} รายการ`, sub: dateRangeLabel, color: "text.primary" },
        { label: "ส่งครบทั้ง 2 รายงาน", value: `${counts.complete} รายการ`, sub: pct(counts.complete), color: "success.dark" },
        { label: "ส่งบางส่วน", value: `${counts.partial} รายการ`, sub: "ส่ง Daily Report หรือ Daily Request อย่างเดียว", color: "warning.dark" },
        { label: "ยังไม่ส่ง", value: `${counts.none} รายการ`, sub: pct(counts.none), color: counts.none > 0 ? "error.dark" : "text.secondary" },
      ].map((kpi) => (
        <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary">
                {kpi.label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: kpi.color, my: 0.5 }}>
                {kpi.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {kpi.sub}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
