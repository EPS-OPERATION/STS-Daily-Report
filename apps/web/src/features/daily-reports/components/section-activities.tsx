import type { CoordinationMap, CoordinationSection, CoordinationSectionCatalog, Discipline } from "@sts/shared";
import AddIcon from "@mui/icons-material/AddOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { Controller, useWatch, type UseFieldArrayReturn, type UseFormReturn } from "react-hook-form";
import { useRouteSections } from "../hooks/use-daily-report-queries.js";
import type { MorningFormValues } from "../schemas/daily-report.schema.js";
import { isPendingSection, pendingSectionValue, sectionRowMap } from "../utils/location.js";
import { YesNoGate } from "./form-aids.js";
import { SectionRowCard } from "./section-row-card.js";
import { newActivity } from "./morning-helpers.js";

type Activities = UseFieldArrayReturn<MorningFormValues, `crews.${Discipline}.allocations`>;
const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

// Linear work with no building (the 33 kV line A-B … G-H): asked as its own question under Today Activity, one
// block per Map area that has route sections. «มี» opens rows where the section is tapped on a small map (or picked
// from the chips), then work · people · plan %. The rows are ordinary Today Activity rows (where = "s:<section>"),
// so the crew checks, evening progress, PDF and the Map card all treat them like any other activity.
export function SectionActivities({ discipline, form, activities, projectId }: {
  discipline: Discipline;
  form: UseFormReturn<MorningFormValues>;
  activities: Activities;
  projectId: string;
}) {
  const catalog = useRouteSections(projectId);
  if (!catalog.maps.length) return null;
  return <>{catalog.maps.map((map) => <AreaBlock key={map.id} map={map} catalog={catalog} discipline={discipline} form={form} activities={activities} />)}</>;
}

function AreaBlock({ map, catalog, discipline, form, activities }: {
  map: CoordinationMap; catalog: CoordinationSectionCatalog; discipline: Discipline; form: UseFormReturn<MorningFormValues>; activities: Activities;
}) {
  const rows = useWatch({ control: form.control, name: `crews.${discipline}.allocations` }) ?? [];
  const mine = rows.flatMap((r, i) => (sectionRowMap(r.buildingId, catalog) === map.id ? [i] : []));
  const [asked, setAsked] = useState(false);
  const open = asked || mine.length > 0;
  const sections = catalog.sections.filter((s) => s.mapId === map.id);
  const add = () => activities.append({ ...newActivity(0), buildingId: pendingSectionValue(map.id) }, { shouldFocus: false });

  return (
    <Box sx={{ mt: 2.5, p: 1.5, border: 1, borderColor: "divider", borderRadius: 1.5, bgcolor: "background.default" }}>
      <YesNoGate
        question={`วันนี้มีงาน ${map.name} หรือไม่?`}
        icon={<RouteOutlined fontSize="small" color="primary" />}
        open={open}
        filled={mine.length}
        onYes={() => { setAsked(true); if (!mine.length) add(); }}
        onNo={() => { setAsked(false); activities.remove(mine); }}
      >
        <Stack spacing={1.5}>
          {mine.map((i, n) => (
            <SectionRow key={activities.fields[i]?.id ?? i} index={i} number={n + 1} map={map} sections={sections} discipline={discipline} form={form}
              onRemove={() => { if (mine.length === 1) setAsked(false); activities.remove(i); }} />
          ))}
          <Button variant="text" startIcon={<AddIcon />} onClick={add} disabled={rows.length >= 32}
            sx={{ justifyContent: "flex-start", border: 1, borderStyle: "dashed", borderColor: "divider", minHeight: 44 }}>
            เพิ่มงานอีกช่วง
          </Button>
        </Stack>
      </YesNoGate>
    </Box>
  );
}

function SectionRow({ index, number, map, sections, discipline, form, onRemove }: {
  index: number; number: number; map: CoordinationMap; sections: CoordinationSection[]; discipline: Discipline;
  form: UseFormReturn<MorningFormValues>; onRemove: () => void;
}) {
  const { control, setValue, formState } = form;
  const path = `crews.${discipline}.allocations.${index}` as const;
  const [where, hasPlan] = useWatch({ control, name: [`${path}.buildingId`, `${path}.hasPlan`] });
  const pickedId = where && !isPendingSection(where) ? where.slice(2) : null;
  const errors = formState.errors.crews?.[discipline]?.allocations?.[index];
  const pick = (id: string) => setValue(`${path}.buildingId`, `s:${id}`, { shouldDirty: true, shouldValidate: true });

  return (
    <SectionRowCard title={`งานที่ ${number}`} map={map} sections={sections} pickedId={pickedId} onPick={pick} error={errors?.buildingId?.message} onRemove={onRemove}>
          <Controller
            name={`${path}.workDescription`}
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <TextField {...field} inputRef={ref} label="งานที่ทำวันนี้" placeholder="เช่น ติดตั้งรางสายไฟบนโครงพัก" size="small" fullWidth
                error={Boolean(fieldState.error)} helperText={fieldState.error?.message} slotProps={{ htmlInput: { maxLength: 500 } }} />
            )}
          />
          <Stack direction="row" spacing={1.25}>
            <Controller
              name={`${path}.headcount`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField label="คน" value={field.value ? String(field.value) : ""} onChange={(e) => field.onChange(Number(digits(e.target.value)) || 0)}
                  onBlur={field.onBlur} inputRef={field.ref} size="small" error={Boolean(fieldState.error)} helperText={fieldState.error?.message}
                  sx={{ flex: 1 }} slotProps={{ htmlInput: { inputMode: "numeric" } }} />
              )}
            />
            <Controller
              name={`${path}.planPercent`}
              control={control}
              render={({ field }) => (
                <TextField label="แผน % (ถ้ามี)" value={hasPlan ? String(field.value) : ""} size="small" sx={{ flex: 1 }}
                  onChange={(e) => {
                    const v = digits(e.target.value);
                    setValue(`${path}.hasPlan`, v !== "", { shouldDirty: true });
                    field.onChange(Math.min(100, Number(v) || 0));
                  }}
                  slotProps={{ htmlInput: { inputMode: "numeric" } }} />
              )}
            />
          </Stack>
    </SectionRowCard>
  );
}
