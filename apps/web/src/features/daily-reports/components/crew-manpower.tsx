import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { POSITIONS, type PositionCode } from "@sts/shared";
import { sumCounts } from "../schemas/daily-report.schema.js";
import { CountList } from "./count-list.js";
import { NumberStepper } from "./number-stepper.js";

export interface CrewManpowerValue {
  positions: Partial<Record<PositionCode, number>>;
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
}

export type SplitKey = "thaiMale" | "thaiFemale" | "foreignMale" | "foreignFemale";

const POSITION_ITEMS = POSITIONS.map((p) => ({ key: p.code, label: p.label, sub: p.labelTh, primary: p.common }));

const NATIONALITY_FIELDS: { name: SplitKey; label: string }[] = [
  { name: "thaiMale", label: "ไทย ชาย" },
  { name: "thaiFemale", label: "ไทย หญิง" },
  { name: "foreignMale", label: "ต่างชาติ ชาย" },
  { name: "foreignFemale", label: "ต่างชาติ หญิง" },
];

export const emptyPositions = () =>
  Object.fromEntries(POSITIONS.map((p) => [p.code, 0])) as Record<PositionCode, number>;

// Total by position (primary) vs the nationality/sex split — they must describe the same people.
export function crewTotals(v: CrewManpowerValue) {
  const total = sumCounts(v.positions);
  const byNationality = v.thaiMale + v.thaiFemale + v.foreignMale + v.foreignFemale;
  return { total, byNationality, ok: total > 0 && byNationality === total };
}

// Manpower of one discipline crew, used by both the morning and the evening form.
export function CrewManpower({
  value,
  onPositions,
  onSplit,
  totalLabel,
  error,
}: {
  value: CrewManpowerValue;
  onPositions: (next: Partial<Record<PositionCode, number>>) => void;
  onSplit: (key: SplitKey, n: number) => void;
  totalLabel: string;
  error?: string;
}) {
  const { total, byNationality, ok } = crewTotals(value);
  return (
    <>
      <CountList
        items={POSITION_ITEMS}
        values={Object.fromEntries(Object.entries(value.positions).map(([k, n]) => [k, n ?? 0]))}
        onChange={(key, n) => onPositions({ ...value.positions, [key]: n })}
        unit="คน"
        totalLabel={totalLabel}
      />
      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
      <Box
        sx={{
          mt: 2,
          p: 1.5,
          borderRadius: 2,
          border: 1.5,
          borderColor: ok ? "success.main" : "warning.main",
          bgcolor: ok ? "success.light" : "warning.light",
        }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
          {ok ? (
            <CheckCircleOutlineIcon sx={{ fontSize: 18, color: "success.dark" }} />
          ) : (
            <WarningAmberOutlinedIcon sx={{ fontSize: 18, color: "warning.dark" }} />
          )}
          <Typography variant="body2" sx={{ fontWeight: 700, color: ok ? "success.dark" : "warning.dark" }}>
            สัญชาติ / เพศ (บังคับกรอก) — {byNationality} / {total} คน
          </Typography>
        </Stack>
        <Grid container spacing={1.5}>
          {NATIONALITY_FIELDS.map((f) => (
            <Grid key={f.name} size={{ xs: 6, sm: 3 }}>
              <NumberStepper label={f.label} value={value[f.name]} onChange={(n) => onSplit(f.name, n)} />
            </Grid>
          ))}
        </Grid>
        {!ok && total > 0 ? (
          <Typography variant="caption" sx={{ display: "block", mt: 1, color: "warning.dark" }}>
            {byNationality < total
              ? `ยังขาดอีก ${total - byNationality} คน ให้ตรงกับจำนวนตามตำแหน่ง`
              : `เกิน ${byNationality - total} คน จากจำนวนตามตำแหน่ง`}
          </Typography>
        ) : null}
      </Box>
    </>
  );
}
