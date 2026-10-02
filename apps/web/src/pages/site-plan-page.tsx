import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { workloadLevel } from "@sts/shared";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { WorkloadLegend, todayIso } from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import {
  BuildingDayPanel,
  SITE_MAP_VIEW_LIST,
  SiteMapImage,
  useSiteDay,
  useSiteMap,
  type MapMarker,
  type SiteMapView,
} from "@/features/site-plan/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Site plan from daily-report data: tap a building on the map to see that day's
// people, work and requests in it. Markers show headcount, tinted by density.
export function SitePlanPage() {
  const [params, setParams] = useSearchParams();
  // Range from the URL; an old ?date= link still works as a one-day range.
  const single = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : todayIso();
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : single;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const isRange = from !== to;
  const view: SiteMapView = SITE_MAP_VIEW_LIST.includes(params.get("view") as SiteMapView) ? (params.get("view") as SiteMapView) : "overview";
  const selectedId = params.get("b");
  const { projectId } = useCurrentProject();
  const map = useSiteMap(projectId);
  const day = useSiteDay(projectId, from, to);

  const set = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    setParams(p, { replace: true });
  };

  const buildings = map.data?.data ?? [];
  const dayBuildings = day.data?.data.buildings ?? [];
  const counts = useMemo(
    () => new Map(dayBuildings.map((b) => [b.id, { headcount: isRange ? b.avgDaily : b.headcount, contractors: b.contractors.length }])),
    [dayBuildings],
  );
  const selected = dayBuildings.find((b) => b.id === selectedId) ?? null;
  const theme = useTheme();
  // Building markers carry the day's headcount, tinted by density; the selected
  // building also shows its work parts (configured on /site-plan/config).
  const markers: MapMarker[] = buildings.flatMap((b) => {
    const point = b.markers[view];
    const c = counts.get(b.id);
    const level = workloadLevel(c?.headcount ?? 0, c?.contractors ?? 0);
    const tone =
      level === "high"
        ? { bg: theme.palette.warning.dark, fg: theme.palette.common.white }
        : level === "medium"
          ? { bg: theme.palette.warning.main, fg: theme.palette.warning.contrastText }
          : level === "low"
            ? { bg: theme.palette.success.main, fg: theme.palette.common.white }
            : undefined;
    const own: MapMarker[] = point
      ? [
          {
            id: b.id,
            kind: "building",
            label: String(c?.headcount ?? 0),
            title: `${b.name} · ${c?.headcount ?? 0} ${isRange ? "คน/วัน (เฉลี่ย)" : "คน"}${c?.contractors ? ` · ${c.contractors} ผู้รับเหมา` : ""}`,
            point,
            tone,
            selected: b.id === selectedId,
          },
        ]
      : [];
    const parts: MapMarker[] =
      b.id === selectedId
        ? b.parts
            .filter((pt) => pt.status === "active" && pt.markers[view])
            .map((pt) => ({ id: pt.id, kind: "part", label: pt.code, title: `${b.name} · ${pt.name}`, point: pt.markers[view]! }))
        : [];
    return [...own, ...parts];
  });
  const unplaced = buildings.filter((b) => !b.markers[view]).length;
  const error = [map.error, day.error].find((e) => e instanceof HttpError) as HttpError | undefined;

  return (
    <Box>
      <PageHeader
        title="Site Plan"
        subtitle="แตะอาคารบนแผนที่เพื่อดูกำลังคน กิจกรรม และคำขอ — เลือกวันเดียวหรือช่วงวันที่ (ช่วง = เฉลี่ยคน/วัน)"
        actions={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <DateRangeFields from={from} to={to} maxDays={62} onChange={(f, t) => set({ from: f, to: t, date: null })} />
            <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v: SiteMapView | null) => v && set({ view: v })}>
              <ToggleButton value="overview">Overview</ToggleButton>
              <ToggleButton value="topview">Top view</ToggleButton>
              <ToggleButton value="plan">Plan</ToggleButton>
            </ToggleButtonGroup>
            <Button component={RouterLink} to="/site-plan/config" size="small" variant="outlined" startIcon={<TuneOutlinedIcon />}>
              ตั้งค่าหมุด
            </Button>
          </Stack>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          โหลดข้อมูลไม่สำเร็จ: {error.message}
        </Alert>
      ) : null}

      {!map.data || !day.data ? (
        <Skeleton variant="rounded" height={480} />
      ) : (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <SiteMapImage
              view={view}
              markers={markers}
              onMarkerClick={(id) => {
                if (buildings.some((b) => b.id === id)) set({ b: id === selectedId ? null : id });
              }}
            />
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mt: 1.25 }}>
              <WorkloadLegend />
              {unplaced ? (
                <Typography variant="caption" color="warning.dark">
                  {unplaced} อาคารยังไม่ได้วางหมุดในมุมมองนี้ — เลือกได้จากรายการด้านล่าง
                </Typography>
              ) : null}
            </Stack>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mt: 1.5 }}>
              {dayBuildings.map((b) => (
                <Chip
                  key={b.id}
                  label={`${b.name}${b.headcount ? ` · ${b.headcount}` : ""}`}
                  variant={b.id === selectedId ? "filled" : "outlined"}
                  color={b.id === selectedId ? "primary" : "default"}
                  onClick={() => set({ b: b.id === selectedId ? null : b.id })}
                  sx={{ fontWeight: b.headcount ? 700 : 400 }}
                />
              ))}
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, lg: 5 }}>
            {selected ? (
              <BuildingDayPanel building={selected} from={from} to={to} onClose={() => set({ b: null })} />
            ) : (
              // Nothing selected: the day's busiest buildings, so the panel is never empty.
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: 2 }}>
                <Typography variant="h5">{isRange ? "อาคารที่มีงานในช่วงนี้" : "อาคารที่มีงานวันนี้"}</Typography>
                <Typography variant="caption" color="text.secondary">
                  แตะหมุดหรือรายการเพื่อดูรายละเอียด
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                  {[...dayBuildings]
                    .filter((b) => b.headcount > 0 || b.machinery.length + b.equipment.length + b.roads.length + b.inspections.length > 0)
                    .sort((a, b) => b.headcount - a.headcount)
                    .map((b) => (
                      <Button
                        key={b.id}
                        variant="text"
                        color="inherit"
                        onClick={() => set({ b: b.id })}
                        sx={{ justifyContent: "space-between", textAlign: "left" }}
                      >
                        <span>{b.name}</span>
                        <Typography component="span" variant="body2" color="text.secondary">
                          {isRange ? `${b.headcount} คน-วัน · เฉลี่ย ${b.avgDaily}/วัน` : `${b.headcount} คน`} · {b.contractors.length} ผรม.
                        </Typography>
                      </Button>
                    ))}
                  {dayBuildings.every((b) => b.headcount === 0) ? (
                    <Typography variant="body2" color="text.secondary">
                      ยังไม่มีรายงานเช้าในช่วงที่เลือก
                    </Typography>
                  ) : null}
                </Stack>
              </Box>
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
