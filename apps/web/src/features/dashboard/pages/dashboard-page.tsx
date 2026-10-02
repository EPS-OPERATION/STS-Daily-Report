import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { SitePlanSvg } from "@/features/dashboard/components/site-plan-svg.js";
import { KpiCard } from "@/components/shared/kpi-card.js";
import { PageHeader } from "@/components/shared/page-header.js";
import { HIGHLIGHTS, KPI_BY_RANGE, ZONES } from "@/mock/site-data.js";

type Range = "today" | "week" | "month";

const HIGHLIGHT_TONE = {
  error: { bg: "#FDECEC", fg: "#DC2626", icon: ErrorOutlineIcon },
  info: { bg: "#E8F1FE", fg: "#2787FF", icon: InfoOutlinedIcon },
  warning: { bg: "#FEF3E2", fg: "#B45309", icon: WarningAmberOutlinedIcon },
  success: { bg: "#E7F6EC", fg: "#16A34A", icon: InfoOutlinedIcon },
} as const;

export function DashboardPage() {
  const theme = useTheme();
  const [range, setRange] = useState<Range>("today");
  const kpi = KPI_BY_RANGE[range];

  return (
    <Box>
      <PageHeader
        title="Project Dashboard"
        subtitle="Overview of construction progress and daily operations"
        actions={
          <ToggleButtonGroup
            value={range}
            exclusive
            size="small"
            onChange={(_, v: Range | null) => {
              if (v) setRange(v);
            }}
            aria-label="Time range"
          >
            <ToggleButton value="today">Today</ToggleButton>
            <ToggleButton value="week">This Week</ToggleButton>
            <ToggleButton value="month">This Month</ToggleButton>
          </ToggleButtonGroup>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Manpower"
            value={String(kpi.manpower.value)}
            sub={kpi.manpower.delta}
            subTone="success"
            trend="up"
            icon={<EngineeringOutlinedIcon />}
            iconBg={theme.palette.info.light}
            iconFg={theme.palette.info.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Contractors"
            value={String(kpi.contractors.value)}
            sub={kpi.contractors.sub}
            icon={<BusinessOutlinedIcon />}
            iconBg={theme.palette.success.light}
            iconFg={theme.palette.success.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="Work Permits"
            value={String(kpi.permits.value)}
            sub={kpi.permits.sub}
            subTone="error"
            icon={<AssignmentOutlinedIcon />}
            iconBg={theme.palette.error.light}
            iconFg={theme.palette.error.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <KpiCard
            label="QAQC"
            value={String(kpi.qaqc.value)}
            unit="pending"
            sub={kpi.qaqc.sub}
            subTone="error"
            icon={<FactCheckOutlinedIcon />}
            iconBg={theme.palette.warning.light}
            iconFg={theme.palette.warning.dark}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="h5">Site Activity Overview</Typography>
                <Stack direction="row" spacing={2}>
                  {(
                    [
                      ["Active", theme.palette.success.main],
                      ["Attention", theme.palette.warning.main],
                      ["No activity", theme.palette.grey[400]],
                    ] as const
                  ).map(([label, color]) => (
                    <Stack key={label} direction="row" spacing={0.75} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
                      <Typography variant="caption" color="text.secondary">
                        {label}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
              <SitePlanSvg zones={ZONES} height={380} />
              <Box sx={{ mt: 1.5 }}>
                <Link component={RouterLink} to="/site-plan" underline="hover" fontSize={13}>
                  Open interactive site plan
                </Link>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h5">Today&apos;s Highlight</Typography>
                <Link component={RouterLink} to="/daily-reports" underline="hover" fontSize={13}>
                  View all
                </Link>
              </Stack>
              <List disablePadding>
                {HIGHLIGHTS.map((h) => {
                  const tone = HIGHLIGHT_TONE[h.tone];
                  const ToneIcon = tone.icon;
                  return (
                    <ListItem key={h.id} disableGutters sx={{ py: 1.25 }}>
                      <ListItemAvatar sx={{ minWidth: 44 }}>
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            bgcolor: tone.bg,
                            color: tone.fg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ToneIcon fontSize="small" aria-hidden="true" />
                        </Box>
                      </ListItemAvatar>
                      <ListItemText
                        primary={h.title}
                        secondary={h.lines.join(" · ")}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                        secondaryTypographyProps={{ fontSize: 12 }}
                      />
                    </ListItem>
                  );
                })}
              </List>
              <Button
                component={RouterLink}
                to="/field"
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                fullWidth
                sx={{ mt: 1 }}
              >
                Open contractor view
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
