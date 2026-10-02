import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Tooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";
import { DailySiteMarkerIcon } from "./daily-site-marker-icon.js";
import { dailySiteMarkerIcons } from "./daily-site-marker-icons.js";
import type { DailySiteMarker } from "../types/daily-site-marker.types.js";
import type { Viewport } from "@/features/site-maps/hooks/use-site-plan-viewport.js";

export function DailySiteMarkerLayer({
  markers,
  mapWidth,
  mapHeight,
  viewport,
  size,
  selectedId,
  onSelect,
}: {
  markers: DailySiteMarker[];
  mapWidth: number;
  mapHeight: number;
  viewport: Viewport;
  size: { w: number; h: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const theme = useTheme();

  return (
    <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
      {markers.map((marker) => {
        const x = marker.x * mapWidth * viewport.scale + viewport.x;
        const y = marker.y * mapHeight * viewport.scale + viewport.y;
        if (x < -24 || y < -24 || x > size.w + 24 || y > size.h + 24) return null;
        const selected = marker.id === selectedId;
        const label = dailySiteMarkerIcons[marker.iconKey].label;
        return (
          <Tooltip key={marker.id} title={`${label} · ${marker.contractor.name}`} placement="top" enterDelay={350}>
            <ButtonBase
              aria-label={`Open ${label} Site Marker from ${marker.contractor.name}`}
              aria-pressed={selected}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(marker.id);
              }}
              sx={{
                position: "absolute",
                left: x - 24,
                top: y - 24,
                width: 48,
                height: 48,
                borderRadius: "50%",
                pointerEvents: "auto",
                zIndex: selected ? 2 : 1,
                "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
              }}
            >
              <Box
                sx={{
                  width: selected ? 36 : 32,
                  height: selected ? 36 : 32,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "background.paper",
                  color: selected ? "primary.dark" : "navy.dark",
                  border: "2px solid",
                  borderColor: selected ? "primary.main" : "navy.dark",
                  boxShadow: `0 0 0 3px ${theme.palette.common.white}, 0 2px 6px ${theme.palette.action.disabled}`,
                }}
              >
                <DailySiteMarkerIcon iconKey={marker.iconKey} fontSize="small" />
              </Box>
            </ButtonBase>
          </Tooltip>
        );
      })}
    </Box>
  );
}
