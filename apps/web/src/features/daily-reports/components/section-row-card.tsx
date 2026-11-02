import type { CoordinationMap, CoordinationSection } from "@sts/shared";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { RoadMapStage, type RoadLine } from "@/features/site-coordination/index.js";

// One route-section row of the report form (Today Activity or Tomorrow Forecast): pick the stretch from the coloured
// chips or by tapping its line on the small map beside them; the row's own fields go under the chips.
export function SectionRowCard({ title, map, sections, pickedId, onPick, error, onRemove, children }: {
  title: string;
  map: CoordinationMap;
  sections: CoordinationSection[];
  pickedId: string | null;
  onPick: (sectionId: string) => void;
  /** Shown in place of the hint when the section is missing. */
  error?: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  const picked = sections.find((s) => s.id === pickedId) ?? null;
  const lines: RoadLine[] = sections.map((s) => ({ id: s.id, points: s.points, color: s.color, label: s.code, emphasis: s.id === pickedId, muted: Boolean(pickedId) && s.id !== pickedId }));
  return (
    <Box sx={{ border: 1, borderColor: error ? "error.main" : "divider", borderRadius: 1.5, bgcolor: "background.paper", overflow: "hidden" }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
          {title}{picked ? ` · ช่วง ${picked.code}` : ""}
        </Typography>
        <IconButton size="small" aria-label={`ลบ${title}`} onClick={onRemove}><DeleteOutlineOutlinedIcon fontSize="small" /></IconButton>
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" } }}>
        <Stack spacing={1.25} sx={{ p: 1.5, minWidth: 0 }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: error ? "error.main" : "text.secondary", display: "block", mb: 0.75 }}>
              {error ?? "ช่วงที่ทำงาน — แตะเส้นบนผัง หรือเลือกด้านล่าง"}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {sections.map((s) => {
                const on = s.id === pickedId;
                return (
                  <Chip key={s.id} label={s.code} onClick={() => onPick(s.id)} aria-pressed={on}
                    sx={{ fontWeight: 700, minWidth: 56, height: 36, bgcolor: on ? s.color : "background.paper", color: on ? "common.white" : "text.primary",
                      border: 2, borderColor: s.color, "&:hover": { bgcolor: on ? s.color : `${s.color}22` } }} />
                );
              })}
            </Stack>
            {picked ? <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>{picked.work}</Typography> : null}
          </Box>
          {children}
        </Stack>
        <Box sx={{ borderLeft: { md: 1 }, borderTop: { xs: 1, md: 0 }, borderColor: "divider", minWidth: 0 }}>
          {/* A picker, not a viewer: no zoom buttons (they would cover the route end on a phone); pinch still zooms. */}
          <RoadMapStage map={map} lines={lines} height={240} controls={false} selectedId={pickedId} onTapLine={onPick} />
        </Box>
      </Box>
    </Box>
  );
}
