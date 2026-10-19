import Box from "@mui/material/Box";
import { FieldBottomNav } from "@/components/field/field-bottom-nav.js";
import { CoordinationWorkspace } from "@/features/site-coordination/index.js";
export function ContractorCoordinationPage() {
  // The layout's own bottom padding already clears the bottom nav (the map is sized against it).
  return <Box><CoordinationWorkspace roadNames /><FieldBottomNav /></Box>;
}
