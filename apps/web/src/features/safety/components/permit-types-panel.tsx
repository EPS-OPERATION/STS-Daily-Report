import AddIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { getPermitIcon } from "@/features/permit-types/index.js";
import type { UseWorkPermitsViewState } from "../hooks/use-work-permits-view.js";

// Permit type tiles (tap = filter; EPS: ✎ edits a type, the dashed ➕ tile adds one) beside the contractor chart.
export function PermitTypesPanel({ ed }: { ed: UseWorkPermitsViewState }) {
  const { theme, type, setType, permits, typeCounts, chartData, permitTypesList, canEdit, projectId, setTypeDialog } = ed;
  return (
    <>
      <Grid size={{ xs: 12, lg: 5 }}>
        <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25, flexWrap: "wrap", gap: 1 }}>
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
              {permitTypesList.map((t) => {
                const Icon = getPermitIcon("iconKey" in t ? t.iconKey : t.code);
                const n = typeCounts.get(t.code) ?? 0;
                const active = type === t.code;
                const item = "id" in t ? t : null;
                const hidden = item ? !item.isActive : false;
                return (
                  <Grid key={t.code} size={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
                    <Box
                      onClick={() => setType(active ? "" : t.code)}
                      sx={{
                        position: "relative",
                        height: "100%",
                        opacity: hidden ? 0.5 : 1,
                        cursor: "pointer",
                        p: 1,
                        textAlign: "center",
                        borderRadius: 1.5,
                        border: "1.5px solid",
                        borderColor: active ? "primary.main" : n > 0 ? "warning.light" : "divider",
                        bgcolor: active ? "primary.50" : n > 0 ? "#FFFDF7" : "background.paper",
                        transition: "all 0.15s ease",
                        "&:hover": { borderColor: "primary.main", transform: "translateY(-1px)" },
                      }}
                    >
                      {canEdit && item ? (
                        <Tooltip title="แก้ไขประเภทนี้">
                          <IconButton
                            size="small"
                            aria-label={`แก้ไขประเภท ${t.label}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTypeDialog(item);
                            }}
                            sx={{ position: "absolute", top: 2, right: 2, p: 0.25, bgcolor: "#fff", border: "1px solid", borderColor: "divider" }}
                          >
                            <EditOutlinedIcon sx={{ fontSize: 15, color: "primary.main" }} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      <Icon sx={{ fontSize: 24, color: n > 0 ? "warning.main" : "text.disabled", mb: 0.25 }} />
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          fontSize: "0.8rem",
                          fontWeight: active ? 700 : 500,
                          lineHeight: 1.15,
                          color: active ? "primary.dark" : "text.secondary",
                          height: 28,
                          overflow: "hidden",
                        }}
                      >
                        {t.label}
                        {hidden ? " (ซ่อน)" : ""}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: n > 0 ? "text.primary" : "text.disabled", lineHeight: 1.2 }}>
                        {n > 0 ? n : "—"}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
              {canEdit && projectId ? (
                <Grid size={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
                  <ButtonBase
                    onClick={() => setTypeDialog("new")}
                    aria-label="เพิ่มประเภทใบอนุญาต"
                    sx={{
                      width: "100%",
                      height: "100%",
                      minHeight: 92,
                      borderRadius: 1.5,
                      border: "1.5px dashed",
                      borderColor: "#E7B67A",
                      color: "#9A5B13",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.25,
                      "&:hover": { bgcolor: "#FFF8EC" },
                    }}
                  >
                    <AddIcon />
                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.8rem" }}>
                      เพิ่มประเภท
                    </Typography>
                  </ButtonBase>
                </Grid>
              ) : null}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              สัดส่วนตามผู้รับเหมา (Sub Contractors)
            </Typography>
            {chartData.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", py: 2, textAlign: "center" }}>
                ไม่มีใบอนุญาตในช่วงนี้
              </Typography>
            ) : (
              <Box sx={{ height: Math.min(260, Math.max(150, chartData.length * 40 + 30)), width: "100%" }}>
                <BarChart
                  layout="horizontal"
                  xAxis={[{ tickMinStep: 1 }]}
                  yAxis={[{ scaleType: "band", data: chartData.map(([c]) => c), tickLabelStyle: { fontSize: 13, fontWeight: 600 } }]}
                  series={[
                    {
                      data: chartData.map(([, n]) => n),
                      color: theme.palette.info.main,
                      valueFormatter: (v: number | null) => `${v ?? 0}`,
                    },
                  ]}
                  margin={{ left: 48, right: 16, top: 4, bottom: 20 }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </>
  );
}
