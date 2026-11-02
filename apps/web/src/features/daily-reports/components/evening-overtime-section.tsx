import { OvertimeRows } from "./overtime-rows.js";
import { YesNoGate } from "./form-aids.js";
import { SectionCard } from "./section-card.js";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import type { UseEveningFormState } from "../hooks/use-evening-form.js";

export function EveningOvertimeSection({ ed }: { ed: UseEveningFormState }) {
  const { allocations, control, setValue, formState, setOtAsked, overtimeRows, otOpen, buildings } = ed;
  return (
    <SectionCard id="sec-ot" index={2} tone="navy" title="ชั่วโมงทำงานล่วงเวลา (OT)" subtitle="แยกตามอาคาร/งาน — จำนวนคนที่ทำ OT × ชม. ใช้คำนวณ NMH">
      <YesNoGate
        icon={<ScheduleOutlinedIcon color="primary" fontSize="small" />}
        question="วันนี้มีคนทำ OT หรือไม่"
        open={otOpen}
        filled={overtimeRows.length}
        onYes={() => {
          setOtAsked(true);
          if (overtimeRows.length === 0) setValue("overtime", [{ buildingId: "", task: "", workers: 1, hours: 2 }], { shouldDirty: true });
        }}
        onNo={() => {
          setOtAsked(false);
          setValue("overtime", [], { shouldDirty: true, shouldValidate: formState.isSubmitted });
        }}
      >
        <OvertimeRows control={control} buildings={buildings} activities={allocations} />
      </YesNoGate>
    </SectionCard>
  );
}
