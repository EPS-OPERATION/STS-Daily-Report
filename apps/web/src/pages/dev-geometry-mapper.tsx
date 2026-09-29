import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { useCurrentProject } from "@/features/projects/context/project-context.js";
import { usePlanZones } from "@/features/site-plan/hooks/use-site-plan.js";

interface Pt {
  x: number;
  y: number;
}

// Development-only geometry mapper (NOT linked in navigation, NOT part of
// the production UX). Click points on the master layout image to produce
// normalized 0..1 polygon JSON for zone_map_areas seed/admin use.
export function DevGeometryMapper() {
  const { projectId } = useCurrentProject();
  const zonesQuery = usePlanZones(projectId);
  const [zoneId, setZoneId] = useState("");
  const [points, setPoints] = useState<Pt[]>([]);
  const [imgOk, setImgOk] = useState(true);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  if (!import.meta.env.DEV) {
    return (
      <Box>
        <PageHeader title="Geometry mapper" />
        <Alert severity="warning">Available in development builds only.</Alert>
      </Box>
    );
  }

  const addPoint = (e: React.MouseEvent) => {
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setPoints((p) => [...p, { x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 }]);
    setCopied(false);
  };

  const json = JSON.stringify({ type: "polygon", points }, null, 2);

  return (
    <Box>
      <PageHeader title="Geometry mapper" subtitle="Dev-only: click the drawing to capture normalized polygon points" />
      {!imgOk ? (
        <EmptyState
          icon={<ContentCopyOutlinedIcon />}
          title="No background drawing"
          description="Drop the cropped master layout at apps/web/public/site-plan/master-layout.jpg, then reload."
        />
      ) : (
        <Stack spacing={2}>
          <FormControl size="small" sx={{ maxWidth: 320 }}>
            <InputLabel id="mapper-zone">Zone</InputLabel>
            <Select labelId="mapper-zone" label="Zone" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              {(zonesQuery.data?.data ?? []).map((z) => (
                <MenuItem key={z.id} value={z.id}>
                  {z.code} — {z.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box
            ref={boxRef}
            onClick={addPoint}
            sx={{ position: "relative", cursor: "crosshair", border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}
          >
            <Box
              component="img"
              src="/site-plan/master-layout.jpg"
              alt="Master layout drawing"
              onError={() => setImgOk(false)}
              sx={{ display: "block", width: "100%" }}
            />
            <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              {points.length > 1 && (
                <polygon
                  points={points.map((p) => `${p.x * 1000},${p.y * 1000}`).join(" ")}
                  fill="rgba(39,135,255,0.25)"
                  stroke="#2787FF"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {points.map((p, i) => (
                <circle key={i} cx={p.x * 1000} cy={p.y * 1000} r={5} fill="#2787FF" />
              ))}
            </svg>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
            <Button variant="outlined" color="inherit" disabled={points.length === 0} onClick={() => setPoints((p) => p.slice(0, -1))}>
              Undo point
            </Button>
            <Button variant="outlined" color="inherit" disabled={points.length === 0} onClick={() => setPoints([])}>
              Clear
            </Button>
            <Button
              disabled={points.length < 3}
              onClick={() => {
                void navigator.clipboard?.writeText(json).then(() => setCopied(true));
              }}
              startIcon={<ContentCopyOutlinedIcon fontSize="small" />}
            >
              {copied ? "Copied" : `Copy JSON (${points.length} pts)`}
            </Button>
          </Stack>
          <TextField label="Normalized polygon" multiline rows={6} value={json} InputProps={{ readOnly: true }} />
        </Stack>
      )}
    </Box>
  );
}
