import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useState, type ReactNode } from "react";
import { KpiCard } from "@/components/ui/kpi-card.js";
import { Panel } from "@/components/ui/panel.js";
import { SafetyStatDialog } from "./safety-stat-dialog.js";
import { SafetyTrendChart, type SafetyTrendPeriod } from "./safety-charts.js";
import { StatisticTable } from "./statistic-table.js";
import type { SafetyStats } from "../types/safety.types.js";

const TREND_TITLE: Record<SafetyTrendPeriod, string> = {
  daily: "แนวโน้มความปลอดภัย (14 วันล่าสุด)",
  weekly: "แนวโน้มความปลอดภัย (8 สัปดาห์ล่าสุด)",
  monthly: "แนวโน้มความปลอดภัย (รายเดือน)",
};

export function OverviewTab({ s, projectId }: { s: SafetyStats; projectId: string | null }) {
  const [period, setPeriod] = useState<SafetyTrendPeriod>("monthly");
  const [statOpen, setStatOpen] = useState(false);
  const trendTitle = period === "monthly" ? `แนวโน้มความปลอดภัย (รายเดือน ${s.to.slice(0, 4)})` : TREND_TITLE[period];
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
              <Panel
                fill
                title="STATISTIC"
                subtitle="จากรายงาน และข้อมูลจาก EPS"
                actions={
                  <Button size="small" variant="outlined" onClick={() => setStatOpen(true)}>
                    เพิ่ม / แก้ไขสถิติ
                  </Button>
                }
              >
                <StatisticTable stats={s} compact />
              </Panel>
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Panel
                fill
                title={trendTitle}
                subtitle="Near miss + Safety inspection · เลือกดูรายวัน / รายสัปดาห์ / รายเดือน"
                actions={
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={period}
                    onChange={(_, v: SafetyTrendPeriod | null) => v && setPeriod(v)}
                    aria-label="Safety trend period"
                  >
                    <ToggleButton value="daily" sx={{ px: 1.25, py: 0.5 }}>Daily</ToggleButton>
                    <ToggleButton value="weekly" sx={{ px: 1.25, py: 0.5 }}>Weekly</ToggleButton>
                    <ToggleButton value="monthly" sx={{ px: 1.25, py: 0.5 }}>Monthly</ToggleButton>
                  </ToggleButtonGroup>
                }
              >
                <SafetyTrendChart stats={s} period={period} height={300} />
              </Panel>
            </Grid>
          </Grid>
          <SafetyStatDialog projectId={projectId} stats={s} open={statOpen} onClose={() => setStatOpen(false)} />
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

