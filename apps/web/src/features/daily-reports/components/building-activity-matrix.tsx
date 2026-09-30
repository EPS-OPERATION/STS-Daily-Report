import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, useTheme, type Theme } from "@mui/material/styles";
import { WORKLOAD_THRESHOLDS, type WorkloadLevel } from "@sts/shared";
import dayjs from "dayjs";
import type { WeeklyBuildingRow, WeeklyCell } from "../types/daily-report.types.js";
import { ContractorBadge } from "./contractor-badge.js";
import { PERMIT_ICONS, permitLabel } from "./permit-meta.js";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

// Buildings (Y) × Mon–Sun (X). Each cell: contractor badges, total headcount,
// permit icons; background = workload heat level.
export function BuildingActivityMatrix({
  days,
  rows,
  today,
  hideEmpty,
}: {
  days: string[];
  rows: WeeklyBuildingRow[];
  today: string;
  hideEmpty: boolean;
}) {
  const visible = hideEmpty ? rows.filter((r) => r.weekManDays > 0) : rows;
  return (
    <Box sx={{ overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
      <Box
        role="table"
        aria-label="Building activity matrix"
        sx={{ display: "grid", gridTemplateColumns: "200px repeat(7, minmax(128px, 1fr)) 84px", minWidth: 1180 }}
      >
        <HeaderCell sticky>Building</HeaderCell>
        {days.map((d, i) => (
          <HeaderCell key={d} highlight={d === today}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
              {DAY_LABELS[i]}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {dayjs(d).format("D MMM")}
            </Typography>
          </HeaderCell>
        ))}
        <HeaderCell>Man-days</HeaderCell>

        {visible.map((r) => (
          <Box key={r.id} role="row" sx={{ display: "contents" }}>
            <Box
              role="rowheader"
              sx={{
                position: "sticky",
                left: 0,
                zIndex: 1,
                bgcolor: "background.paper",
                borderTop: 1,
                borderRight: 1,
                borderColor: "divider",
                px: 1.5,
                py: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {r.name}
              </Typography>
              {r.nameTh ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3 }}>
                  {r.nameTh}
                </Typography>
              ) : null}
            </Box>
            {r.cells.map((c) => (
              <MatrixCell key={c.date} cell={c} building={r.name} isToday={c.date === today} />
            ))}
            <Box
              role="cell"
              sx={{ borderTop: 1, borderLeft: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {r.weekManDays || "–"}
              </Typography>
              {r.peakHeadcount ? (
                <Typography variant="caption" color="text.secondary">
                  peak {r.peakHeadcount}
                </Typography>
              ) : null}
            </Box>
          </Box>
        ))}
      </Box>
      {visible.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
          No submitted morning reports this week.
        </Typography>
      ) : null}
    </Box>
  );
}

function HeaderCell({ children, sticky, highlight }: { children: React.ReactNode; sticky?: boolean; highlight?: boolean }) {
  return (
    <Box
      role="columnheader"
      sx={{
        position: sticky ? "sticky" : "static",
        left: sticky ? 0 : undefined,
        zIndex: sticky ? 2 : undefined,
        bgcolor: highlight ? "primary.light" : "grey.50",
        borderBottom: 1,
        borderColor: "divider",
        px: 1.5,
        py: 1,
        typography: "caption",
        fontWeight: 700,
        color: highlight ? "primary.main" : "text.secondary",
      }}
    >
      {children}
    </Box>
  );
}

function MatrixCell({ cell, building, isToday }: { cell: WeeklyCell; building: string; isToday: boolean }) {
  const theme = useTheme();
  const colors = workloadColors(theme, cell.level);
  const empty = cell.headcount === 0;
  const detail = empty
    ? `${building} · ${dayjs(cell.date).format("ddd D MMM")} · no work`
    : [
        `${building} · ${dayjs(cell.date).format("ddd D MMM")}`,
        `${cell.headcount} people · ${cell.contractors.length} contractor(s) · ${colors.label} density`,
        ...cell.contractors.map((c) => `${c.code} (${c.name}): ${c.headcount}`),
        ...cell.permits.map((p) => `${permitLabel(p.type)} permit: ${p.workers} workers`),
      ].join("\n");
  return (
    <Tooltip title={<Box sx={{ whiteSpace: "pre-line" }}>{detail}</Box>} placement="top" arrow>
      <Box
        role="cell"
        tabIndex={empty ? -1 : 0}
        aria-label={detail}
        sx={{
          borderTop: 1,
          borderLeft: 1,
          borderColor: "divider",
          // Idle cells in today's column get a faint tint so the column still reads as "today".
          bgcolor: empty && isToday ? alpha(theme.palette.primary.light, 0.6) : colors.bg,
          boxShadow: empty ? "none" : `inset 3px 0 0 ${colors.edge}`,
          px: 1,
          py: 0.75,
          minHeight: 64,
        }}
      >
        {empty ? (
          <Typography variant="caption" color="text.disabled">
            –
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                {cell.headcount}
                <Typography component="span" variant="caption" color="text.secondary">
                  {" "}
                  ppl
                </Typography>
              </Typography>
              <Stack direction="row" spacing={0.25}>
                {cell.permits.map((p) => {
                  const Icon = PERMIT_ICONS[p.type];
                  return <Icon key={p.type} aria-label={permitLabel(p.type)} sx={{ fontSize: 16, color: "error.dark" }} />;
                })}
              </Stack>
            </Stack>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5}>
              {cell.contractors.map((c) => (
                <ContractorBadge key={c.id} code={c.code} headcount={c.headcount} title={c.name} />
              ))}
            </Stack>
          </Stack>
        )}
      </Box>
    </Tooltip>
  );
}
