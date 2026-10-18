import { Controller } from "react-hook-form";
import { SectionCard } from "./section-card.js";
import { DisciplineChips } from "./discipline-picker.js";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { EveningCrewBlock } from "./evening-crew-block.js";
import type { UseEveningFormState } from "../hooks/use-evening-form.js";

export function EveningCrewSection({ ed }: { ed: UseEveningFormState }) {
  const { form, control, formState, picked, report } = ed;
  return (
    <SectionCard
      id="sec-crew"
      index={3}
      tone="navy"
      title="ผู้ปฏิบัติงานช่วงบ่าย (ตามตำแหน่ง)"
      subtitle={
        report?.morningStatus === "submitted"
          ? `จำนวนคนทำงานช่วงบ่ายแยกตามประเภทงาน — เช้า ${report.totalHeadcount} คน (ปรับให้ตรงกับจริง)`
          : "จำนวนคนทำงานช่วงบ่ายแยกตามประเภทงาน — เช้าบ่ายอาจไม่เท่ากัน"
      }
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
        ประเภทงานช่วงบ่าย (เลือกได้หลายอย่าง)
      </Typography>
      <Controller
        name="disciplines"
        control={control}
        render={({ field }) => (
          <Box sx={{ mb: 1.5 }}>
            <DisciplineChips value={field.value} onChange={field.onChange} attention={picked.length === 0} />
          </Box>
        )}
      />
      {formState.errors.disciplines?.message ? (
        <Typography variant="caption" color="error" sx={{ display: "block", mb: 1 }}>
          {formState.errors.disciplines.message}
        </Typography>
      ) : null}
      <Stack spacing={2.5}>
        {picked.map((d) => (
          <EveningCrewBlock key={d} discipline={d} form={form} showTitle={picked.length > 1} />
        ))}
      </Stack>
    </SectionCard>
  );
}
