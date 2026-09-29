import Box from "@mui/material/Box";
import { PageHeader } from "@/components/ui/page-header.js";
import { SitePlanView } from "@/features/site-plan/components/site-plan-view.js";

export function SitePlanPage() {
  return (
    <Box>
      <PageHeader
        title="Site Plan"
        subtitle="Monitor contractor activity across project zones"
      />
      <SitePlanView />
    </Box>
  );
}
