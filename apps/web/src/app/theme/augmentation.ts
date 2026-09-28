// MUI theme augmentation: custom navy + muted tokens and the metric variant.
// Import this file once (from theme.ts) so the types apply project-wide.
import type {} from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    navy: Palette["primary"];
  }
  interface PaletteOptions {
    navy?: PaletteOptions["primary"];
  }
  interface TypographyVariants {
    metric: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    metric?: React.CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    metric: true;
  }
}

export {};
