import Box from "@mui/material/Box";
import { FieldBottomNav } from "@/components/field/field-bottom-nav.js";
import { CoordinationWorkspace } from "@/features/site-coordination/index.js";
export function ContractorCoordinationPage() {
  return <Box sx={{ pb: { xs: 10, md: 3 } }}><CoordinationWorkspace /><FieldBottomNav /></Box>;
}
