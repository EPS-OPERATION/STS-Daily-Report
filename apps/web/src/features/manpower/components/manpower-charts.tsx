import Grid from "@mui/material/Grid";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { ManDayByContractorChart, ManpowerByBuildingChart, NationalityByContractorChart, PositionByContractorChart } from "@/features/report-summaries/index.js";
import type { UseManpowerPageState } from "../hooks/use-manpower-page.js";
import { ChartPanel } from "./manpower-parts.js";

export function ManpowerCharts({ ed }: { ed: UseManpowerPageState }) {
  const { days, positions, colors, selectedCodes, isFiltered, filteredContractors, filteredDaily, filteredByBuilding, filteredPositions, wide, gridRef, panelHeight, chartHeight, legendChartHeight } = ed;
  return (
    <Grid container spacing={wide ? 0 : 2.5} ref={gridRef} sx={wide ? { borderTop: 1, borderLeft: 1, borderColor: "divider", bgcolor: "background.paper" } : undefined}>
      <Grid size={{ xs: 12, lg: 6 }}>
        <ChartPanel
          height={panelHeight}
          title="Man-day รายวัน แยกตามผู้รับเหมา"
          note={
            isFiltered
              ? `จำนวนคนเข้างานต่อวัน (กรองเฉพาะ ${selectedCodes.size} เจ้าที่เลือก)`
              : "จำนวนคนเข้างานต่อวัน (รายงานเช้า)"
          }
        >
          <ManDayByContractorChart days={days} daily={filteredDaily} colors={colors} height={chartHeight} legend={chartHeight === undefined} />
        </ChartPanel>
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }}>
        <ChartPanel
          height={panelHeight}
          title="สัญชาติ / เพศ แยกตามผู้รับเหมา"
          note={
            isFiltered
              ? `คน-วัน รวมในช่วงที่เลือก (${selectedCodes.size} เจ้า)`
              : "คน-วัน รวมในช่วงที่เลือก"
          }
        >
          <NationalityByContractorChart contractors={filteredContractors} height={legendChartHeight === undefined ? undefined : legendChartHeight - 22} />
        </ChartPanel>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <ChartPanel
          height={panelHeight}
          title="กำลังคนแยกตามอาคาร"
          note={
            isFiltered
              ? `คน-วัน รวมในช่วงที่เลือก แยกสีตามผู้รับเหมา (${selectedCodes.size} เจ้า)`
              : "คน-วัน รวมในช่วงที่เลือก แยกสีตามผู้รับเหมา"
          }
        >
          <ManpowerByBuildingChart rows={filteredByBuilding} colors={colors} height={legendChartHeight} />
        </ChartPanel>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <ChartPanel
          height={panelHeight}
          title="จำนวนคนตามตำแหน่ง แยกตามผู้รับเหมา"
          note={
            isFiltered
              ? `จำนวนคนรวมตามตำแหน่ง ในช่วงที่เลือก (${selectedCodes.size} เจ้า)`
              : "จำนวนคนรวมตามตำแหน่ง ในช่วงที่เลือก"
          }
        >
          {positions.data ? (
            <PositionByContractorChart rows={filteredPositions} colors={colors} height={legendChartHeight} />
          ) : (
            <BlockSkeleton height={chartHeight ?? 320} />
          )}
        </ChartPanel>
      </Grid>
    </Grid>
  );
}
