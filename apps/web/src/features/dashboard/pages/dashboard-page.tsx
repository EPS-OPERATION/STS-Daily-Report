import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Link as RouterLink } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import { SiteConditionsStrip } from "@/features/dashboard/components/site-conditions-strip.js";
import { CoordinationWorkspace } from "@/features/site-coordination/index.js";
import { ContractorFilterPopover } from "@/features/contractors/index.js";
import { useDashboard } from "../hooks/use-dashboard.js";
import { KpiTiles } from "../components/kpi-tiles.js";
import { TodayHighlights } from "../components/today-highlights.js";

export function DashboardPage() {
  const ed = useDashboard();
  const { from, setFrom, to, setTo, rfi, dailyReqs, manpower, rangeRequests, allCodes, selectedCodes, setContractors, filterItems, rangeLabel } = ed;

  return (
    <Box>
      <PageHeader
        title="Project Dashboard"
        subtitle="Overview of construction progress and daily operations"
        actions={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <DatePicker
              label="From"
              value={from}
              onChange={setFrom}
              slotProps={{ textField: { size: "small" } }}
              sx={{ width: 150 }}
            />
            <DatePicker
              label="To"
              value={to}
              onChange={setTo}
              slotProps={{ textField: { size: "small" } }}
              sx={{ width: 150 }}
            />
            {allCodes.length > 0 && (
              <ContractorFilterPopover
                items={filterItems}
                selectedCodes={selectedCodes}
                onChange={setContractors}
              />
            )}
          </Stack>
        }
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: -1.5 }}>
        {rangeLabel}
      </Typography>

      <KpiTiles ed={ed} />

      {/* Compact site map + weather (full card moved out to keep the PM view short) */}
      <Box sx={{ mb: 3 }}>
        <SiteConditionsStrip />
      </Box>

      {(rfi.isError || dailyReqs.isError || manpower.isError || rangeRequests.isError) && (
        <QueryError
          error={(rfi.error ?? dailyReqs.error ?? manpower.error ?? rangeRequests.error) as Error}
          onRetry={() => { void rfi.refetch(); void dailyReqs.refetch(); void manpower.refetch(); void rangeRequests.refetch(); }}
        />
      )}

      <Grid container spacing={2.5}>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="h5">Site Activity Overview</Typography>
                <Link component={RouterLink} to="/site-coordination" underline="hover" fontSize={13}>
                  Open Map
                </Link>
              </Stack>
              <DashboardSiteMap />
            </CardContent>
          </Card>
        </Grid>
        <TodayHighlights ed={ed} />
      </Grid>
    </Box>
  );
}

function DashboardSiteMap() {
  return <CoordinationWorkspace readOnly compact />;
}
