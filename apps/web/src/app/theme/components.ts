import type { Components, Theme } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";
import { palette } from "./palette.js";

// Scrollbar tokens derive from the theme palette (single source of truth).
const scrollbarThumb = palette.grey?.[400] ?? "#98A2B3";
const scrollbarThumbHover = palette.grey?.[500] ?? "#667085";
const sidebarThumb = "rgba(255, 255, 255, 0.28)";
const sidebarThumbHover = "rgba(255, 255, 255, 0.45)";

// Global component styling: radius, borders, density. Borders over shadows;
// soft shadows only on floating surfaces (dialog, drawer, menu, popover).
export const components: Components<Omit<Theme, "components">> = {
  MuiCssBaseline: {
    styleOverrides: {
      body: { WebkitFontSmoothing: "antialiased" },
      // Single global scrollbar system (Firefox + WebKit). 8px interaction
      // area with a visually lighter padded thumb; WebKit rules apply only
      // on precise pointers so touch scrolling stays fully native.
      "*": {
        scrollbarWidth: "thin",
        scrollbarColor: `${scrollbarThumb} transparent`,
      },
      "@media (hover: hover) and (pointer: fine)": {
        "*::-webkit-scrollbar": { width: 8, height: 8 },
        "*::-webkit-scrollbar-track": { background: "transparent" },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: scrollbarThumb,
          borderRadius: 999,
          border: "2px solid transparent",
          backgroundClip: "padding-box",
        },
        "*::-webkit-scrollbar-thumb:hover": { backgroundColor: scrollbarThumbHover },
        "*::-webkit-scrollbar-corner": { background: "transparent" },
        // Dark navy sidebar needs a lighter translucent thumb for contrast.
        ".sts-navy-scroll": { scrollbarColor: `${sidebarThumb} transparent` },
        ".sts-navy-scroll::-webkit-scrollbar-thumb": {
          backgroundColor: sidebarThumb,
          borderRadius: 999,
          border: "2px solid transparent",
          backgroundClip: "padding-box",
        },
        ".sts-navy-scroll::-webkit-scrollbar-thumb:hover": { backgroundColor: sidebarThumbHover },
      },
    },
  },
  MuiButton: {
    defaultProps: { variant: "contained", disableElevation: true },
    styleOverrides: {
      root: { borderRadius: 6, fontWeight: 600 },
      sizeMedium: { minHeight: 40 },
      sizeLarge: { minHeight: 44 },
    },
  },
  MuiIconButton: {
    styleOverrides: { root: { borderRadius: 8 } },
  },
  MuiTextField: {
    defaultProps: { size: "small", fullWidth: true },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: { borderRadius: 8, fontSize: 15, backgroundColor: "#FFFFFF" },
    },
  },
  MuiInputLabel: {
    styleOverrides: { root: { fontSize: 15 } },
  },
  MuiSelect: {
    defaultProps: { size: "small" },
  },
  MuiAutocomplete: {
    defaultProps: { size: "small", fullWidth: true },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        border: "1px solid #E4E7EC",
        boxShadow: "none",
      },
    },
  },
  MuiCardHeader: {
    styleOverrides: {
      title: { fontSize: 16, fontWeight: 600 },
      subheader: { fontSize: 14 },
    },
  },
  MuiPaper: {
    styleOverrides: {
      rounded: { borderRadius: 10 },
      elevation1: { boxShadow: "none", border: "1px solid #E4E7EC" },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { fontWeight: 600, borderRadius: 6 },
      sizeSmall: { height: 26, fontSize: 13 },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 12,
        boxShadow: "0 12px 32px rgba(16,24,40,0.18)",
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: { boxShadow: "0 12px 32px rgba(16,24,40,0.16)" },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: 10,
        border: "1px solid #E4E7EC",
        boxShadow: "0 8px 24px rgba(16,24,40,0.12)",
      },
    },
  },
  MuiPopover: {
    styleOverrides: {
      paper: {
        borderRadius: 10,
        border: "1px solid #E4E7EC",
        boxShadow: "0 8px 24px rgba(16,24,40,0.12)",
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: { fontSize: 13, borderRadius: 6, backgroundColor: "#101828" },
    },
  },
  MuiAlert: {
    styleOverrides: { root: { borderRadius: 8, fontSize: 14 } },
  },
  MuiTabs: {
    styleOverrides: {
      indicator: { height: 3, borderRadius: 3 },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: { fontSize: 14, borderColor: "#E4E7EC" },
      head: { fontWeight: 600, color: "#667085", backgroundColor: "#F9FAFB" },
    },
  },
  MuiLinearProgress: {
    styleOverrides: { root: { borderRadius: 4, height: 6 } },
  },
  MuiStepper: {
    styleOverrides: { root: { padding: 0 } },
  },
  MuiBottomNavigation: {
    styleOverrides: {
      root: { borderTop: "1px solid #E4E7EC", minHeight: 64 },
    },
  },
  MuiDataGrid: {
    // Enterprise tables are layout-locked: users can sort by clicking headers
    // but cannot resize/reorder columns or open the column menu. Page-level
    // filters live in the filter bar, not in the grid.
    defaultProps: {
      disableColumnMenu: true,
      disableColumnResize: true,
      disableRowSelectionOnClick: true,
    },
    styleOverrides: {
      root: {
        border: "1px solid #E4E7EC",
        borderRadius: 10,
        backgroundColor: "#FFFFFF",
        fontSize: 14,
        "--DataGrid-t-color-background-base": "#FFFFFF",
      } as React.CSSProperties,
      columnHeaders: {
        backgroundColor: "#F9FAFB",
        color: "#667085",
        fontWeight: 600,
      },
      cell: { borderColor: "#E4E7EC" },
      row: {
        "&:hover": { backgroundColor: "#F9FAFB" },
      },
    },
  },
};
