import type { TypographyVariantsOptions } from "@mui/material/styles";

// Inter for Latin; Thai glyphs (which Inter lacks) fall through to Sarabun. Without a Thai
// web font Windows falls back to a small looped system Thai font.
const fontStack = `"Inter","Sarabun",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`;

export const typography: TypographyVariantsOptions = {
  fontFamily: fontStack,
  h1: { fontSize: 32, fontWeight: 700, lineHeight: 1.25 },
  h2: { fontSize: 24, fontWeight: 600, lineHeight: 1.3 },
  h3: { fontSize: 28, fontWeight: 700, lineHeight: 1.3 },
  h4: { fontSize: 20, fontWeight: 600, lineHeight: 1.4 },
  h5: { fontSize: 18, fontWeight: 600, lineHeight: 1.4 },
  h6: { fontSize: 16, fontWeight: 600, lineHeight: 1.4 },
  body1: { fontSize: 16, fontWeight: 400, lineHeight: 1.6 },
  body2: { fontSize: 15, fontWeight: 400, lineHeight: 1.55 },
  subtitle1: { fontSize: 15, fontWeight: 500, lineHeight: 1.5 },
  subtitle2: { fontSize: 14, fontWeight: 600, lineHeight: 1.5 },
  caption: { fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
  overline: { fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", lineHeight: 1.5, textTransform: "uppercase" as const },
  button: { fontSize: 15, fontWeight: 600, textTransform: "none" as const },
};
