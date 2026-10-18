import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { SITE_MAP_IMAGES, SITE_MAP_VIEW_LIST, SiteMapImage, type SiteMapView } from "@/features/site-plan/index.js";
import type { SiteMapEditor } from "../hooks/use-site-map-editor.js";

export function ConfigMap({ ed }: { ed: SiteMapEditor }) {
  const { view, mode, setPendingPoint, part, setPartPoint, buildings, building, chooseBuilding, chooseView, choosePart, markers, canPlace, placeHint, VIEW_LABEL } = ed;
  return (
    <>
<Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1.25 }}>
      <Box>
        <Typography variant="h5">{building ? `${String(buildings.indexOf(building) + 1).padStart(2, "0")} ${building.name}` : "เลือกอาคาร"}</Typography>
        {building ? (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {building.code}
              {building.nameTh ? ` · ${building.nameTh}` : ""}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {SITE_MAP_VIEW_LIST.map((v) => `${VIEW_LABEL[v]}: ${building.markers[v] ? "Placed" : "Not placed"}`).join(" · ")}
            </Typography>
          </>
        ) : null}
      </Box>
      <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v: SiteMapView | null) => v && chooseView(v)}>
        {SITE_MAP_VIEW_LIST.map((v) => (
          <ToggleButton key={v} value={v}>
            {SITE_MAP_IMAGES[v].label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
    <SiteMapImage
      view={view}
      markers={markers}
      hint={placeHint}
      maxHeight="70vh"
      onMarkerClick={(id) => {
        if (mode === "building") chooseBuilding(id);
        else {
          const p = building?.parts.find((x) => x.id === id);
          if (p && p.id !== part?.id) choosePart(p);
        }
      }}
      onMarkerDrag={(_, point) => (mode === "building" ? setPendingPoint(point) : setPartPoint(point))}
      onPlace={canPlace ? (point) => (mode === "building" ? setPendingPoint(point) : setPartPoint(point)) : undefined}
    />
</>
  );
}
