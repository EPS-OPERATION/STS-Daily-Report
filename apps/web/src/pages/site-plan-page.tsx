import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import RemoveOutlinedIcon from "@mui/icons-material/RemoveOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Drawer from "@mui/material/Drawer";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { SitePlanSvg } from "@/components/site/site-plan-svg.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import { ZONES } from "@/mock/site-data.js";

const STATUS_LABEL: Record<string, string> = {
  active: "Normal activity",
  attention: "Attention required",
  blocked: "High risk / blocked",
  idle: "No activity",
};

export function SitePlanPage() {
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>("boiler");
  const [zoom, setZoom] = useState(1);

  const selected = ZONES.find((z) => z.id === selectedId) ?? null;
  const visibleFilter = filter ?? selectedId;

  return (
    <Box>
      <PageHeader title="Site Plan" subtitle="Interactive site map with construction activities" />

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
        <Chip
          label="All Zones"
          clickable
          color={filter === null ? "primary" : "default"}
          variant={filter === null ? "filled" : "outlined"}
          onClick={() => setFilter(null)}
        />
        {ZONES.map((z) => (
          <Chip
            key={z.id}
            label={z.short}
            clickable
            color={filter === z.id ? "primary" : "default"}
            variant={filter === z.id ? "filled" : "outlined"}
            onClick={() => {
              setFilter(z.id);
              setSelectedId(z.id);
            }}
          />
        ))}
      </Stack>

      <Card>
        <CardContent sx={{ p: 2.5, position: "relative" }}>
          <Box sx={{ overflow: "hidden", borderRadius: 2 }}>
            <Box sx={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s" }}>
              <SitePlanSvg
                zones={ZONES}
                selectedId={visibleFilter}
                dimOthers={filter !== null}
                onSelect={(id) => {
                  setSelectedId(id);
                  setFilter(null);
                }}
                height={460}
              />
            </Box>
          </Box>
          <Stack direction="row" spacing={1} sx={{ position: "absolute", left: 32, bottom: 32 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => setZoom((z) => Math.min(1.75, +(z + 0.25).toFixed(2)))}
              aria-label="Zoom in"
              sx={{ minWidth: 40, bgcolor: "background.paper" }}
            >
              <AddOutlinedIcon fontSize="small" />
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
              aria-label="Zoom out"
              sx={{ minWidth: 40, bgcolor: "background.paper" }}
            >
              <RemoveOutlinedIcon fontSize="small" />
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Zone detail: drawer preserves map context (no navigation away) */}
      <Drawer
        anchor="right"
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        sx={{
          "& .MuiDrawer-paper": { width: { xs: "100%", sm: 380 }, p: 3 },
        }}
      >
        {selected ? (
          <Stack spacing={2.5}>
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Zone {selected.no}
              </Typography>
              <Typography variant="h4">{selected.name}</Typography>
              <StatusChip status={STATUS_LABEL[selected.status] ?? selected.status} />
            </Stack>

            <Stack spacing={0.5}>
              <Typography variant="h6">Today</Typography>
              <Typography variant="caption" color="text.secondary">
                {selected.contractorsToday} contractor{selected.contractorsToday === 1 ? "" : "s"} ·{" "}
                {selected.workersToday} workers on site
              </Typography>
            </Stack>

            {selected.today.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No recorded activity today.
              </Typography>
            ) : (
              selected.today.map((a, i) => (
                <Box
                  key={`${a.contractor}-${i}`}
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {a.contractor}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {a.activity}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {a.workers} workers
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <LinearProgress variant="determinate" value={a.progress} sx={{ flexGrow: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      {a.progress}%
                    </Typography>
                  </Stack>
                  {a.permit ? (
                    <Box sx={{ mt: 1 }}>
                      <Chip size="small" label={`Permit: ${a.permit}`} variant="outlined" />
                    </Box>
                  ) : null}
                </Box>
              ))
            )}

            <Stack spacing={0.5}>
              <Typography variant="h6">Tomorrow</Typography>
              {selected.tomorrow.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nothing planned yet.
                </Typography>
              ) : (
                selected.tomorrow.map((t) => (
                  <Typography key={t} variant="body2" color="text.secondary">
                    · {t}
                  </Typography>
                ))
              )}
            </Stack>

            <Button component={RouterLink} to="/daily-reports" variant="outlined">
              Open daily reports
            </Button>
          </Stack>
        ) : null}
      </Drawer>
    </Box>
  );
}
