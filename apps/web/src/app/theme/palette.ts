import type { PaletteOptions } from "@mui/material/styles";

// Single source of truth for color. Components must use theme tokens, never hex literals.
export const palette: PaletteOptions = {
  mode: "light",
  primary: {
    main: "#0B4D8B",
    dark: "#083761",
    light: "#EAF3FC",
    contrastText: "#FFFFFF",
  },
  secondary: {
    main: "#64748B",
    dark: "#475569",
    light: "#F1F5F9",
    contrastText: "#FFFFFF",
  },
  info: {
    main: "#2787FF",
    dark: "#1D6FE0",
    light: "#E8F1FE",
    contrastText: "#FFFFFF",
  },
  success: {
    main: "#16A34A",
    dark: "#15803D",
    light: "#E7F6EC",
    contrastText: "#FFFFFF",
  },
  warning: {
    main: "#F59E0B",
    dark: "#B45309",
    light: "#FEF3E2",
    contrastText: "#451A03",
  },
  error: {
    main: "#DC2626",
    dark: "#B91C1C",
    light: "#FDECEC",
    contrastText: "#FFFFFF",
  },
  background: {
    default: "#F6F7F9",
    paper: "#FFFFFF",
  },
  text: {
    primary: "#18212F",
    secondary: "#667085",
    disabled: "#98A2B3",
  },
  divider: "#E4E7EC",
  grey: {
    50: "#F9FAFB",
    100: "#F2F4F7",
    200: "#E4E7EC",
    300: "#D0D5DD",
    400: "#98A2B3",
    500: "#667085",
    600: "#475467",
    700: "#344054",
    800: "#18212F",
    900: "#101828",
  },
  navy: {
    main: "#123E6B",
    dark: "#0A2547",
    light: "#EAF3FC",
    contrastText: "#FFFFFF",
  },
};
