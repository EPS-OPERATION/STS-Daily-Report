import { Controller } from "react-hook-form";
import { StandardItemsPanel } from "@/features/report-standard-items/index.js";
import { CountList } from "./count-list.js";
import { SectionCard } from "./section-card.js";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { EQUIPMENT_ITEMS } from "./morning-helpers.js";
import { CustomEquipmentList } from "./morning-equipment-list.js";
import type { UseMorningFormState } from "../hooks/use-morning-form.js";

export function MorningEquipmentSection({ ed }: { ed: UseMorningFormState }) {
  const { control, setValue, getValues, picked, projectId, contractor, buildings } = ed;
  return (
    <SectionCard id="sec-equipment" index={3 + picked.length} title="เครื่องจักร / เครื่องมือในไซต์" subtitle="จำนวนที่นำเข้าไซต์วันนี้ (ไม่ต้องจอง) — ไม่มีในรายการกดเพิ่มเองได้">
      <Controller
        name="equipment"
        control={control}
        render={({ field, fieldState }) => (
          <Stack spacing={1.5}>
            <CountList
              items={EQUIPMENT_ITEMS}
              values={field.value}
              onChange={(key, n) => field.onChange({ ...field.value, [key]: n })}
              unit="เครื่อง"
              max={500}
            />
            <CustomEquipmentList values={field.value} onChange={field.onChange} />
            <StandardItemsPanel
              kind="equipment"
              projectId={projectId}
              contractorId={contractor.id}
              buildings={buildings}
              onApply={(items) => {
                const next = { ...getValues("equipment") };
                for (const i of items) next[i.label] = Math.max(next[i.label] ?? 0, i.defaultCount);
                setValue("equipment", next, { shouldDirty: true });
              }}
              onSaveFromForm={() =>
                Object.entries(getValues("equipment"))
                  .filter(([, n]) => n > 0)
                  .map(([label, n]) => ({ kind: "equipment" as const, label, defaultCount: n }))
              }
            />
            {fieldState.error?.message ? (
              <Typography variant="caption" color="error">
                {fieldState.error.message}
              </Typography>
            ) : null}
          </Stack>
        )}
      />
    </SectionCard>
  );
}
