import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export interface NumberStepperProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
  disabled?: boolean;
  unit?: string;
}

// Touch-friendly integer/decimal input for field & mobile: comfortable +/- targets,
// explicit 16px font to prevent mobile iOS zoom-in, resilient to small screen widths.
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
      {label ? (
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      ) : null}
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <IconButton
          aria-label={label ? `ลด ${label}` : "ลด"}
          size="small"
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - step))}
          sx={{
            border: 1,
            borderColor: "divider",
            width: { xs: 36, sm: 38 },
            height: { xs: 36, sm: 38 },
            minWidth: { xs: 36, sm: 38 },
            flexShrink: 0,
            bgcolor: "background.paper",
            borderRadius: 1.5,
            touchAction: "manipulation",
            "&:active": { transform: "scale(0.95)" },
          }}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
        <InputBase
          value={Number.isFinite(value) ? value : ""}
          placeholder={String(min)}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.]/g, "");
            const n = step % 1 === 0 ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
            onChange(Number.isNaN(n) ? min : clamp(n));
          }}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputProps={{
            inputMode: step % 1 === 0 ? "numeric" : "decimal",
            "aria-label": label ?? "number input",
            style: {
              textAlign: "center",
              fontWeight: 700,
              fontSize: "16px", // Prevents iOS Safari auto-zoom
              padding: "4px 0",
            },
          }}
          sx={{
            width: { xs: 48, sm: 54 },
            minWidth: 44,
            height: { xs: 36, sm: 38 },
            border: 1,
            borderColor: error ? "error.main" : "divider",
            borderRadius: 1.5,
            bgcolor: "background.paper",
            flexShrink: 0,
            transition: "border-color 0.15s, box-shadow 0.15s",
            "&:focus-within": {
              borderColor: "primary.main",
              boxShadow: "0 0 0 2px rgba(25, 118, 210, 0.15)",
            },
          }}
        />
        <IconButton
          aria-label={label ? `เพิ่ม ${label}` : "เพิ่ม"}
          size="small"
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + step))}
          sx={{
            border: 1,
            borderColor: "divider",
            width: { xs: 36, sm: 38 },
            height: { xs: 36, sm: 38 },
            minWidth: { xs: 36, sm: 38 },
            flexShrink: 0,
            bgcolor: "background.paper",
            borderRadius: 1.5,
            touchAction: "manipulation",
            "&:active": { transform: "scale(0.95)" },
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
        {unit ? (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.25, fontWeight: 500, flexShrink: 0 }}>
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
