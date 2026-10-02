import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PERMIT_TYPES } from "@sts/shared";
import type { ReactNode } from "react";
import {
  ContractorBadge,
  RequestStatusChip,
  formatThaiDate,
  inspectionTypeLabel,
  timeWindowLabel,
} from "@/features/daily-reports/index.js";
import type { SiteDayBuilding } from "../types/site-map.types.js";

const permitLabel = (code: string) => PERMIT_TYPES.find((p) => p.code === code)?.label ?? code;

// One building on one day: people & work (morning allocation) and the requests
// made for that day (machine, equipment, road, PTW, QAQC).
export function BuildingDayPanel({
  building,
  from,
  to,
  onClose,
}: {
  building: SiteDayBuilding;
  from: string;
  to: string;
  onClose: () => void;
}) {
  // In a range each request line starts with its day (D/M).
  const day = (iso: string) => (from === to ? "" : `${Number(iso.slice(8))}/${Number(iso.slice(5, 7))} · `);
  const requests =
    building.machinery.length + building.equipment.length + building.roads.length + building.permits.length + building.inspections.length;
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: 2 }}>
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">{building.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {building.nameTh ? `${building.nameTh} · ` : ""}
            {from === to ? formatThaiDate(from) : `${formatThaiDate(from)} – ${formatThaiDate(to)}`}
          </Typography>
        </Box>
        <IconButton aria-label="ปิด" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack direction="row" spacing={3} sx={{ my: 1.5 }}>
        {from === to ? (
          <Figure value={building.headcount} label="คน" />
        ) : (
          <>
            <Figure value={building.headcount} label="คน-วัน" />
            <Figure value={building.avgDaily} label="คน/วัน (เฉลี่ย)" />
          </>
        )}
        <Figure value={building.contractors.length} label="ผู้รับเหมา" />
        <Figure value={requests} label="คำขอ" />
      </Stack>

      <Block title="กิจกรรม / กำลังคน">
        {building.activities.length === 0 ? (
          <Empty text="ไม่มีการจัดสรรคนลงอาคารนี้" />
        ) : (
          building.activities.map((a, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center">
              <ContractorBadge code={a.contractorCode} title={a.contractorName} />
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {a.workDescription}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                {from !== to ? `${Number(a.reportDate.slice(8))}/${Number(a.reportDate.slice(5, 7))} · ` : ""}
                {a.headcount} คน · แผน {a.planPercent}%{a.actualPercent !== null ? ` / จริง ${a.actualPercent}%` : ""}
              </Typography>
            </Stack>
          ))
        )}
      </Block>

      <Block title="Machine request">
        {building.machinery.length === 0 ? (
          <Empty text="—" />
        ) : (
          building.machinery.map((m) => (
            <Line key={m.id} code={m.contractorCode}>
              {day(m.targetDate)}
              {m.machineType}
              {m.unitTag ? ` (${m.unitTag})` : ""} · {timeWindowLabel(m.startTime, m.endTime)}
              {m.purpose ? ` · ${m.purpose}` : ""}
            </Line>
          ))
        )}
      </Block>

      <Block title="Equipment request">
        {building.equipment.length === 0 ? (
          <Empty text="—" />
        ) : (
          building.equipment.map((e) => (
            <Line key={e.id} code={e.contractorCode}>
              {day(e.targetDate)}
              {e.equipmentType} ×{e.qty}
              {e.purpose ? ` · ${e.purpose}` : ""}
            </Line>
          ))
        )}
      </Block>

      <Block title="Road usage">
        {building.roads.length === 0 ? (
          <Empty text="—" />
        ) : (
          building.roads.map((r) => (
            <Line key={r.id} code={r.contractorCode}>
              {day(r.targetDate)}
              {r.roadLocation} · {r.startTime}–{r.endTime} · {r.purpose}
            </Line>
          ))
        )}
      </Block>

      <Block title="Work permit (PTW)">
        {building.permits.length === 0 ? (
          <Empty text="—" />
        ) : (
          <Typography variant="body2">{building.permits.map((p) => `${permitLabel(p.permitType)} ${p.workers} คน`).join(" · ")}</Typography>
        )}
      </Block>

      <Block title="QAQC (RFI)" last>
        {building.inspections.length === 0 ? (
          <Empty text="—" />
        ) : (
          building.inspections.map((r) => (
            <Stack key={r.id} direction="row" spacing={1} alignItems="center">
              <ContractorBadge code={r.contractorCode} />
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {day(r.inspectionDate)}{r.inspectionTime} · {inspectionTypeLabel(r.inspectionType)} · {r.workItem}
              </Typography>
              <RequestStatusChip status={r.status} result={r.result} />
            </Stack>
          ))
        )}
      </Block>
    </Box>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="baseline">
      <Typography variant="h4" component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}

function Block({ title, last, children }: { title: string; last?: boolean; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
        {title}
      </Typography>
      <Stack spacing={0.75}>{children}</Stack>
      {last ? null : <Divider sx={{ my: 1.5 }} />}
    </Box>
  );
}

function Line({ code, alert, children }: { code: string; alert?: boolean; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <ContractorBadge code={code} />
      <Typography variant="body2" sx={{ color: alert ? "error.main" : "text.primary" }}>
        {children}
      </Typography>
    </Stack>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Typography variant="body2" color="text.secondary">
      {text}
    </Typography>
  );
}
