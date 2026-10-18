import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import { HighRiskTasks } from "@/features/safety/index.js";
import { useWorkPermitsView } from "../hooks/use-work-permits-view.js";
import { PermitToolbar } from "./permit-toolbar.js";
import { PermitTypesPanel } from "./permit-types-panel.js";
import { PermitRegister } from "./permit-register.js";

// EPS work-permit board, derived from the permits contractors request in the
// afternoon daily report (target date = the day the permit is used).
export function WorkPermitsView(props: Parameters<typeof useWorkPermitsView>[0]) {
  const ed = useWorkPermitsView(props);
  const { projectId, fromIso, toIso, query, hideHeader, selectedContractorCodes } = ed;

  return (
    <Box>
      {!hideHeader && (
        <PageHeader title="Work Permit" subtitle="Permit register from contractor afternoon reports" />
      )}

      {/* Quick Controls & Filter Toolbar */}
      <PermitToolbar ed={ed} />

      {/* High-Risk Tasks Section */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mb: 2 }}>
        <Box sx={{ px: 2, py: 1, bgcolor: "grey.50", borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmberRoundedIcon sx={{ color: "warning.main", fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              งานที่มีความเสี่ยงสูงและการควบคุม (High-Risk Tasks &amp; Supervision)
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            จาก Work Permit ที่ผู้รับเหมาระบุว่าเป็นงานความเสี่ยงสูง (แจ้งล่วงหน้าในรายงานบ่ายของวันก่อน)
          </Typography>
        </Box>
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <HighRiskTasks projectId={projectId} from={fromIso} to={toIso} selectedContractorCodes={selectedContractorCodes} />
        </CardContent>
      </Card>

      {query.isError && <QueryError error={query.error as Error} onRetry={() => void query.refetch()} />}

      {/* Side-by-Side: Left = Permit Types & Chart, Right = Register Table */}
      <Grid container spacing={2}>
        {/* Left Column: Types & Contractor Chart */}
        <PermitTypesPanel ed={ed} />

        {/* Right Column: Permit Register Table */}
        <PermitRegister ed={ed} />
      </Grid>
    </Box>
  );
}

export function WorkPermitsPage() {
  return <WorkPermitsView hideHeader={false} />;
}
