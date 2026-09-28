import type { Components, Theme } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";

// Global component styling: radius, borders, density. Borders over shadows;
// soft shadows only on floating surfaces (dialog, drawer, menu, popover).
export const components: Components<Omit<Theme, "components">> = {
  MuiCssBaseline: {
    styleOverrides: {
      body: { WebkitFontSmoothing: "antialiased" },
    },
  },
  MuiButton: {
    defaultProps: { disableElevation: true },
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
      root: { borderRadius: 8, fontSize: 14, backgroundColor: "#FFFFFF" },
    },
  },
  MuiInputLabel: {
    styleOverrides: { root: { fontSize: 14 } },
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
      subheader: { fontSize: 13 },
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
      sizeSmall: { height: 24, fontSize: 12 },
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
      tooltip: { fontSize: 12, borderRadius: 6, backgroundColor: "#101828" },
    },
  },
  MuiAlert: {
    styleOverrides: { root: { borderRadius: 8, fontSize: 13 } },
  },
  MuiTabs: {
    styleOverrides: {
      indicator: { height: 3, borderRadius: 3 },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: { fontSize: 13, borderColor: "#E4E7EC" },
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
        fontSize: 13,
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
