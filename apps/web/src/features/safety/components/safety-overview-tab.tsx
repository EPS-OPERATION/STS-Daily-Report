import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import { type ReactNode } from "react";
import { KpiCard } from "@/components/ui/kpi-card.js";
import { Panel } from "@/components/ui/panel.js";
import { MonthlyTrendChart } from "./safety-charts.js";
import { StatisticTable } from "./statistic-table.js";
import type { SafetyStats } from "../types/safety.types.js";

export function OverviewTab({ s }: { s: SafetyStats }) {
  return (
    <Stack spacing={2.5}>
          {/* tiles (deck "SAFETY PERFORMANCE") */}
          <Grid container spacing={1.5}>
            <Tile label="อุบัติเหตุ" value={s.tiles.accidents} unit="ครั้ง" alert={s.tiles.accidents > 0} />
            <Tile label="LTI" value={s.tiles.lti} unit="ครั้ง" alert={s.tiles.lti > 0} />
            <Tile label="Near Miss" value={s.tiles.nearMiss} unit="รายการ" />
            <Tile label="ตรวจความปลอดภัย" value={s.tiles.inspections} unit="ครั้ง" />
            <Tile
              label="ข้อประเด็นแก้ไข"
              value={s.tiles.closedPct === null ? "—" : `${s.tiles.closedPct}%`}
              unit={`(${s.tiles.closed}/${s.tiles.inspections})`}
            />
            <Tile label="อุบัติเหตุเป็นศูนย์" value={s.daysWithoutAccident} unit="วัน" good icon={<HealthAndSafetyOutlinedIcon />} />
          </Grid>
    
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Panel fill title="STATISTIC" subtitle="จากรายงานบ่ายของผู้รับเหมา (ประเภทเหตุการณ์) + ชั่วโมงทำงาน">
                <StatisticTable stats={s} compact />
              </Panel>
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Panel fill title={`แนวโน้มความปลอดภัย (รายเดือน ${s.to.slice(0, 4)})`} subtitle="Near miss จากผู้รับเหมา · Safety inspection = Line walk ของ EPS">
                <MonthlyTrendChart stats={s} height={300} />
              </Panel>
            </Grid>
          </Grid>
        </Stack>
  );
}

function Tile({
  label,
  value,
  unit,
  alert,
  good,
  icon,
}: {
  label: string;
  value: number | string;
  unit: string;
  alert?: boolean;
  good?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
      <KpiCard
        label={label}
        value={String(value)}
        unit={unit}
        sub={alert ? "ต้องติดตาม" : good ? "วันต่อเนื่อง" : undefined}
        subTone={alert ? "error" : good ? "success" : "muted"}
        icon={icon}
      />
    </Grid>
  );
}

