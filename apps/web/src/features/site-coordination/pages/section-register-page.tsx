import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { coordinationToday } from "@sts/shared";
import { useMemo } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { useCoordination } from "../hooks/use-coordination.js";
import { SectionEditor } from "@/features/site-coordination/components/section-editor.js";

// EPS route sections: draw each stretch of a map's route once (e.g. 33 kV line A-B … G-H), with its colour and the
// work it covers. Contractors then link a job to a section, and the Map page shows the coloured line and a legend.
// Flow: Add section → tap along the route (floating Undo / Done) → code, work, colour → Save.
export function SectionRegisterPage() {
  const { projectId } = useCurrentProject();
  const [params, setParams] = useSearchParams();
  const day = useCoordination(projectId, coordinationToday());
  const data = day.data?.data;
  const maps = data?.maps ?? [];
  const map = maps.find((m) => m.id === params.get("mapId")) ?? data?.map;
  const sections = useMemo(() => (data?.sections ?? []).filter((s) => s.mapId === map?.id), [data, map?.id]);
  const changeMap = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === data?.map.id) next.delete("mapId"); else next.set("mapId", id);
    setParams(next, { replace: true });
  };

  return (
    <Box>
      <PageHeader title="Route sections" subtitle="วาดช่วงของแนวสาย/ทางครั้งเดียว (เช่น A-B … G-H) พร้อมงานของแต่ละช่วง — ผู้รับเหมาเลือกช่วงตอนวางงานบนแผนที่"
        actions={<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {maps.length > 1 && map ? <TextField select size="small" label="Area" value={map.id} onChange={(e) => changeMap(e.target.value)} sx={{ width: 240, flex: "none" }}>
            {maps.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </TextField> : null}
          <Box component={RouterLink} to="/site-coordination" sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", textDecoration: "none", px: 1 }}>
            <ArrowBackOutlined fontSize="small" /> Back to Map
          </Box>
        </Stack>} />
      {day.isError ? <Alert severity="error" sx={{ mb: 2 }}>โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้า</Alert> : null}
      {map ? <SectionEditor key={map.id} projectId={projectId} map={map} sections={sections} /> : null}
    </Box>
  );
}
