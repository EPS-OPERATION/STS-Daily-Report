import SwapHorizOutlined from "@mui/icons-material/SwapHorizOutlined";
import UndoOutlined from "@mui/icons-material/UndoOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import type { CoordinationPoint, RoadSegment } from "@sts/shared";
import { useEffect, useRef, useState } from "react";
import { RoadMapStage, useCoordination, useRoadSegments, type RoadLine } from "@/features/site-coordination/index.js";

export interface RoadRouteChoice {
  segmentIds: string[];
  route: CoordinationPoint[] | null;
  /** Name built from the chosen segments (null for a free-drawn road: the typed name stays). */
  name: string | null;
}

const near = (a: CoordinationPoint, b: CoordinationPoint) => Math.hypot(a.x - b.x, a.y - b.y);

// Joins the chosen segments end to end in tap order: each one is turned so it starts where the
// previous one ended, and the first one so it leads into the second.
export function chainSegments(chosen: RoadSegment[]): CoordinationPoint[] {
  const out: CoordinationPoint[] = [];
  chosen.forEach((s, i) => {
    let pts = s.points;
    if (i === 0) {
      const next = chosen[1];
      if (next) {
        const end = pts[pts.length - 1]!, start = pts[0]!;
        const gap = (p: CoordinationPoint) => Math.min(near(p, next.points[0]!), near(p, next.points[next.points.length - 1]!));
        if (gap(start) < gap(end)) pts = [...pts].reverse();
      }
    } else {
      const prev = out[out.length - 1]!;
      if (near(pts[pts.length - 1]!, prev) < near(pts[0]!, prev)) pts = [...pts].reverse();
      if (near(pts[0]!, prev) < 1e-6) pts = pts.slice(1);
    }
    out.push(...pts);
  });
  return out;
}

const ROAD = "#64748B";

// Road request: where on the map. Tap register segments in driving order (arrows show the way), or
// draw a temporary road by tapping points when the road is not in the register.
export function RoadRoutePicker({
  open,
  projectId,
  date,
  color,
  initial,
  onClose,
  onApply,
}: {
  open: boolean;
  projectId: string;
  date: string;
  color: string;
  initial: { segmentIds: string[]; route: CoordinationPoint[] | null };
  onClose: () => void;
  onApply: (choice: RoadRouteChoice) => void;
}) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const day = useCoordination(open ? projectId : null, date);
  const roads = useRoadSegments(open ? projectId : null);
  const register = roads.data?.data ?? [];
  const [mode, setMode] = useState<"segments" | "free">(initial.segmentIds.length || !initial.route ? "segments" : "free");
  const [ids, setIds] = useState<string[]>(initial.segmentIds);
  const [free, setFree] = useState<CoordinationPoint[]>(initial.segmentIds.length ? [] : initial.route ?? []);
  const [flip, setFlip] = useState(false);
  const byId = new Map(register.map((s) => [s.id, s]));
  const chosen = ids.map((id) => byId.get(id)).filter((s): s is RoadSegment => Boolean(s));
  const chained = chainSegments(chosen);
  const route = mode === "segments" ? (flip ? [...chained].reverse() : chained) : free;
  const map = day.data?.data.map;

  const tapSegment = (id: string) => {
    const s = byId.get(id);
    if (!s || s.closed) return;
    setIds((cur) => (cur[cur.length - 1] === id ? cur.slice(0, -1) : cur.includes(id) ? cur : [...cur, id]));
  };
  const lines: RoadLine[] = [
    ...register.map((s) => ({
      id: s.id, points: s.points, color: s.closed ? "#CBD5E1" : ROAD, label: s.name, dashed: s.closed,
      muted: mode === "free" || ids.includes(s.id),
    })),
    ...(route.length >= 2 ? [{ id: "__route", points: route, color, arrows: true }] : []),
  ];
  const names = [...new Set((flip ? [...chosen].reverse() : chosen).map((s) => s.name))].join(" → ");
  const ready = route.length >= 2;
  const apply = () => {
    onApply(mode === "segments"
      ? { segmentIds: chosen.map((s) => s.id), route, name: names.slice(0, 120) }
      : { segmentIds: [], route: free, name: null });
    onClose();
  };
  // Reopened request: the saved line tells which way it runs (ids keep the tap order).
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current || !register.length || !initial.route || !initial.segmentIds.length) return;
    checked.current = true;
    const c = chainSegments(initial.segmentIds.map((id) => byId.get(id)).filter((s): s is RoadSegment => Boolean(s)));
    if (c.length && near(c[0]!, initial.route[0]!) > near(c[c.length - 1]!, initial.route[0]!)) setFlip(true);
  }, [register.length]);

  const n = mode === "segments" ? chosen.length : free.length;
  const hint = mode === "segments"
    ? n === 0 ? "แตะช่วงถนนที่จะใช้ เรียงตามทางที่วิ่ง (แตะช่วงสุดท้ายซ้ำเพื่อเอาออก)" : `เลือก ${n} ช่วง — ลูกศรชี้ทางที่วิ่ง`
    : n === 0 ? "แตะจุดเริ่มต้นบนถนน แล้วแตะต่อตามแนวถนน" : `วางแล้ว ${n} จุด`;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={phone}>
      <DialogTitle>เส้นทางที่ใช้ถนน</DialogTitle>
      <DialogContent sx={{ px: { xs: 1, sm: 3 } }}>
        <Stack spacing={1.25}>
          <ToggleButtonGroup exclusive size="small" value={mode} onChange={(_, m) => m && setMode(m)} fullWidth>
            <ToggleButton value="segments">เลือกจากทะเบียนถนน</ToggleButton>
            <ToggleButton value="free">ถนนชั่วคราว (วาดเอง)</ToggleButton>
          </ToggleButtonGroup>
          {mode === "segments" && roads.isSuccess && register.length === 0 ? (
            <Alert severity="info">ยังไม่มีถนนในทะเบียน — ใช้ «ถนนชั่วคราว (วาดเอง)» ไปก่อน หรือแจ้ง EPS ให้เพิ่มถนน</Alert>
          ) : null}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" sx={{ fontWeight: 600, flex: { xs: "1 1 100%", sm: "1 1 0" }, minWidth: 0, minHeight: "2.9em", display: "flex", alignItems: "center" }}>{hint}</Typography>
            <Button size="small" startIcon={<UndoOutlined fontSize="small" />} disabled={!n}
              onClick={() => (mode === "segments" ? setIds((c) => c.slice(0, -1)) : setFree((c) => c.slice(0, -1)))}>ย้อน</Button>
            <Button size="small" startIcon={<SwapHorizOutlined fontSize="small" />} disabled={!ready}
              onClick={() => (mode === "segments" ? setFlip((f) => !f) : setFree((c) => [...c].reverse()))}>กลับทิศทาง</Button>
          </Stack>
          {map ? (
            <RoadMapStage map={map} lines={lines} height={phone ? 420 : 480}
              onTapLine={mode === "segments" ? tapSegment : undefined}
              onTapMap={mode === "free" ? (p) => setFree((c) => [...c, p]) : undefined} />
          ) : <Skeleton variant="rectangular" height={420} />}
          {mode === "segments" && chosen.length ? <Typography variant="caption" color="text.secondary">{names}</Typography> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>ยกเลิก</Button>
        <Button variant="contained" disableElevation disabled={!ready} onClick={apply}>ใช้เส้นทางนี้</Button>
      </DialogActions>
    </Dialog>
  );
}
