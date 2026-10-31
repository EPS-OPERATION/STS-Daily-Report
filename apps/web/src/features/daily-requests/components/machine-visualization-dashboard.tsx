import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts";
import { useMemo, type ReactNode } from "react";
import { CHART_OTHER } from "@/app/theme/chart-palette.js";
import { EmptySection, EmptyState } from "@/components/ui/empty-state.js";
import { Panel } from "@/components/ui/panel.js";
import { QueryError } from "@/components/ui/query-error.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { contractorColorMap } from "@/features/contractors/index.js";
import { useProjectContractors } from "@/features/projects/index.js";
import { formatNumber } from "@/lib/format.js";
import { useMachineSummary } from "../hooks/use-daily-requests.js";

function ChartPanel({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <Panel fill sx={{ overflow: "hidden", height: "100%", p: 2 }}>
      <Stack direction="column" spacing={0.25} sx={{ minWidth: 0, mb: 1 }}>
        <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontSize: "1rem" }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="p" title={note}>
          {note}
        </Typography>
      </Stack>
      <Box sx={{ mt: 1 }}>{children}</Box>
    </Panel>
  );
}

const legendBottom = {
  legend: {
    direction: "horizontal" as const,
    position: { vertical: "bottom" as const, horizontal: "center" as const },
    sx: { maxWidth: "100%", flexWrap: "nowrap", overflowX: "auto", overflowY: "hidden", justifyContent: "flex-start", gap: 1.5, scrollbarWidth: "thin", "& > li": { flexShrink: 0 } },
  },
};

export function MachineVisualizationDashboard({
  projectId,
  from,
  to,
  selectedCodes,
}: {
  projectId: string | null;
  from: string;
  to: string;
  selectedCodes: Set<string>;
}) {
  const query = useMachineSummary(projectId, from, to);
  const projectContractors = useProjectContractors(projectId).data?.data ?? [];
  const contractorCodes = useMemo(() => projectContractors.map((c) => c.code), [projectContractors]);
  const colors = useMemo(() => contractorColorMap(contractorCodes, projectContractors), [contractorCodes, projectContractors]);

  const data = query.data;
  const rawOnSite = data?.onSite ?? [];
  const rawBookings = data?.bookings ?? [];

  // Filter by selected contractors
  const onSite = useMemo(() => rawOnSite.filter((r) => selectedCodes.has(r.contractorCode)), [rawOnSite, selectedCodes]);
  const bookings = useMemo(() => rawBookings.filter((b) => selectedCodes.has(b.contractorCode)), [rawBookings, selectedCodes]);

  // Contractors active in machine reports or bookings
  const activeContractorCodes = useMemo(() => {
    const set = new Set<string>();
    for (const r of onSite) set.add(r.contractorCode);
    for (const b of bookings) set.add(b.contractorCode);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [onSite, bookings]);

  // 1. Chart Data: Machine Bookings by Building / Area (Horizontal stacked by contractor)
  const buildingBars = useMemo(() => {
    const byBuilding = new Map<string, { code: string; name: string; byContractor: Record<string, number>; total: number }>();
    for (const b of bookings) {
      const key = b.buildingCode || "Unspecified";
      const item = byBuilding.get(key) ?? {
        code: key,
        name: b.buildingNameTh || b.buildingName || key,
        byContractor: {},
        total: 0,
      };
      item.byContractor[b.contractorCode] = (item.byContractor[b.contractorCode] ?? 0) + 1;
      item.total += 1;
      byBuilding.set(key, item);
    }
    const list = [...byBuilding.values()].sort((a, b) => b.total - a.total);
    if (list.length <= 8) return list;
    const top = list.slice(0, 7);
    const rest = list.slice(7);
    const other: (typeof list)[number] = {
      code: "OTHER",
      name: `อื่นๆ (${rest.length} พื้นที่)`,
      byContractor: {},
      total: rest.reduce((sum, r) => sum + r.total, 0),
    };
    for (const r of rest) {
      for (const [c, n] of Object.entries(r.byContractor)) {
        other.byContractor[c] = (other.byContractor[c] ?? 0) + n;
      }
    }
    return [...top, other];
  }, [bookings]);

  // 2. Chart Data: Machines by Equipment Type (Horizontal stacked by contractor)
  const typeBars = useMemo(() => {
    const byType = new Map<string, { type: string; byContractor: Record<string, number>; total: number }>();
    for (const r of onSite) {
      const item = byType.get(r.equipmentType) ?? { type: r.equipmentType, byContractor: {}, total: 0 };
      item.byContractor[r.contractorCode] = (item.byContractor[r.contractorCode] ?? 0) + r.qty;
      item.total += r.qty;
      byType.set(r.equipmentType, item);
    }
    const list = [...byType.values()].sort((a, b) => b.total - a.total);
    if (list.length <= 8) return list;
    const top = list.slice(0, 7);
    const rest = list.slice(7);
    const other: (typeof list)[number] = {
      type: `อื่นๆ (${rest.length} ชนิด)`,
      byContractor: {},
      total: rest.reduce((sum, r) => sum + r.total, 0),
    };
    for (const r of rest) {
      for (const [c, n] of Object.entries(r.byContractor)) {
        other.byContractor[c] = (other.byContractor[c] ?? 0) + n;
      }
    }
    return [...top, other];
  }, [onSite]);

  if (!projectId) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        กรุณาเลือกโครงการด้านบนเพื่อดูการวิเคราะห์การใช้เครื่องจักร
      </Alert>
    );
  }

  if (query.isLoading) return <BlockSkeleton height={360} />;
  if (query.error) return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
  if (!data || (!onSite.length && !bookings.length)) {
    return (
      <EmptyState
        icon={<PrecisionManufacturingOutlinedIcon />}
        title="ยังไม่มีข้อมูลเครื่องจักรในช่วงวันที่นี้"
        description="เครื่องจักรในไซต์มาจาก Daily Report (เช้า) และเครื่องจักรที่ขอใช้มาจาก Daily Request (บ่าย) ของผู้รับเหมา"
      />
    );
  }

  return (
    <Stack spacing={2.5}>
      {/* 2 Visualization Charts Grid: By Building & By Type */}
      <Grid container spacing={2.5}>
        {/* Left: Machine Bookings by Building / Area */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartPanel
            title="การใช้เครื่องจักรแยกตามอาคาร / พื้นที่"
            note="รายการขอใช้เครื่องจักร รวมในช่วงที่เลือก แยกสีตามผู้รับเหมา"
          >
            {buildingBars.length > 0 ? (
              <BarChart
                height={360}
                layout="horizontal"
                borderRadius={3}
                yAxis={[
                  {
                    scaleType: "band",
                    data: buildingBars.map((b) => `${b.name}  ${b.total}`),
                    width: 170,
                    tickLabelStyle: { fontSize: 12 },
                  },
                ]}
                xAxis={[{ label: "รายการ", min: 0 }]}
                series={activeContractorCodes.map((code) => ({
                  id: code,
                  label: code,
                  stack: "total",
                  color: colors.get(code) ?? CHART_OTHER,
                  data: buildingBars.map((b) => b.byContractor[code] ?? 0),
                  valueFormatter: (v: number | null) => (v ? `${formatNumber(v)} รายการ` : null),
                }))}
                slotProps={legendBottom}
                grid={{ vertical: true }}
              />
            ) : (
              <EmptySection title="ยังไม่มีรายการขอใช้เครื่องจักรลงอาคารในช่วงนี้" height={320} />
            )}
          </ChartPanel>
        </Grid>

        {/* Right: Machines by Equipment Type */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartPanel
            title="ชนิดเครื่องจักร แยกตามผู้รับเหมา"
            note="จำนวนเครื่องรวมตามชนิดเครื่องจักร ในช่วงที่เลือก"
          >
            {typeBars.length > 0 ? (
              <BarChart
                height={360}
                layout="horizontal"
                borderRadius={3}
                yAxis={[
                  {
                    scaleType: "band",
                    data: typeBars.map((t) => `${t.type}  ${t.total}`),
                    width: 170,
                    tickLabelStyle: { fontSize: 12 },
                  },
                ]}
                xAxis={[{ label: "เครื่อง", min: 0 }]}
                series={activeContractorCodes.map((code) => ({
                  id: code,
                  label: code,
                  stack: "total",
                  color: colors.get(code) ?? CHART_OTHER,
                  data: typeBars.map((t) => t.byContractor[code] ?? 0),
                  valueFormatter: (v: number | null) => (v ? `${formatNumber(v)} เครื่อง` : null),
                }))}
                slotProps={legendBottom}
                grid={{ vertical: true }}
              />
            ) : (
              <EmptySection title="ยังไม่มีข้อมูลชนิดเครื่องจักรในช่วงนี้" height={320} />
            )}
          </ChartPanel>
        </Grid>
      </Grid>
    </Stack>
  );
}
