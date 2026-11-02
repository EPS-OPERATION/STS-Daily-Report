import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import Grid from "@mui/material/Grid";
import { KpiCard } from "@/components/ui/kpi-card.js";
import type { UseDashboardState } from "../hooks/use-dashboard.js";

export function KpiTiles({ ed }: { ed: UseDashboardState }) {
  const { theme, rfi, manpower, rangeRequests, manpowerTotals, contractorCount, rangePermits, highRiskPermits, rfiToday, rfiTomorrow } = ed;
  return (
    <Grid container spacing={2.5} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <KpiCard
          label="Manpower"
          value={manpower.isLoading ? "–" : String(manpowerTotals?.manDays ?? 0)}
          unit="man-days"
          sub={manpower.isLoading ? "" : `${(manpowerTotals?.manHours ?? 0).toLocaleString()} man-hours`}
          icon={<EngineeringOutlinedIcon />}
          iconBg={theme.palette.info.light}
          iconFg={theme.palette.info.dark}
          to="/manpower"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <KpiCard
          label="Contractors"
          value={manpower.isLoading ? "–" : String(contractorCount)}
          sub={`${manpowerTotals?.reportedDays ?? 0} days reported`}
          icon={<BusinessOutlinedIcon />}
          iconBg={theme.palette.success.light}
          iconFg={theme.palette.success.dark}
          to="/contractors"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <KpiCard
          label="Work Permits"
          value={rangeRequests.isLoading ? "–" : String(rangePermits.length)}
          sub={highRiskPermits ? `${highRiskPermits} high risk` : "no high-risk permits"}
          subTone={highRiskPermits ? "error" : "muted"}
          icon={<AssignmentOutlinedIcon />}
          iconBg={theme.palette.error.light}
          iconFg={theme.palette.error.dark}
          to="/safety?tab=permits"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <KpiCard
          label="QAQC · Today RFI"
          value={rfi.isLoading ? "–" : String(rfiToday)}
          unit="รายการ"
          sub={rfi.isLoading ? "" : `พรุ่งนี้ ${rfiTomorrow} รายการ`}
          icon={<FactCheckOutlinedIcon />}
          iconBg={theme.palette.warning.light}
          iconFg={theme.palette.warning.dark}
          to="/qaqc"
        />
      </Grid>
    </Grid>
  );
}
