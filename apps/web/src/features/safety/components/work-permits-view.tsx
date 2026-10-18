import AddIcon from "@mui/icons-material/AddOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import { PermitTypeDialog } from "@/features/permit-types/index.js";
import { useWorkPermitsView } from "../hooks/use-work-permits-view.js";
import { HighRiskTasks } from "./high-risk-tasks.js";
import { PermitEditDialog } from "./permit-edit-dialog.js";
import { PermitToolbar } from "./permit-toolbar.js";
import { PermitTypesPanel } from "./permit-types-panel.js";
import { PermitRegister } from "./permit-register.js";

// EPS work-permit board, derived from the permits contractors request in the
// afternoon daily report (target date = the day the permit is used).
// Layout: high-risk cards → permit types beside the contractor chart → register full width (all columns visible).
export function WorkPermitsView(props: Parameters<typeof useWorkPermitsView>[0]) {
  const ed = useWorkPermitsView(props);
  const { projectId, fromIso, toIso, query, hideHeader, selectedContractorCodes, canEdit, editingPermit, setEditingPermit, addingOn, setAddingOn, typeDialog, setTypeDialog } = ed;

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
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
              จาก Work Permit ที่ผู้รับเหมาระบุว่าเป็นงานความเสี่ยงสูง
            </Typography>
            {canEdit ? (
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setAddingOn(fromIso)} sx={{ whiteSpace: "nowrap" }}>
                เพิ่มงานเสี่ยงสูง
              </Button>
            ) : null}
          </Stack>
        </Box>
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <HighRiskTasks
            projectId={projectId}
            from={fromIso}
            to={toIso}
            selectedContractorCodes={selectedContractorCodes}
            onEdit={canEdit ? setEditingPermit : undefined}
            onAdd={canEdit ? setAddingOn : undefined}
          />
        </CardContent>
      </Card>

      {query.isError && <QueryError error={query.error as Error} onRetry={() => void query.refetch()} />}

      <Grid container spacing={2}>
        {/* Permit type tiles + contractor chart (two grid items) */}
        <PermitTypesPanel ed={ed} />
        <PermitRegister ed={ed} />
      </Grid>

      {addingOn && projectId ? (
        <PermitEditDialog open projectId={projectId} permit={null} createOn={addingOn} onClose={() => setAddingOn(null)} />
      ) : null}
      {editingPermit && projectId ? (
        <PermitEditDialog open projectId={projectId} permit={editingPermit} onClose={() => setEditingPermit(null)} />
      ) : null}
      {typeDialog && projectId ? (
        <PermitTypeDialog projectId={projectId} item={typeDialog === "new" ? null : typeDialog} onClose={() => setTypeDialog(null)} />
      ) : null}
    </Box>
  );
}

export function WorkPermitsPage() {
  return <WorkPermitsView hideHeader={false} />;
}
