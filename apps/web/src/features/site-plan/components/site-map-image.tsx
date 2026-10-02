import AddIcon from "@mui/icons-material/Add";
import FitScreenOutlinedIcon from "@mui/icons-material/FitScreenOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { SITE_MAP_IMAGES, type MapPoint, type SiteMapView } from "../types/site-map.types.js";

export interface MapMarker {
  id: string;
  kind: "building" | "part";
  /** text inside the marker (headcount, code…) */
  label: string;
  /** tooltip */
  title: string;
  point: MapPoint;
  tone?: { bg: string; fg: string };
  selected?: boolean;
  /** shown faded (e.g. other buildings while editing parts) */
  dimmed?: boolean;
  draggable?: boolean;
}

const ZOOMS = [1, 1.5, 2, 3];
const clamp01 = (n: number) => Math.min(1, Math.max(0, Math.round(n * 100000) / 100000));

// Site map image with markers. Optional zoom (+ / − / fit), drag-to-move for
// draggable markers, and click-to-place (onPlace) on empty map area.
export function SiteMapImage({
  view,
  markers,
  onMarkerClick,
  onMarkerDrag,
  onPlace,
  hint,
  maxHeight,
}: {
  view: SiteMapView;
  markers: MapMarker[];
  onMarkerClick?: (id: string) => void;
  onMarkerDrag?: (id: string, point: MapPoint) => void;
  onPlace?: (point: MapPoint) => void;
  hint?: string;
  maxHeight?: number | string;
}) {
  const theme = useTheme();
  const image = SITE_MAP_IMAGES[view];
  const [zoomIdx, setZoomIdx] = useState(0);
  const zoom = ZOOMS[zoomIdx]!;
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);

  const pointFrom = (clientX: number, clientY: number): MapPoint | null => {
    const rect = surface.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: clamp01((clientX - rect.left) / rect.width), y: clamp01((clientY - rect.top) / rect.height) };
  };

  const onMarkerDown = (m: MapMarker) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    drag.current = { id: m.id, startX: e.clientX, startY: e.clientY, moved: false };
    if (m.draggable && onMarkerDrag) e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMarkerMove = (m: MapMarker) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== m.id || !m.draggable || !onMarkerDrag) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return;
    d.moved = true;
    const p = pointFrom(e.clientX, e.clientY);
    if (p) onMarkerDrag(m.id, p);
  };
  const onMarkerUp = (m: MapMarker) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) onMarkerClick?.(m.id);
  };

  return (
    <Box sx={{ position: "relative", border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden", bgcolor: "background.paper" }}>
      <Box sx={{ overflow: "auto", maxHeight: maxHeight ?? "none" }}>
        <Box
          ref={surface}
          onClick={(e) => {
            if (!onPlace) return;
            const p = pointFrom(e.clientX, e.clientY);
            if (p) onPlace(p);
          }}
          sx={{ position: "relative", width: `${zoom * 100}%`, cursor: onPlace ? "crosshair" : "default", userSelect: "none" }}
        >
          <Box component="img" src={image.src} alt={image.label} draggable={false} sx={{ width: "100%", display: "block" }} />
          {markers.map((m) => {
            const isPart = m.kind === "part";
            const tone = m.tone ?? { bg: theme.palette.common.white, fg: theme.palette.text.primary };
            return (
              <Tooltip key={`${m.kind}-${m.id}`} arrow title={m.title}>
                <Box
                  component="button"
                  type="button"
                  aria-label={m.title}
                  aria-pressed={m.selected}
                  onPointerDown={onMarkerDown(m)}
                  onPointerMove={onMarkerMove(m)}
                  onPointerUp={onMarkerUp(m)}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    position: "absolute",
                    left: `${m.point.x * 100}%`,
                    top: `${m.point.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: m.selected ? 3 : isPart ? 2 : 1,
                    minWidth: isPart ? 24 : 30,
                    height: isPart ? 24 : 30,
                    px: 0.75,
                    borderRadius: isPart ? 1 : 15,
                    border: 2,
                    borderColor: m.selected ? theme.palette.primary.main : alpha(theme.palette.common.black, 0.25),
                    bgcolor: tone.bg,
                    color: tone.fg,
                    fontWeight: 800,
                    fontSize: isPart ? 11 : 12,
                    lineHeight: isPart ? "20px" : "26px",
                    cursor: m.draggable ? "grab" : "pointer",
                    touchAction: "none",
                    opacity: m.dimmed ? 0.45 : 1,
                    boxShadow: m.selected ? `0 0 0 4px ${alpha(theme.palette.primary.main, 0.35)}` : "0 1px 3px rgba(0,0,0,0.35)",
                    outline: "none",
                    "&:focus-visible": { boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.5)}` },
                    "&:active": { cursor: m.draggable ? "grabbing" : "pointer" },
                  }}
                >
                  {m.label}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>

      {hint ? (
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            px: 1.25,
            py: 0.5,
            borderRadius: 5,
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            boxShadow: 1,
            pointerEvents: "none",
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 16, color: "primary.main" }} />
          <Typography variant="caption">{hint}</Typography>
        </Stack>
      ) : null}

      <Stack
        sx={{ position: "absolute", left: 10, bottom: 10, bgcolor: alpha(theme.palette.background.paper, 0.95), borderRadius: 1.5, boxShadow: 1 }}
      >
        <IconButton size="small" aria-label="ซูมเข้า" disabled={zoomIdx === ZOOMS.length - 1} onClick={() => setZoomIdx((z) => z + 1)}>
          <AddIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label="ซูมออก" disabled={zoomIdx === 0} onClick={() => setZoomIdx((z) => z - 1)}>
          <RemoveIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label="พอดีจอ" disabled={zoomIdx === 0} onClick={() => setZoomIdx(0)}>
          <FitScreenOutlinedIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}
