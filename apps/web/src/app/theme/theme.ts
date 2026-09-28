import { createTheme } from "@mui/material/styles";
import "./augmentation.js";
import { components } from "./components.js";
import { palette } from "./palette.js";
import { typography } from "./typography.js";

export const theme = createTheme({
  palette,
  typography,
  shape: { borderRadius: 8 },
  components,
  typographyVariants: undefined,
} as Parameters<typeof createTheme>[0]);

// metric variant (card numbers 28-36px / 700) applied after creation to keep
// typography.ts free of type-augmentation ordering issues.
theme.typography = {
  ...theme.typography,
  metric: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 30,
    fontWeight: 700,
    lineHeight: 1.2,
  },
} as typeof theme.typography;
