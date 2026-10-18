import { type ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Panel } from "@/components/ui/panel.js";

export function Figure({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="baseline">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
    </Stack>
  );
}

// Fit-to-window sizing (wide screens): main's bottom padding, the grid row gap, the smallest useful panel,
// and the panel's own chrome (padding + title + note) taken off before the chart gets its height.
export const PAGE_BOTTOM = 26; // main bottom padding + the 1px divider lines
export const ROW_GAP = 0;
export const MIN_PANEL = 200;
export const PANEL_CHROME = 56;
export const LEGEND = 30;

export function ChartPanel({ title, note, height, children }: { title: string; note: string; height?: number | null; children: ReactNode }) {
  const body = (
    <>
      {/* Fitted panels keep the note on the title line: every pixel of height goes to the chart. */}
      <Stack direction={height ? "row" : "column"} columnGap={1} alignItems={height ? "baseline" : "flex-start"} sx={{ minWidth: 0 }}>
        <Typography variant="h5" noWrap sx={{ flexShrink: 0 }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="p" sx={{ minWidth: 0 }} title={note}>
          {note}
        </Typography>
      </Stack>
      <Box sx={{ mt: height ? 0.5 : 1 }}>{children}</Box>
    </>
  );
  // Fitted (wide) layout: one flat surface, panels split by 1px lines — no boxes, gaps or rounded corners.
  return height ? (
    <Box sx={{ borderRight: 1, borderBottom: 1, borderColor: "divider", p: 1.5, height, overflow: "hidden" }}>{body}</Box>
  ) : (
    <Panel fill sx={{ overflow: "hidden" }}>{body}</Panel>
  );
}
