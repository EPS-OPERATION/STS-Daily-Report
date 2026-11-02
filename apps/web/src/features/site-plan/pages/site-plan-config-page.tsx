import ArrowBackIcon from "@mui/icons-material/ArrowBackOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import { Link as RouterLink } from "react-router-dom";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { useSiteMapEditor } from "../hooks/use-site-map-editor.js";
import { ConfigActionBar } from "../components/config-action-bar.js";
import { ConfigMap } from "../components/config-map.js";
import { FacilityListPanel } from "../components/facility-list-panel.js";
import { PartsPanel } from "../components/parts-panel.js";

// Admin site-map configuration (deck v2, "admin config map"):
// Map → Facility marker (per view) → optional Work Parts with their own markers.
export function SitePlanConfigPage() {
  const ed = useSiteMapEditor();
  const { map, mode, error, setError, pendingConfirm, setPendingConfirm, building } = ed;

  return (
    <Box sx={{ pb: 10 }}>
      <PageHeader
        title="Zone Configuration"
        subtitle="วางหมุดอาคาร (Facility marker) บนแผนที่ และแบ่ง Work Part ของแต่ละอาคาร"
        actions={
          <Button component={RouterLink} to="/site-plan" variant="text" startIcon={<ArrowBackIcon />}>
            Back to Site Plan
          </Button>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {!map.data ? (
        <BlockSkeleton height={520} />
      ) : (
        <Grid container spacing={2.5}>
          {/* ---------- left panel ---------- */}
          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
              {mode === "building" ? (
                <FacilityListPanel ed={ed} />
              ) : building ? (
                <PartsPanel ed={ed} building={building} />
              ) : null}
            </Box>
          </Grid>

          {/* ---------- map ---------- */}
          <Grid size={{ xs: 12, md: 8, lg: 9 }}>
            <ConfigMap ed={ed} />
          </Grid>
        </Grid>
      )}

      {/* ---------- sticky action bar ---------- */}
      <ConfigActionBar ed={ed} />
      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title={pendingConfirm?.title ?? ""}
        description={pendingConfirm?.description}
        confirmLabel={pendingConfirm?.confirmLabel}
        onClose={() => setPendingConfirm(null)}
        onConfirm={() => {
          const action = pendingConfirm;
          setPendingConfirm(null);
          action?.run();
        }}
      />
    </Box>
  );
}
