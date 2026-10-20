import { Controller, useWatch, type Control } from "react-hook-form";
import { type EveningFormValues } from "../schemas/daily-report.schema.js";
import type { DailyReport } from "../types/daily-report.types.js";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

type Allocation = DailyReport["allocations"][number];

// The morning's activities as one table: type Actual % per row; a row below its plan needs a countermeasure.
// Desktop = table columns; phone = the work on one line, Actual % beside it, countermeasure underneath.
const GRID = {
  display: "grid",
  columnGap: 1,
  rowGap: 0.75,
  alignItems: "center",
  gridTemplateColumns: { xs: "minmax(0, 1fr) 92px", sm: "minmax(120px, 1fr) minmax(0, 1.6fr) 44px 52px 92px" },
  gridTemplateAreas: {
    xs: `"work actual" "cm cm"`,
    sm: `"bld work ppl plan actual" "cm cm cm cm cm"`,
  },
} as const;

export function ProgressTable({ control, allocations }: { control: Control<EveningFormValues>; allocations: Allocation[] }) {
  return (
    <Box>
      <Box
        sx={{
          ...GRID,
          display: { xs: "none", sm: "grid" },
          px: 1,
          pb: 0.75,
          borderBottom: 1,
          borderColor: "divider",
          "& > *": { typography: "caption", fontWeight: 700, color: "text.secondary" },
        }}
      >
        <Box sx={{ gridArea: "bld" }}>อาคาร</Box>
        <Box sx={{ gridArea: "work" }}>งาน (จากรายงานเช้า)</Box>
        <Box sx={{ gridArea: "ppl", textAlign: "center" }}>คน</Box>
        <Box sx={{ gridArea: "plan", textAlign: "center" }}>แผน</Box>
        <Box sx={{ gridArea: "actual", textAlign: "center" }}>ทำจริง %</Box>
      </Box>
      <Stack divider={<Box sx={{ borderBottom: 1, borderColor: "divider" }} />}>
        {allocations.map((a, i) => (
          <ProgressLine key={a.id} index={i} control={control} allocation={a} />
        ))}
      </Stack>
    </Box>
  );
}

function ProgressLine({ index, control, allocation }: { index: number; control: Control<EveningFormValues>; allocation: Allocation }) {
  const actual = useWatch({ control, name: `progress.${index}.actualPercent` });
  const plan = allocation.planPercent;
  // Without a stated plan there is nothing to be behind — actual % only.
  const behind = plan !== null && actual < plan;
  const when = allocation.startTime && allocation.endTime ? `${allocation.startTime}–${allocation.endTime}` : null;

  return (
    <Box sx={{ py: 1, px: { sm: 1 }, bgcolor: behind ? "warning.light" : undefined, borderRadius: behind ? 1 : 0 }}>
      <Box sx={GRID}>
        {/* Building: its own column on desktop, part of the work cell on phone */}
        <Box sx={{ gridArea: "bld", display: { xs: "none", sm: "block" }, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={allocation.buildingName}>
            {allocation.buildingName}
          </Typography>
          <Chip size="small" label={allocation.discipline} sx={{ height: 18, fontSize: 11 }} />
        </Box>
        <Box sx={{ gridArea: "work", minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: { xs: 700, sm: 400 } }}>
            <Box component="span" sx={{ display: { sm: "none" } }}>
              {allocation.buildingName} ·{" "}
            </Box>
            {allocation.workDescription}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { sm: "none" } }}>
            {allocation.discipline} · {allocation.headcount} คน · {plan !== null ? `แผน ${plan}%` : "ไม่มีแผน"}
            {when ? ` · ${when}` : ""}
          </Typography>
          {when ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
              {when}
            </Typography>
          ) : null}
        </Box>
        <Typography variant="body2" sx={{ gridArea: "ppl", textAlign: "center", display: { xs: "none", sm: "block" } }}>
          {allocation.headcount}
        </Typography>
        <Typography variant="body2" sx={{ gridArea: "plan", textAlign: "center", display: { xs: "none", sm: "block" } }}>
          {plan !== null ? `${plan}%` : "—"}
        </Typography>
        <Box sx={{ gridArea: "actual" }}>
          <Controller
            name={`progress.${index}.actualPercent`}
            control={control}
            render={({ field }) => (
              <TextField
                value={String(field.value)}
                onChange={(e) => field.onChange(Math.min(100, Number(e.target.value.replace(/\D/g, "").slice(0, 3)) || 0))}
                onBlur={field.onBlur}
                inputRef={field.ref}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                size="small"
                color={behind ? "warning" : undefined}
                slotProps={{
                  htmlInput: { inputMode: "numeric", "aria-label": `ทำจริง % — ${allocation.buildingName} ${allocation.workDescription}`, style: { textAlign: "center", fontWeight: 700 } },
                  input: { endAdornment: <Typography variant="caption">%</Typography> },
                }}
              />
            )}
          />
        </Box>
        <Box sx={{ gridArea: "cm", minWidth: 0, display: behind ? "block" : "none" }}>
          {behind ? (
            <Controller
              name={`progress.${index}.countermeasure`}
              control={control}
              render={({ field: { ref, ...field }, fieldState }) => (
                <TextField
                  {...field}
                  value={field.value ?? ""}
                  inputRef={ref}
                  placeholder={`ต่ำกว่าแผน ${(plan ?? 0) - actual}% — สาเหตุ + มาตรการแก้ไข`}
                  size="small"
                  fullWidth
                  multiline
                  maxRows={4}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                  sx={{ bgcolor: "background.paper" }}
                  slotProps={{ htmlInput: { "aria-label": `Countermeasure — ${allocation.buildingName}` } }}
                />
              )}
            />
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
