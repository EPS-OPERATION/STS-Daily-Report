import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { PermitType } from "@sts/shared";
import dayjs from "dayjs";
import { useMemo } from "react";
import { ContractorBadge, PERMIT_ICONS, permitLabel, useDailyRequests } from "@/features/daily-reports/index.js";

export interface HighRiskTask {
  key: string;
  date: string;
  contractorCode: string;
  contractorName: string;
  taskName: string;
  supervisors: string[];
  permitTypes: PermitType[];
  buildings: string[];
  workers: number;
  isSample?: boolean;
}

export const SAMPLE_HIGH_RISK_TASKS: HighRiskTask[] = [
  {
    key: "sample-1",
    date: dayjs().format("YYYY-MM-DD"),
    contractorCode: "LS",
    contractorName: "LTab Site",
    taskName: "งานยกติดตั้งโครงสร้างเหล็ก Main Boiler Unit 1",
    supervisors: ["คุณสมชาย (EPS QA/QC)"],
    permitTypes: ["lifting", "height", "hot_work"],
    buildings: ["Boiler Building (A01)"],
    workers: 12,
    isSample: true,
  },
  {
    key: "sample-2",
    date: dayjs().format("YYYY-MM-DD"),
    contractorCode: "FS",
    contractorName: "Fast Steel",
    taskName: "งานเชื่อมต่อท่อส่งไอน้ำแรงดันสูง High-Pressure Steam Piping",
    supervisors: ["คุณวิชัย (EPS Safety)"],
    permitTypes: ["hot_work", "confined_space"],
    buildings: ["Turbine Hall (B02)"],
    workers: 8,
    isSample: true,
  },
  {
    key: "sample-3",
    date: dayjs().format("YYYY-MM-DD"),
    contractorCode: "SZ",
    contractorName: "Szone",
    taskName: "งานขุดลึกวางแนวท่อระบายความร้อน Cooling Water Discharge Line",
    supervisors: ["คุณอนุสรณ์ (EPS Civil)"],
    permitTypes: ["other"],
    buildings: ["Cooling Tower (C03)"],
    workers: 6,
    isSample: true,
  },
  {
    key: "sample-4",
    date: dayjs().format("YYYY-MM-DD"),
    contractorCode: "ZE",
    contractorName: "Zhongtian",
    taskName: "งานติดตั้งหม้อแปลงไฟฟ้าแรงสูง Substation 22kV",
    supervisors: ["คุณธวัชชัย (EPS Electrical)"],
    permitTypes: ["live_electrical", "height"],
    buildings: ["Switchyard & Substation (E05)"],
    workers: 5,
    isSample: true,
  },
];

// "งานที่มีความเสี่ยงสูงและการควบคุม": permits the contractor marked high-risk in the afternoon
// report (for the next working day), one card per contractor × day × task name — several permits
// with the same task name (e.g. Lifting + Work at Height) are one job.
export function HighRiskTasks({
  projectId,
  from,
  to,
  selectedContractorCodes,
  showSampleWhenEmpty = true,
}: {
  projectId: string | null;
  from: string;
  to: string;
  selectedContractorCodes?: Set<string>;
  showSampleWhenEmpty?: boolean;
}) {
  const query = useDailyRequests(projectId, from, to);

  const realTasksByDate = useMemo(() => {
    const tasks = new Map<string, HighRiskTask>();
    for (const p of query.data?.data.permits ?? []) {
      if (!p.highRisk || !p.taskName) continue;
      if (selectedContractorCodes && !selectedContractorCodes.has(p.contractorCode)) continue;
      const key = `${p.targetDate}|${p.contractorCode}|${p.taskName.trim().toLowerCase()}`;
      const t =
        tasks.get(key) ??
        tasks
          .set(key, {
            key,
            date: p.targetDate,
            contractorCode: p.contractorCode,
            contractorName: p.contractorName,
            taskName: p.taskName.trim(),
            supervisors: [],
            permitTypes: [],
            buildings: [],
            workers: 0,
          })
          .get(key)!;
      if (p.supervisorName && !t.supervisors.includes(p.supervisorName)) t.supervisors.push(p.supervisorName);
      if (!t.permitTypes.includes(p.permitType)) t.permitTypes.push(p.permitType);
      if (!t.buildings.includes(p.buildingName)) t.buildings.push(p.buildingName);
      // The same crew usually holds every permit of the job — show the largest, not the sum.
      t.workers = Math.max(t.workers, p.workers);
    }
    const days = new Map<string, HighRiskTask[]>();
    for (const t of [...tasks.values()].sort((a, b) => a.date.localeCompare(b.date) || a.contractorCode.localeCompare(b.contractorCode))) {
      days.set(t.date, [...(days.get(t.date) ?? []), t]);
    }
    return [...days];
  }, [query.data, selectedContractorCodes]);

  const hasRealTasks = realTasksByDate.length > 0;

  const sampleTasksByDate = useMemo(() => {
    if (hasRealTasks || !showSampleWhenEmpty) return [];
    const filtered = SAMPLE_HIGH_RISK_TASKS.filter(
      (t) => !selectedContractorCodes || selectedContractorCodes.has(t.contractorCode),
    );
    if (filtered.length === 0) return [];
    return [[from, filtered]] as [string, HighRiskTask[]][];
  }, [hasRealTasks, showSampleWhenEmpty, selectedContractorCodes, from]);

  const byDate = hasRealTasks ? realTasksByDate : sampleTasksByDate;
  const isShowingSample = !hasRealTasks && sampleTasksByDate.length > 0;

  if (query.isError) return <Alert severity="error">โหลดงานความเสี่ยงสูงไม่สำเร็จ</Alert>;
  if (!query.data && !isShowingSample) return <Skeleton variant="rounded" height={120} />;
  if (byDate.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        ไม่มีงานที่ผู้รับเหมาแจ้งว่าเป็นงานความเสี่ยงสูงในช่วงนี้
      </Typography>
    );
  }

  const multiDay = byDate.length > 1 || from !== to;
  return (
    <Stack spacing={2}>
      {isShowingSample && (
        <Alert severity="info" sx={{ py: 0.5, px: 2, borderRadius: 2, fontSize: 13 }}>
          <b>ตัวอย่างงานความเสี่ยงสูง (Sample Demonstration)</b>: ยังไม่มีรายงานงานความเสี่ยงสูงจากหน้างานจริงในช่วงนี้ — ระบบแสดงตัวอย่างบัตรควบคุมงานความเสี่ยงสูงและผู้ควบคุมงานฝ่าย EPS เพื่อเป็นแนวทาง
        </Alert>
      )}
      {byDate.map(([date, tasks]) => (
        <Box key={date}>
          {multiDay && !isShowingSample ? (
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              {dayjs(date).format("ddd D MMM YYYY")} · {tasks.length} งาน
            </Typography>
          ) : null}
          <Grid container spacing={1.5}>
            {tasks.map((t) => (
              <Grid key={t.key} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <TaskCard task={t} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Stack>
  );
}

function TaskCard({ task }: { task: HighRiskTask }) {
  return (
    <Box
      sx={{
        height: "100%",
        p: 1.5,
        borderRadius: 2,
        bgcolor: "#FFF8EC",
        border: "1px solid",
        borderColor: "#F2D4A6",
        boxShadow: "0 1px 3px rgba(120, 72, 0, 0.12)",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {/* header: sample badge + warning icons per permit type */}
      <Stack direction="row" spacing={0.75} alignItems="center" justifyContent={task.isSample ? "space-between" : "center"}>
        {task.isSample ? (
          <Chip size="small" label="ตัวอย่าง (Sample)" color="warning" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
        ) : null}
        <Stack direction="row" spacing={0.75} justifyContent="center">
          {task.permitTypes.map((p) => {
            const Icon = PERMIT_ICONS[p];
            return (
              <Tooltip key={p} title={permitLabel(p)}>
                <Box sx={{ position: "relative", display: "inline-flex", color: "#C2410C" }}>
                  <WarningAmberRoundedIcon sx={{ fontSize: 30 }} />
                  <Icon sx={{ position: "absolute", right: -6, bottom: -2, fontSize: 15, bgcolor: "#FFF8EC", borderRadius: "50%", color: "#7C2D12" }} />
                </Box>
              </Tooltip>
            );
          })}
        </Stack>
      </Stack>
      <Typography sx={{ fontWeight: 800, fontSize: 17, textAlign: "center", lineHeight: 1.3 }}>{task.taskName}</Typography>
      <Box sx={{ alignSelf: "center", px: 1.25, py: 0.4, borderRadius: 1, bgcolor: "#F3E3C8", textAlign: "center" }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          ผู้ควบคุม (EPS) : {task.supervisors.join(", ") || "—"}
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="center">
        {task.permitTypes.map((p) => (
          <Chip key={p} size="small" label={permitLabel(p)} variant="outlined" sx={{ height: 22, fontSize: 11, borderColor: "#E7B67A", bgcolor: "#fff" }} />
        ))}
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: "auto" }}>
        <ContractorBadge code={task.contractorCode} />
        <Typography variant="caption" color="text.secondary" noWrap>
          {task.buildings.join(", ")} · {task.workers} คน
        </Typography>
      </Stack>
    </Box>
  );
}
