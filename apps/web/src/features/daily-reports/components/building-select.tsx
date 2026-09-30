import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { Building } from "../types/daily-report.types.js";

// Building dropdown with the Thai name as a caption (allocation + request rows).
export function BuildingSelect({
  label,
  buildings,
  value,
  onChange,
  disabledIds = [],
  error,
}: {
  label: string;
  buildings: Building[];
  value: string;
  onChange: (id: string) => void;
  disabledIds?: string[];
  error?: string;
}) {
  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      fullWidth
      error={Boolean(error)}
      helperText={error ?? (buildings.length === 0 ? "ยังไม่มีอาคารให้เลือก" : undefined)}
    >
      {buildings.map((b) => (
        <MenuItem key={b.id} value={b.id} disabled={disabledIds.includes(b.id)}>
          <Stack>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {b.name}
            </Typography>
            {b.nameTh ? (
              <Typography variant="caption" color="text.secondary">
                {b.nameTh}
              </Typography>
            ) : null}
          </Stack>
        </MenuItem>
      ))}
    </TextField>
  );
}
