import CloseOutlined from "@mui/icons-material/CloseOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { CoordinationData } from "@sts/shared";
import { useMemo, useState } from "react";
import { SectionEditor } from "./section-editor.js";

// Admin-only drawing of a map's route line, opened from the Map page: tap along the route, drag its
// points, set code/work/colour. Same editor as the Route sections page, kept in a dialog so the admin
// never leaves the day they are planning. Saves refetch the map (the sections layer redraws).
export function SectionDrawDialog({
  open,
  onClose,
  projectId,
  maps,
  sections,
  initialMapId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  maps: CoordinationData["maps"];
  sections: CoordinationData["sections"];
  initialMapId?: string;
}) {
  const [mapId, setMapId] = useState<string | null>(null);
  const map = maps.find((m) => m.id === (mapId ?? initialMapId)) ?? maps[0];
  const mapSections = useMemo(() => sections.filter((s) => s.mapId === map?.id), [sections, map?.id]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" slotProps={{ paper: { sx: { height: "84dvh" } } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1.5, py: 1.5 }}>
        <RouteOutlined color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            วาดเส้นทาง (Route sections)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            แตะตามแนวเส้นทางบนผัง · ลากจุดเพื่อปรับ · ตั้งรหัส/งาน/สี แล้ว Save
          </Typography>
        </Box>
        {maps.length > 1 && map ? (
          <TextField select size="small" label="Area" value={map.id} onChange={(e) => setMapId(e.target.value)} sx={{ width: 220, flex: "none" }}>
            {maps.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        <IconButton aria-label="Close" onClick={onClose}>
          <CloseOutlined />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {map ? (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <SectionEditor key={map.id} projectId={projectId} map={map} sections={mapSections} fill />
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
