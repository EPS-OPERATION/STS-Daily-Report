import { ContractorBadge } from "@/features/contractors/index.js";
import { timeWindowLabel } from "@/lib/dates.js";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import { Section } from "../components/today-requests-parts.js";
import { SimpleTable } from "../components/today-requests-parts.js";
import type { UseTodayRequestsState } from "../hooks/use-today-requests.js";

export function MachineSection({ ed }: { ed: UseTodayRequestsState }) {
  const { dayCol, dayHead, dayMachines } = ed;
  return (
    <Section title="Machine request">
      <SimpleTable
        empty="ไม่มีการจองเครื่องจักร"
        emptyIcon={<PrecisionManufacturingOutlinedIcon />}
        head={[...dayHead, "Machine", "Building", "Contractor", "Time", "วัตถุประสงค์"]}
        rows={dayMachines.map((m) => ({
          key: m.id,
          cells: [
            ...dayCol(m.targetDate),
            <b key="m">{m.machineType}</b>,
            m.buildingName,
            <ContractorBadge key="c" code={m.contractorCode} />,
            timeWindowLabel(m.startTime, m.endTime),
            m.purpose ?? "—",
          ],
        }))}
      />
    </Section>
  );
}
