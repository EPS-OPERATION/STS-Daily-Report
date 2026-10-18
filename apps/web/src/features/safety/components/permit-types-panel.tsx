import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { PERMIT_TYPES } from "@sts/shared";
import { PERMIT_ICONS } from "@/features/daily-requests/index.js";
import type { UseWorkPermitsViewState } from "../hooks/use-work-permits-view.js";

export function PermitTypesPanel({ ed }: { ed: UseWorkPermitsViewState }) {
  const { theme, type, setType, permits, typeCounts, chartData } = ed;
  return (
    <Grid size={{ xs: 12, lg: 4.5 }}>
      <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              ประเภทใบอนุญาต (Permit Types)
            </Typography>
            <Chip
              size="small"
              label={`ทั้งหมด ${permits.length} ใบ`}
              color="info"
              variant={type === "" ? "filled" : "outlined"}
              onClick={() => setType("")}
              sx={{ cursor: "pointer", fontWeight: 600, height: 24, fontSize: "0.75rem" }}
            />
          </Box>

          <Grid container spacing={1}>
            {PERMIT_TYPES.map((t) => {
              const Icon = PERMIT_ICONS[t.code];
              const n = typeCounts.get(t.code) ?? 0;
              const active = type === t.code;
              return (
                <Grid key={t.code} size={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
                  <Box
                    onClick={() => setType(active ? "" : t.code)}
                    sx={{
                      cursor: "pointer",
                      p: 1,
                      textAlign: "center",
                      borderRadius: 1.5,
                      border: "1.5px solid",
                      borderColor: active ? "primary.main" : n > 0 ? "warning.light" : "divider",
                      bgcolor: active ? "primary.50" : n > 0 ? "warning.light" : "background.paper",
                      transition: "all 0.15s ease",
                      "&:hover": { borderColor: "primary.main", transform: "translateY(-1px)" },
                    }}
                  >
                    <Icon sx={{ fontSize: 22, color: n > 0 ? "warning.main" : "text.disabled", mb: 0.25 }} />
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        fontSize: "0.72rem",
                        fontWeight: active ? 700 : 500,
                        lineHeight: 1.15,
                        color: active ? "primary.dark" : "text.secondary",
                        height: 28,
                        overflow: "hidden",
                      }}
                    >
                      {t.label}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: n > 0 ? "text.primary" : "text.disabled", lineHeight: 1.2 }}>
                      {n > 0 ? n : "—"}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: "0.85rem" }}>
            สัดส่วนตามผู้รับเหมา (Sub Contractors)
          </Typography>
          {chartData.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", py: 2, textAlign: "center" }}>
              ไม่มีใบอนุญาตในช่วงนี้
            </Typography>
          ) : (
            <Box sx={{ height: Math.min(180, Math.max(100, chartData.length * 28 + 25)), width: "100%" }}>
              <BarChart
                layout="horizontal"
                yAxis={[{ scaleType: "band", data: chartData.map(([c]) => c), tickLabelStyle: { fontSize: 11 } }]}
                series={[
                  {
                    data: chartData.map(([, n]) => n),
                    color: theme.palette.info.main,
                    valueFormatter: (v: number | null) => `${v ?? 0}`,
                  },
                ]}
                margin={{ left: 42, right: 16, top: 4, bottom: 20 }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
}
