import type { CoordinationMap, CoordinationSection, CoordinationSectionCatalog } from "@sts/shared";
import AddIcon from "@mui/icons-material/AddOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { Controller, useFormState, useWatch, type Control, type UseFieldArrayReturn } from "react-hook-form";
import { useRouteSections } from "../hooks/use-daily-report-queries.js";
import type { EveningFormValues } from "../schemas/daily-report.schema.js";
import { isPendingSection, pendingSectionValue, sectionRowMap } from "../utils/location.js";
import { YesNoGate } from "./form-aids.js";
import { SectionRowCard } from "./section-row-card.js";

type Forecasts = UseFieldArrayReturn<EveningFormValues, "forecasts">;

// Tomorrow Forecast on a route section (the 33 kV line A-B … G-H), asked like Today Activity: «พรุ่งนี้มีงาน … หรือไม่?»
// per Map area, then a row per stretch: tap it on the small map / chips and say what will be done. The rows are ordinary
// forecast rows (area = "s:<section>"), so EPS sees them on the Map card as tomorrow's plan for that stretch.
export function SectionForecasts({ control, rows, projectId }: { control: Control<EveningFormValues>; rows: Forecasts; projectId: string }) {
  const catalog = useRouteSections(projectId);
  if (!catalog.maps.length) return null;
  return <>{catalog.maps.map((map) => <AreaBlock key={map.id} map={map} catalog={catalog} control={control} rows={rows} />)}</>;
}

function AreaBlock({ map, catalog, control, rows }: { map: CoordinationMap; catalog: CoordinationSectionCatalog; control: Control<EveningFormValues>; rows: Forecasts }) {
  const values = useWatch({ control, name: "forecasts" }) ?? [];
  const mine = values.flatMap((r, i) => (sectionRowMap(r.buildingId, catalog) === map.id ? [i] : []));
  const [asked, setAsked] = useState(false);
  const open = asked || mine.length > 0;
  const sections = catalog.sections.filter((s) => s.mapId === map.id);
  const add = () => rows.append({ description: "", buildingId: pendingSectionValue(map.id) }, { shouldFocus: false });

  return (
    <Box sx={{ mt: 2, p: 1.5, border: 1, borderColor: "divider", borderRadius: 1.5, bgcolor: "background.default" }}>
      <YesNoGate
        question={`พรุ่งนี้มีงาน ${map.name} หรือไม่?`}
        icon={<RouteOutlined fontSize="small" color="primary" />}
        open={open}
        filled={mine.length}
        onYes={() => { setAsked(true); if (!mine.length) add(); }}
        onNo={() => { setAsked(false); rows.remove(mine); }}
      >
        <Stack spacing={1.5}>
          {mine.map((i, n) => (
            <ForecastRow key={rows.fields[i]?.id ?? i} index={i} number={n + 1} map={map} sections={sections} control={control} rows={rows}
              onRemove={() => { if (mine.length === 1) setAsked(false); rows.remove(i); }} />
          ))}
          <Button variant="text" startIcon={<AddIcon />} onClick={add} disabled={values.length >= 20}
            sx={{ justifyContent: "flex-start", border: 1, borderStyle: "dashed", borderColor: "divider", minHeight: 44 }}>
            เพิ่มแผนอีกช่วง
          </Button>
        </Stack>
      </YesNoGate>
    </Box>
  );
}

function ForecastRow({ index, number, map, sections, control, rows, onRemove }: {
  index: number; number: number; map: CoordinationMap; sections: CoordinationSection[]; control: Control<EveningFormValues>; rows: Forecasts; onRemove: () => void;
}) {
  const where = useWatch({ control, name: `forecasts.${index}.buildingId` });
  const { errors } = useFormState({ control, name: `forecasts.${index}` });
  const pickedId = where && !isPendingSection(where) ? where.slice(2) : null;
  const description = useWatch({ control, name: `forecasts.${index}.description` });
  // Field arrays update a row through update(); a re-render then shows the picked stretch.
  const pick = (id: string) => rows.update(index, { description: description ?? "", buildingId: `s:${id}` });
  return (
    <SectionRowCard title={`แผนที่ ${number}`} map={map} sections={sections} pickedId={pickedId} onPick={pick} error={errors.forecasts?.[index]?.buildingId?.message} onRemove={onRemove}>
      <Controller
        name={`forecasts.${index}.description`}
        control={control}
        render={({ field: { ref, ...field }, fieldState }) => (
          <TextField {...field} inputRef={ref} label="งานที่จะทำพรุ่งนี้" placeholder="เช่น ติดตั้งรางสายไฟในโดม" size="small" fullWidth
            error={Boolean(fieldState.error)} helperText={fieldState.error?.message} slotProps={{ htmlInput: { maxLength: 300 } }} />
        )}
      />
    </SectionRowCard>
  );
}
