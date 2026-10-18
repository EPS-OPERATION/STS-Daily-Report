import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { minutesToTime, roadClashPairs, roadPlacesMeet, timeToMinutes } from "@sts/shared";
import type { ReportRoadUsage } from "../types/daily-request.types.js";
import { formatThaiDate } from "@/lib/dates.js";
import { StatusChip } from "@/components/ui/status-chip.js";

// One row = one booking on the road, on a shared clock. Where two contractors' bars overlap, a hatched band
// runs down the whole chart, so the collision reads as a time, not as a colour alone.
export interface TimelineRow {
  id: string;
  label: string;
  contractorId: string;
  start: string;
  end: string;
  /** The contractor's own request, drawn as an outline when EPS has moved the booking. */
  requested?: { start: string; end: string } | null;
  edited?: boolean;
  /** Hidden by the contractor filter: kept so the overlap stays true, but not interactive. */
  muted?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export const durationText = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} นาที`;
  return m === 0 ? `${h} ชม.` : `${h} ชม. ${m} นาที`;
};

// The clock shown: one hour of padding each side, at least four hours wide.
export function timelineAxis(times: string[]) {
  const minutes = times.map(timeToMinutes);
  let from = Math.max(0, Math.floor(Math.min(...minutes) / 60) * 60 - 60);
  let to = Math.min(24 * 60, Math.ceil(Math.max(...minutes) / 60) * 60 + 60);
  if (to - from < 240) to = Math.min(24 * 60, from + 240);
  return { from, to };
}

// Merged clash intervals across all rows (settled times; requested outlines are not part of the rule).
export function clashBands(rows: TimelineRow[]): { from: number; to: number }[] {
  const pairs = roadClashPairs(rows.map((r) => ({ id: r.id, contractorId: r.contractorId, startTime: r.start, endTime: r.end })));
  const spans = pairs
    .map((p) => ({ from: timeToMinutes(p.start), to: timeToMinutes(p.end) }))
    .sort((a, b) => a.from - b.from);
  const merged: { from: number; to: number }[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.from <= last.to) last.to = Math.max(last.to, s.to);
    else merged.push({ ...s });
  }
  return merged;
}

export function TimelineRows({ rows, compact = false }: { rows: TimelineRow[]; compact?: boolean }) {
  const theme = useTheme();
  if (rows.length === 0) return null;
  const rowHeight = compact ? 28 : 34;
  const axis = timelineAxis(rows.flatMap((r) => [r.start, r.end, ...(r.requested ? [r.requested.start, r.requested.end] : [])]));
  const span = axis.to - axis.from;
  const at = (minutes: number) => `${((minutes - axis.from) / span) * 100}%`;
  const width = (from: number, to: number) => `${((to - from) / span) * 100}%`;
  const hour = span > 9 * 60 ? 120 : 60;
  const ticks: number[] = [];
  for (let t = Math.ceil(axis.from / hour) * hour; t <= axis.to; t += hour) ticks.push(t);
  const bands = clashBands(rows);
  const trackHeight = rows.length * rowHeight;

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "52px minmax(0, 1fr)", sm: "64px minmax(0, 1fr)" }, columnGap: 1 }}>
      <Box>
        {rows.map((r) => (
          <Box key={r.id} sx={{ height: rowHeight, display: "flex", alignItems: "center", opacity: r.muted ? 0.5 : 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{r.label}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ position: "relative", pt: bands.length ? 2.25 : 0.5, pb: 0.5 }}>
        <Box sx={{ position: "relative", height: trackHeight, bgcolor: alpha(theme.palette.primary.main, 0.035), borderRadius: 1 }}>
          {ticks.map((t) => (
            <Box key={`g${t}`} aria-hidden sx={{ position: "absolute", top: 0, bottom: 0, left: at(t), width: "1px", bgcolor: "divider" }} />
          ))}
          {bands.map((b) => (
            <Box
              key={`band${b.from}`}
              role="img"
              aria-label={`Clash ${minutesToTime(b.from)}–${minutesToTime(b.to)}`}
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: at(b.from),
                width: width(b.from, b.to),
                zIndex: 1,
                bgcolor: alpha(theme.palette.error.main, 0.1),
                backgroundImage: `repeating-linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.28)} 0 5px, transparent 5px 10px)`,
                borderLeft: `1px solid ${theme.palette.error.main}`,
                borderRight: `1px solid ${theme.palette.error.main}`,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  color: "error.dark",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.2,
                  pb: 0.25,
                }}
              >
                ชนกัน {minutesToTime(b.from)}–{minutesToTime(b.to)}
              </Typography>
            </Box>
          ))}
          {rows.map((r, i) => {
            const from = timeToMinutes(r.start);
            const to = timeToMinutes(r.end);
            const top = i * rowHeight;
            const interactive = Boolean(r.onClick) && !r.muted;
            const label = `${r.label} ${r.start}–${r.end}${r.edited ? " แก้ไขแล้ว" : ""}`;
            return (
              <Box key={r.id}>
                {r.requested ? (
                  <Box
                    aria-hidden
                    sx={{
                      position: "absolute",
                      top: top + 3,
                      height: rowHeight - 6,
                      left: at(timeToMinutes(r.requested.start)),
                      width: width(timeToMinutes(r.requested.start), timeToMinutes(r.requested.end)),
                      border: `1px dashed ${theme.palette.text.disabled}`,
                      borderRadius: 1,
                      zIndex: 2,
                    }}
                  />
                ) : null}
                <Box
                  component={interactive ? "button" : "div"}
                  type={interactive ? "button" : undefined}
                  onClick={interactive ? r.onClick : undefined}
                  aria-label={interactive ? `Edit time ${label}` : label}
                  title={`${r.label} ${r.start}–${r.end}`}
                  sx={{
                    position: "absolute",
                    top: top + 4,
                    height: rowHeight - 8,
                    left: at(from),
                    width: width(from, to),
                    zIndex: 3,
                    minWidth: 6,
                    px: 0.75,
                    display: "flex",
                    alignItems: "center",
                    overflow: "hidden",
                    border: `${r.selected ? 2 : 1}px ${r.edited ? "dashed" : "solid"} ${r.edited ? theme.palette.info.main : theme.palette.primary.main}`,
                    borderRadius: 1,
                    bgcolor: r.edited ? alpha(theme.palette.info.main, 0.14) : alpha(theme.palette.primary.main, 0.16),
                    color: "text.primary",
                    font: "inherit",
                    textAlign: "left",
                    cursor: interactive ? "pointer" : "default",
                    opacity: r.muted ? 0.45 : 1,
                    "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                    "&:hover": interactive ? { bgcolor: alpha(theme.palette.primary.main, 0.26) } : undefined,
                  }}
                >
                  <Typography variant="caption" noWrap sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", fontSize: { xs: 10.5, sm: 12 } }}>
                    {r.muted ? "" : `${r.start}–${r.end}`}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
        <Box sx={{ position: "relative", height: 18, mt: 0.5 }}>
          {ticks.map((t) => (
            <Typography
              key={`t${t}`}
              variant="caption"
              color="text.secondary"
              sx={{ position: "absolute", left: at(t), transform: t === axis.to ? "translateX(-100%)" : t === axis.from ? "none" : "translateX(-50%)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", display: { xs: ticks.indexOf(t) % 2 === 0 ? "block" : "none", sm: "block" } }}
            >
              {minutesToTime(t)}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// Bookings for one road on one date: a row per booking, the clash spelled out underneath.
type ClashPair = { a: string; b: string; start: string; end: string };

// Only the bookings that collide are drawn; the rest of the road stays in the table.
function RoadGroup<T extends ReportRoadUsage>({ bookings, pairs, visibleIds, canEdit, onEdit }: { bookings: T[]; pairs: ClashPair[]; visibleIds: Set<string>; canEdit: boolean; onEdit: (r: T) => void }) {
  const theme = useTheme();
  const first = bookings[0]!;
  const byId = new Map(bookings.map((b) => [b.id, b]));
  const colliding = new Set(pairs.flatMap((p) => [p.a, p.b]));
  const rows: TimelineRow[] = bookings.filter((r) => colliding.has(r.id)).map((r) => {
    const visible = visibleIds.has(r.id);
    const moved = r.adjusted && (r.requestedStartTime !== r.startTime || r.requestedEndTime !== r.endTime);
    return {
      id: r.id,
      label: visible ? r.contractorCode : "—",
      contractorId: r.contractorId,
      start: r.startTime,
      end: r.endTime,
      requested: moved ? { start: r.requestedStartTime, end: r.requestedEndTime } : null,
      edited: r.adjusted,
      muted: !visible,
      onClick: canEdit && visible ? () => onEdit(r) : undefined,
    };
  });

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{first.roadLocation}</Typography>
        <Typography variant="caption" color="text.secondary">{formatThaiDate(first.targetDate)}</Typography>
        {pairs.length > 0 ? <StatusChip status="blocked" label={`${colliding.size} clashes`} /> : null}
        {pairs.length > 0 || rows.some((r) => r.requested) ? (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ml: { sm: "auto" } }}>
            {pairs.length > 0 ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box
                  aria-hidden
                  sx={{
                    width: 14,
                    height: 10,
                    borderRadius: 0.5,
                    border: `1px solid ${theme.palette.error.main}`,
                    bgcolor: alpha(theme.palette.error.main, 0.08),
                    backgroundImage: `repeating-linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.45)} 0 3px, transparent 3px 6px)`,
                  }}
                />
                <Typography variant="caption" color="text.secondary">ชนกัน</Typography>
              </Stack>
            ) : null}
            {rows.some((r) => r.requested) ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box aria-hidden sx={{ width: 14, height: 10, borderRadius: 0.5, border: `1px dashed ${theme.palette.text.disabled}` }} />
                <Typography variant="caption" color="text.secondary">คำขอเดิม</Typography>
              </Stack>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
      <TimelineRows rows={rows} />
      {pairs.length > 0 ? (
        <Stack component="ul" spacing={0.25} sx={{ m: 0, pl: 0, listStyle: "none" }}>
          {pairs.map((p) => {
            const a = byId.get(p.a)!;
            const b = byId.get(p.b)!;
            const minutes = timeToMinutes(p.end) - timeToMinutes(p.start);
            return (
              <Typography key={`${p.a}-${p.b}`} component="li" variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {a.contractorCode} {a.startTime}–{a.endTime} กับ {b.contractorCode} {b.startTime}–{b.endTime} · ทับกัน{" "}
                <b>{p.start}–{p.end}</b> ({durationText(minutes)})
              </Typography>
            );
          })}
        </Stack>
      ) : null}
    </Stack>
  );
}

// Road usage on the Daily Request page: one timeline per road per date. Groups that have no visible booking are hidden.
export function RoadTimelines<T extends ReportRoadUsage>({
  allRoads,
  visibleIds,
  canEdit,
  onEdit,
}: {
  allRoads: T[];
  visibleIds: Set<string>;
  canEdit: boolean;
  onEdit: (r: T) => void;
}) {
  // One group per stretch of road and date: bookings that meet (shared segment, crossing lines or
  // the same name), joined through each other.
  const groups = new Map<string, T[]>();
  const groupOf = new Map<string, string>();
  for (const r of allRoads) {
    const hits = [...new Set(allRoads.filter((o) => o.id !== r.id && groupOf.has(o.id) && o.targetDate === r.targetDate && roadPlacesMeet(r, o)).map((o) => groupOf.get(o.id)!))];
    const key = hits[0] ?? r.id;
    const merged = [...hits.flatMap((k) => groups.get(k) ?? []), r];
    for (const k of hits) groups.delete(k);
    groups.set(key, merged);
    for (const m of merged) groupOf.set(m.id, key);
  }
  if (visibleIds.size === 0) return null;
  const shown = [...groups.values()]
    .map((g) => ({
      g,
      pairs: roadClashPairs(g.map((r) => ({ id: r.id, contractorId: r.contractorId, startTime: r.startTime, endTime: r.endTime })))
        .filter((p) => { const a = g.find((r) => r.id === p.a)!, b = g.find((r) => r.id === p.b)!; return roadPlacesMeet(a, b); }),
    }))
    .filter(({ pairs }) => pairs.some((p) => visibleIds.has(p.a) || visibleIds.has(p.b)))
    .sort((a, b) => (a.g[0]!.targetDate.localeCompare(b.g[0]!.targetDate)) || a.g[0]!.roadLocation.localeCompare(b.g[0]!.roadLocation));
  if (shown.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        ไม่มีถนนที่ชนกัน
      </Typography>
    );
  }
  return (
    <Stack spacing={2} divider={<Divider flexItem />} sx={{ mb: 2 }}>
      {shown.map(({ g, pairs }) => (
        <RoadGroup
          key={g[0]!.id}
          bookings={g}
          pairs={pairs}
          visibleIds={visibleIds}
          canEdit={canEdit}
          onEdit={onEdit}
        />
      ))}
    </Stack>
  );
}
