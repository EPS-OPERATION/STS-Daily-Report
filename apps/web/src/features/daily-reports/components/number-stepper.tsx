import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

interface NumberStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
  disabled?: boolean;
  unit?: string;
}

// Touch-friendly integer input: big +/- targets, still typeable. Always emits a number (empty → min).
export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 5000,
  step = 1,
  error,
  disabled,
  unit,
}: NumberStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <IconButton
          aria-label={`ลด ${label}`}
          size="small"
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - step))}
          sx={{ border: 1, borderColor: "divider", width: 36, height: 36 }}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
        <TextField
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.]/g, "");
            const n = step % 1 === 0 ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
            onChange(Number.isNaN(n) ? min : clamp(n));
          }}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          error={Boolean(error)}
          size="small"
          slotProps={{
            htmlInput: {
              inputMode: step % 1 === 0 ? "numeric" : "decimal",
              "aria-label": label,
              style: { textAlign: "center", fontWeight: 700 },
            },
          }}
          sx={{ width: 72 }}
        />
        <IconButton
          aria-label={`เพิ่ม ${label}`}
          size="small"
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + step))}
          sx={{ border: 1, borderColor: "divider", width: 36, height: 36 }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
        {unit ? (
          <Typography variant="caption" color="text.secondary">
            {unit}
          </Typography>
        ) : null}
      </Stack>
      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}
