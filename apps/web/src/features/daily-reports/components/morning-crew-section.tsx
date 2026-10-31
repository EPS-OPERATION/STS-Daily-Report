import { SectionActivities } from "./section-activities.js";
import { type Discipline } from "@sts/shared";
import { useEffect } from "react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { StandardItemsPanel } from "@/features/report-standard-items/index.js";
import { isBlankActivity, placementStatus, type MorningFormValues } from "../schemas/daily-report.schema.js";
import type { Building } from "@/features/buildings/index.js";
import { CrewManpower, crewTotals } from "./crew-manpower.js";
import { SectionCard } from "./section-card.js";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { disciplineLabel } from "./morning-helpers.js";
import { newActivity } from "./morning-helpers.js";
import { activityFromStandard } from "./morning-helpers.js";
import { ActivityTable } from "./activity-table.js";

// One discipline's morning form: who works (by position + nationality/sex) and Today Activity —
// which building, what work, how many people, optionally when and with a plan %.
export function MorningCrewSection({
  index,
  discipline,
  form,
  buildings,
  dayStart,
  dayEnd,
  projectId,
  contractorId,
}: {
  index: number;
  discipline: Discipline;
  form: UseFormReturn<MorningFormValues>;
  buildings: Building[];
  dayStart: string;
  dayEnd: string;
  projectId: string;
  contractorId: string;
}) {
  const { control, setValue, getValues, formState } = form;
  const activities = useFieldArray({ control, name: `crews.${discipline}.allocations` });
  const crew = useWatch({ control, name: `crews.${discipline}` });
  const t = crewTotals(crew);
  const rows = crew.allocations ?? [];
  const placement = placementStatus(rows, dayStart, dayEnd, t.total);
  const problem = t.total > 0 ? placement.over : null;
  const errors = formState.errors.crews?.[discipline];
  const listError = errors?.allocations?.root?.message ?? errors?.allocations?.message;

  // A freshly opened discipline starts with one empty line; "เพิ่มแถว" (or Enter in the last row) adds more.
  useEffect(() => {
    if (getValues(`crews.${discipline}.allocations`).length === 0) activities.append(newActivity(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SectionCard
      id={`sec-crew-${discipline}`}
      index={index}
      title={`${disciplineLabel(discipline)} — ผู้ปฏิบัติงานและ Today Activity`}
      subtitle="จำนวนคนเข้างานวันนี้แยกตามตำแหน่ง แล้วลงรายละเอียดงานว่าทำที่ไหน กี่คน"
    >
      <CrewManpower
        value={crew}
        totalLabel={`${discipline} manpower`}
        error={errors?.positions?.message ?? errors?.thaiMale?.message}
        onPositions={(next) => setValue(`crews.${discipline}.positions`, next, { shouldDirty: true, shouldValidate: formState.isSubmitted })}
        onSplit={(key, n) => setValue(`crews.${discipline}.${key}`, n, { shouldDirty: true, shouldValidate: formState.isSubmitted })}
      />

      <Typography variant="h6" sx={{ mt: 3 }}>
        Today Activity
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        1 แถว = 1 งาน: อาคาร · งาน · จำนวนคน — แผน % และเวลา (ปุ่มนาฬิกา) ไม่บังคับ: ว่าง = ไม่มีแผน / ทั้งวัน
      </Typography>

      <ActivityTable discipline={discipline} form={form} buildings={buildings} activities={activities} />
      <SectionActivities discipline={discipline} form={form} activities={activities} projectId={projectId} />

      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
        <Typography
          variant="body2"
          role="status"
          aria-live="polite"
          sx={{
            fontWeight: 600,
            color: problem ? "error.main" : placement.placed === t.total && t.total > 0 ? "success.dark" : "text.secondary",
          }}
        >
          {t.total === 0
            ? "กรอกจำนวนคนด้านบนก่อน"
            : (problem ?? (placement.placed === t.total ? `ลงงานครบ ${t.total} คนแล้ว` : `ลงงาน ${placement.placed}/${t.total} คน`))}
        </Typography>
      </Stack>
      {listError && listError !== problem ? (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
          {listError}
        </Typography>
      ) : null}
      <StandardItemsPanel
        kind="activity"
        projectId={projectId}
        contractorId={contractorId}
        buildings={buildings}
        onApply={(items) => {
          const have = new Set(rows.map((r) => `${r.buildingId}|${r.workDescription.trim().toLowerCase()}`));
          const fresh = items.filter((i) => i.buildingId && !have.has(`${i.buildingId}|${i.label.trim().toLowerCase()}`));
          activities.replace([...rows.filter((r) => !isBlankActivity(r)), ...fresh.map(activityFromStandard)]);
        }}
        onSaveFromForm={() =>
          rows
            .filter((r) => r.buildingId && r.workDescription.trim())
            .map((r) => ({ kind: "activity" as const, label: r.workDescription.trim(), buildingId: r.buildingId, defaultCount: r.headcount }))
        }
      />
    </SectionCard>
  );
}
