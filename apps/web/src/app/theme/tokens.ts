import { theme } from "./theme.js";

// Resolved theme colours for places `sx` tokens cannot reach (Konva canvas, SVG, JS colour maps).
// Import these instead of repeating hex literals.
export const TOKENS = {
  primary: theme.palette.primary.main,
  neutral: theme.palette.secondary.main,
  muted: theme.palette.grey[400],
  success: theme.palette.success.dark,
  info: theme.palette.info.main,
};
