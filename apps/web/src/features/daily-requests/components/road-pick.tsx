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

// One choice per road name: a road EPS drew in several pieces (same name) is picked and booked as a whole.
interface RoadChoice { key: string; road: string; name: string; pieces: RoadSegment[] }

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
  const choices = useMemo(() => {
    const byName = new Map<string, RoadChoice>();
    for (const s of register) {
      const key = s.name.trim().toLowerCase();
      const c = byName.get(key) ?? byName.set(key, { key, road: s.road, name: s.name, pieces: [] }).get(key)!;
      c.pieces.push(s);
    }
    return [...byName.values()];
  }, [register]);
  const choiceOf = new Map(choices.flatMap((c) => c.pieces.map((p) => [p.id, c] as const)));
  const chosen = new Set(segmentIds);
  // A road counts as picked when any of its pieces is booked (older requests may hold only one piece).
  const picked = choices.filter((c) => c.pieces.some((p) => chosen.has(p.id)));

  const pick = (next: RoadChoice[]) =>
    onChange({ segmentIds: next.flatMap((c) => c.pieces.map((p) => p.id)), route: null, name: next.map((c) => c.name).join(", ").slice(0, 120) });
  const toggle = (id: string) => {
    const choice = choiceOf.get(id);
    if (choice) pick(picked.includes(choice) ? picked.filter((c) => c !== choice) : [...picked, choice]);
  };

  return { register, choices, map, picked, pick, toggle, loading: roads.isLoading || day.isLoading, hasRegister: register.length > 0 };
}

type RoadPickState = ReturnType<typeof useRoadPick>;

export function RoadPickField({ state, error }: { state: RoadPickState; error?: string }) {
  const { choices, picked, pick, loading } = state;
  return (
    <Autocomplete
      multiple
      size="small"
      options={choices}
      value={picked}
      onChange={(_, v) => pick(v)}
      getOptionLabel={(s) => s.name}
      isOptionEqualToValue={(a, b) => a.key === b.key}
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
  const { choices, map, picked, toggle } = state;
  if (!map) return <BlockSkeleton height={height} />;
  // Every piece of a picked road lights up; the name is written once, on the first piece.
  const lines: RoadLine[] = choices.flatMap((c) =>
    c.pieces.map((s, i) => ({
      id: s.id, points: s.points, label: i === 0 ? s.name : "",
      color: picked.includes(c) ? PICKED : ROAD, muted: !picked.includes(c),
    })),
  );
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
