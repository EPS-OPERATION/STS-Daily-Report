import { ContractorBadge } from "@/features/contractors/index.js";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import { Section } from "../components/today-requests-parts.js";
import { SimpleTable } from "../components/today-requests-parts.js";
import type { UseTodayRequestsState } from "../hooks/use-today-requests.js";

export function EquipmentSection({ ed }: { ed: UseTodayRequestsState }) {
  const { dayCol, dayHead, dayEquipment } = ed;
  return (
    <Section title="Equipment request">
      <SimpleTable
        empty="ไม่มีการขอเครื่องมือ/อุปกรณ์"
        emptyIcon={<HandymanOutlinedIcon />}
        head={[...dayHead, "Equipment", "Qty", "Building", "Contractor", "วัตถุประสงค์"]}
        rows={dayEquipment.map((e) => ({
          key: e.id,
          cells: [
            ...dayCol(e.targetDate),
            <b key="e">{e.equipmentType}</b>,
            e.qty,
            e.buildingName,
            <ContractorBadge key="c" code={e.contractorCode} />,
            e.purpose ?? "—",
          ],
        }))}
      />
    </Section>
  );
}
