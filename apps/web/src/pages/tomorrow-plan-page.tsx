import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header.js";
import { TOMORROW_PLAN } from "@/mock/site-data.js";

const TARGET = dayjs("2026-09-29");

function MonthGrid() {
  const start = TARGET.startOf("month");
  const startOffset = (start.day() + 6) % 7; // Monday-first
  const days = TARGET.daysInMonth();
  const cells: (number | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>
        {TARGET.format("MMMM YYYY")}
      </Typography>
      <Grid container spacing={0.5}>
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <Grid key={d} size={{ xs: 12 / 7 }}>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              {d}
            </Typography>
          </Grid>
        ))}
        {cells.map((d, i) => (
          <Grid key={i} size={{ xs: 12 / 7 }}>
            <Box
              sx={{
                py: 1,
                textAlign: "center",
                borderRadius: 1,
                fontSize: 13,
                fontWeight: d === 29 ? 700 : 400,
                bgcolor: d === 29 ? "primary.main" : "transparent",
                color: d === 29 ? "primary.contrastText" : "text.primary",
              }}
            >
              {d ?? ""}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export function TomorrowPlanPage() {
  const [view, setView] = useState<"timeline" | "calendar">("timeline");
  return (
    <Box>
      <PageHeader
        title="Tomorrow's Plan"
        subtitle="29 September 2026 · operational timeline is the primary view"
        actions={
          <ToggleButtonGroup
            value={view}
            exclusive
            size="small"
            onChange={(_, v: "timeline" | "calendar" | null) => {
              if (v) setView(v);
            }}
            aria-label="Plan view"
          >
            <ToggleButton value="timeline">Timeline</ToggleButton>
            <ToggleButton value="calendar">Calendar</ToggleButton>
          </ToggleButtonGroup>
        }
      />
      {view === "timeline" ? (
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Stack spacing={0}>
              {TOMORROW_PLAN.map((item, i) => (
                <Stack key={item.title} direction="row" spacing={2.5} sx={{ position: "relative", pb: i === TOMORROW_PLAN.length - 1 ? 0 : 3 }}>
                  <Box sx={{ width: 52, flexShrink: 0 }}>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {item.time}
                    </Typography>
                  </Box>
                  {i !== TOMORROW_PLAN.length - 1 ? (
                    <Box sx={{ position: "absolute", left: 71, top: 24, bottom: 0, width: 2, bgcolor: "divider" }} />
                  ) : null}
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: "info.main",
                      mt: 0.75,
                      ml: 0.5,
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2, flexGrow: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.zone} · {item.contractor}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.meta}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent sx={{ p: 2.5, maxWidth: 520 }}>
            <MonthGrid />
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
