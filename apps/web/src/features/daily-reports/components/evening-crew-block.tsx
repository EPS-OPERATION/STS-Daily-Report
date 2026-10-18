import { type Discipline } from "@sts/shared";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { type EveningFormValues } from "../schemas/daily-report.schema.js";
import { CrewManpower } from "./crew-manpower.js";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { disciplineLabel } from "./evening-helpers.js";

export function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
      {children}
    </Typography>
  );
}

// One discipline's afternoon crew: people by position + nationality/sex split.
export function EveningCrewBlock({
  discipline,
  form,
  showTitle,
}: {
  discipline: Discipline;
  form: UseFormReturn<EveningFormValues>;
  showTitle: boolean;
}) {
  const { control, setValue, formState } = form;
  const crew = useWatch({ control, name: `crews.${discipline}` });
  const errors = formState.errors.crews?.[discipline];
  return (
    <Box>
      {showTitle ? (
        <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
          {disciplineLabel(discipline)}
        </Typography>
      ) : null}
      <CrewManpower
        value={crew}
        totalLabel={`${discipline} afternoon`}
        error={errors?.positions?.message ?? errors?.thaiMale?.message}
        onPositions={(next) => setValue(`crews.${discipline}.positions`, next, { shouldDirty: true, shouldValidate: formState.isSubmitted })}
        onSplit={(key, n) => setValue(`crews.${discipline}.${key}`, n, { shouldDirty: true, shouldValidate: formState.isSubmitted })}
      />
    </Box>
  );
}
