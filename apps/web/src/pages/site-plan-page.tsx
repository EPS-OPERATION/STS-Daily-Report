import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header.js";
import { SiteOverviewCard } from "@/features/site-plan/index.js";
import { ActivityDialog } from "@/features/site-plan/components/activity-dialog.js";
import { ZoneDrawer } from "@/features/site-plan/components/zone-drawer.js";
import { useSiteActivities } from "@/features/site-plan/hooks/use-site-activities.js";
import { usePlanZones } from "@/features/site-plan/hooks/use-site-plan.js";
import { useCurrentProject } from "@/features/projects/context/project-context.js";

function todayLocal(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Overview-first layout: tap a building on the 3D view to see today's
// activity in the drawer. No 2D zone map — see /site-plan/config for geometry admin.
export function SitePlanPage() {
  const { projectId } = useCurrentProject();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [date] = useState(todayLocal);

  const zonesQuery = usePlanZones(projectId);
  const zones = useMemo(() => zonesQuery.data?.data ?? [], [zonesQuery.data]);
  const activitiesQuery = useSiteActivities(projectId, { date });

  const selectedZone = useMemo(() => {
    const z = zones.find((zz) => zz.id === selectedId);
    return z ? { id: z.id, code: z.code, name: z.name } : null;
  }, [zones, selectedId]);

  const selectedActivities = useMemo(
    () => (activitiesQuery.data?.data ?? []).filter((a) => a.zone.id === selectedId),
    [activitiesQuery.data, selectedId],
  );

  if (!projectId) {
    return (
      <Box>
        <PageHeader title="Site Plan" subtitle="Tap a building on the overview to see today's activity" />
        <SiteOverviewCard onSelectZone={() => {}} />
        <Typography color="text.secondary">Select a project to view its activity.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title="Site Plan" subtitle="Tap a building on the overview to see today's activity" />
      <SiteOverviewCard onSelectZone={setSelectedId} />
      <ZoneDrawer
        zone={selectedZone}
        date={date}
        activities={selectedActivities}
        onClose={() => setSelectedId(null)}
        onAdd={() => setDialogOpen(true)}
      />
      <ActivityDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        projectId={projectId}
        zones={zones}
        defaultZoneId={selectedId}
        defaultDate={date}
      />
    </Box>
  );
}
