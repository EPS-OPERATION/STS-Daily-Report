import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme, type Theme } from "@mui/material/styles";
import { WORKLOAD_THRESHOLDS, type WorkloadLevel } from "@sts/shared";

export function workloadColors(theme: Theme, level: WorkloadLevel) {
  switch (level) {
    case "high":
      return { bg: alpha(theme.palette.warning.main, 0.42), edge: theme.palette.warning.dark, label: "High" };
    case "medium":
      return { bg: theme.palette.warning.light, edge: theme.palette.warning.main, label: "Medium" };
    case "low":
      return { bg: theme.palette.success.light, edge: theme.palette.success.main, label: "Low" };
    default:
      return { bg: theme.palette.background.paper, edge: "transparent", label: "No work" };
  }
}

// Density legend shared by the site plan and weekly views.
export function WorkloadLegend() {
  const theme = useTheme();
  const { medium, high } = WORKLOAD_THRESHOLDS;
  const items: { level: WorkloadLevel; text: string }[] = [
    { level: "low", text: `< ${medium.headcount} people` },
    { level: "medium", text: `≥ ${medium.headcount} people or ${medium.contractors}+ contractors` },
    { level: "high", text: `≥ ${high.headcount} people or ${high.contractors}+ contractors` },
  ];
  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
      <Typography variant="caption" color="text.secondary">
        Density
      </Typography>
      {items.map((i) => {
        const c = workloadColors(theme, i.level);
        return (
          <Stack key={i.level} direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: c.bg, borderLeft: 3, borderColor: c.edge }} />
            <Typography variant="caption">
              <b>{c.label}</b> {i.text}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}
