import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { CoordinationPoint, RoadSegment } from "@sts/shared";
import { useMemo } from "react";
import { RoadMapStage, useCoordination, useRoadSegments, type RoadLine } from "@/features/site-coordination/index.js";
import { Frame } from "@/components/ui/frame.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { TOKENS } from "@/app/theme/tokens.js";

export interface RoadPickValue { segmentIds: string[]; route: CoordinationPoint[] | null; name: string }

const ROAD = TOKENS.muted;
const PICKED = TOKENS.primary;

// Road request = the site roads the contractor will use or close tomorrow: any number, connected or not,
// no direction. Pick them from the list or tap them on the map beside it (tap again to take one out).
// The map page draws each picked road; a clash is the same road at overlapping times (another contractor).
// Drawing roads stays on the Map page only.
export function useRoadPick({
  projectId,
  date,
  segmentIds,
  onChange,
}: {
  projectId: string;
  date: string;
  segmentIds: string[];
  onChange: (v: RoadPickValue) => void;
}) {
  const roads = useRoadSegments(projectId);
  const day = useCoordination(projectId, date);
  const map = day.data?.data.map;
  const register = useMemo(() => (roads.data?.data ?? []).filter((s) => !s.closed), [roads.data]);
  const byId = new Map(register.map((s) => [s.id, s]));
  const picked = segmentIds.map((id) => byId.get(id)).filter((s): s is RoadSegment => Boolean(s));

  const pick = (next: RoadSegment[]) =>
    onChange({ segmentIds: next.map((s) => s.id), route: null, name: next.map((s) => s.name).join(", ").slice(0, 120) });
  const toggle = (id: string) => {
    const road = byId.get(id);
    if (road) pick(picked.some((s) => s.id === id) ? picked.filter((s) => s.id !== id) : [...picked, road]);
  };

  return { register, map, picked, pick, toggle, loading: roads.isLoading || day.isLoading, hasRegister: register.length > 0 };
}

type RoadPickState = ReturnType<typeof useRoadPick>;

export function RoadPickField({ state, error }: { state: RoadPickState; error?: string }) {
  const { register, picked, pick, loading } = state;
  return (
    <Autocomplete
      multiple
      size="small"
      options={register}
      value={picked}
      onChange={(_, v) => pick(v)}
      getOptionLabel={(s) => s.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterSelectedOptions
      noOptionsText={loading ? "กำลังโหลด…" : "ไม่มีถนนในทะเบียน"}
      renderOption={(props, s) => {
        const { key, ...rest } = props as typeof props & { key: string };
        return (
          <li key={key} {...rest}>
            <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>
              {s.road}
            </Typography>
            {s.name}
          </li>
        );
      }}
      renderValue={(value, getItemProps) =>
        value.map((s, i) => {
          const { key, ...rest } = getItemProps({ index: i });
          return <Chip key={key} {...rest} size="small" color="primary" label={s.name} />;
        })
      }
      renderInput={(params) => (
        <TextField {...params} label="ถนนที่ใช้ / ปิด" placeholder={picked.length ? "เพิ่มถนน" : "เลือกถนน หรือแตะถนนบนผัง"} error={Boolean(error)} helperText={error} />
      )}
    />
  );
}

// Always-visible site map: grey roads with names, the picked ones in blue. Tap a road to pick it, again to remove it.
export function RoadPickMap({ state, height = 260 }: { state: RoadPickState; route?: CoordinationPoint[] | null; height?: number }) {
  const { register, map, picked, toggle } = state;
  if (!map) return <BlockSkeleton height={height} />;
  const pickedIds = new Set(picked.map((s) => s.id));
  const lines: RoadLine[] = register.map((s) => ({
    id: s.id, points: s.points, label: s.name,
    color: pickedIds.has(s.id) ? PICKED : ROAD, muted: !pickedIds.has(s.id),
  }));
  return (
    <Frame>
      <RoadMapStage map={map} lines={lines} height={height} onTapLine={toggle} />
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1, py: 0.5, borderTop: 1, borderColor: "divider" }}>
        แตะถนนเพื่อเลือก · แตะซ้ำเพื่อเอาออก
      </Typography>
    </Frame>
  );
}

/** True when the project has roads in the register (the list replaces the free-text road name). */
export function useHasRoadRegister(projectId: string) {
  const roads = useRoadSegments(projectId);
  return (roads.data?.data ?? []).some((s) => !s.closed);
}
