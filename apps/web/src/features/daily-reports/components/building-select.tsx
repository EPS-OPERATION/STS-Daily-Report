import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { Building } from "../types/daily-report.types.js";

// Building searchable autocomplete with typing suggestions (bilingual + code).
export function BuildingSelect({
  label,
  buildings,
  value,
  onChange,
  disabledIds = [],
  error,
  placeholder = "พิมพ์รหัสหรือชื่ออาคาร...",
}: {
  label: string;
  buildings: Building[];
  value: string;
  onChange: (id: string) => void;
  disabledIds?: string[];
  error?: string;
  placeholder?: string;
}) {
  const selectedBuilding = buildings.find((b) => b.id === value) ?? null;

  return (
    <Autocomplete
      options={buildings}
      value={selectedBuilding}
      onChange={(_, item) => {
        onChange(item ? item.id : "");
      }}
      getOptionLabel={(b) => (b ? `${b.code ? `[${b.code}] ` : ""}${b.name}${b.nameTh ? ` (${b.nameTh})` : ""}` : "")}
      getOptionDisabled={(b) => disabledIds.includes(b.id)}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      autoHighlight
      filterOptions={(options, state) => {
        const query = state.inputValue.trim().toLowerCase();
        if (!query) return options;
        return options.filter((b) => {
          const matchCode = b.code?.toLowerCase().includes(query);
          const matchName = b.name.toLowerCase().includes(query);
          const matchNameTh = b.nameTh?.toLowerCase().includes(query);
          return Boolean(matchCode || matchName || matchNameTh);
        });
      }}
      renderOption={(props, b) => {
        const { key, ...otherProps } = props;
        const isDisabled = disabledIds.includes(b.id);
        return (
          <Box
            component="li"
            key={key}
            {...otherProps}
            sx={{
              opacity: isDisabled ? 0.45 : 1,
              pointerEvents: isDisabled ? "none" : "auto",
              py: 0.75,
              px: 1.5,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
              {b.code ? (
                <Chip
                  label={b.code}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    height: 22,
                    borderColor: "primary.main",
                    color: "primary.main",
                  }}
                />
              ) : null}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {b.name}
                </Typography>
                {b.nameTh ? (
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                    {b.nameTh}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={selectedBuilding ? undefined : placeholder}
          size="small"
          fullWidth
          error={Boolean(error)}
          helperText={error ?? (buildings.length === 0 ? "ยังไม่มีอาคารให้เลือก" : undefined)}
        />
      )}
    />
  );
}

