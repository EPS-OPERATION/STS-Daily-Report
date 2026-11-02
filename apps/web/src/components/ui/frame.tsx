import Box from "@mui/material/Box";
import type { ReactNode } from "react";

// Bordered, clipped wrapper for lists and tables that bring their own padding (rows with dividers).
export function Frame({ children, sx }: { children: ReactNode; sx?: object }) {
  return <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden", ...sx }}>{children}</Box>;
}
