import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { OVERVIEW_HOTSPOTS, OVERVIEW_IMAGE_SRC, type OverviewHotspot } from "@/mock/site-overview.js";
import { useCurrentProject } from "@/features/projects/context/project-context.js";
import { usePlanZones } from "../hooks/use-site-plan.js";

// [Image 1] — whole-site 3D overview with clickable hotspots. Tapping a dot
// (or a chip below) jumps the interactive map to that zone and opens its drawer.
export function SiteOverviewCard({ onSelectZone }: { onSelectZone: (zoneId: string) => void }) {
  const { projectId } = useCurrentProject();
  const zonesQuery = usePlanZones(projectId);
  const zones = useMemo(() => zonesQuery.data?.data ?? [], [zonesQuery.data]);

  // Direct zone hit, else the mapped parent (unmapped children stay unmapped —
  // the tooltip names the fallback so schemes are never silently merged).
  const targetOf = (h: OverviewHotspot): { id: string; code: string; viaFallback: boolean } | null => {
    const direct = h.zoneCode ? zones.find((z) => z.code === h.zoneCode) : undefined;
    if (direct) return { id: direct.id, code: direct.code, viaFallback: false };
    const fallback = h.fallbackZoneCode ? zones.find((z) => z.code === h.fallbackZoneCode) : undefined;
    if (fallback) return { id: fallback.id, code: fallback.code, viaFallback: true };
    return null;
  };

  const hint = (h: OverviewHotspot): string => {
    const t = targetOf(h);
    if (!t) return `${h.label} — no mapped zone yet`;
    if (t.viaFallback) return `${h.label} — exact area not mapped, opens zone ${t.code} instead`;
    return `${h.label} — view zone ${t.code} on the map`;
  };

  return (
    <Card sx={{ mb: 2.5 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h5" sx={{ mb: 0.5 }}>
          Site Layout Overview <Typography component="span" variant="caption" color="text.secondary">[Image 1]</Typography>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tap a dot on the 3D view to see today&apos;s activity in that zone.
        </Typography>
        <Box sx={{ position: "relative" }}>
          <Box
            component="img"
            src={OVERVIEW_IMAGE_SRC}
            alt="3D site layout overview with labelled buildings"
            sx={{ width: "100%", borderRadius: 2, border: 1, borderColor: "divider", display: "block" }}
          />
          {OVERVIEW_HOTSPOTS.map((h) => {
            const t = targetOf(h);
            return (
              <Tooltip key={h.label} title={hint(h)}>
                <Box
                  component="span"
                  sx={{ position: "absolute", left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <Box
                    component="button"
                    type="button"
                    aria-label={hint(h)}
                    disabled={!t}
                    onClick={() => {
                      if (t) onSelectZone(t.id);
                    }}
                    sx={{
                      display: "block",
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      p: 0,
                      bgcolor: t ? "background.paper" : "grey.400",
                      border: 2,
                      borderColor: t ? "primary.main" : "grey.500",
                      opacity: t ? 0.95 : 0.6,
                      cursor: t ? "pointer" : "not-allowed",
                      boxShadow: 1,
                      transition: "transform 120ms ease",
                      "&:hover": t ? { transform: "scale(1.35)" } : {},
                      "&:focus-visible": { outline: 2, outlineColor: "primary.main", outlineOffset: 2 },
                    }}
                  />
                </Box>
              </Tooltip>
            );
          })}
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", rowGap: 1 }}>
          {OVERVIEW_HOTSPOTS.map((h) => {
            const t = targetOf(h);
            return (
              <Chip
                key={h.label}
                label={h.label}
                size="small"
                clickable={Boolean(t)}
                disabled={!t}
                color={h.label === "ACC" && t ? "primary" : "default"}
                variant={h.label === "ACC" && t ? "filled" : "outlined"}
                onClick={t ? () => onSelectZone(t.id) : undefined}
              />
            );
          })}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          ACC is Building 011 — Air Cooled Condenser.
        </Typography>
      </CardContent>
    </Card>
  );
}
