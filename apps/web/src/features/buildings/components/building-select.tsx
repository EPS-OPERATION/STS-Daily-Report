import Autocomplete from "@mui/material/Autocomplete";
import Popper, { type PopperProps } from "@mui/material/Popper";
import type { Ref } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { Building } from "../types/building.types.js";

// The list may be wider than its field (a narrow table cell on a phone): at least 300px, never wider than the screen.
function WidePopper(props: PopperProps) {
  return <Popper {...props} placement="bottom-start" style={{ ...props.style, width: "auto", minWidth: Math.max(300, Number(props.style?.width) || 0), maxWidth: "calc(100vw - 24px)" }} />;
}

// Building searchable autocomplete with typing suggestions (bilingual + code). Options with a `group` (route sections)
// come after the buildings under their own heading; they show the code chip and their work only.
export function BuildingSelect({
  label,
  buildings,
  value,
  onChange,
  disabledIds = [],
  error,
  placeholder = "พิมพ์รหัสหรือชื่ออาคาร...",
  dense = false,
  inputRef,
}: {
  label: string;
  buildings: Building[];
  value: string;
  onChange: (id: string) => void;
  disabledIds?: string[];
  error?: string;
  placeholder?: string;
  /** Table cell: no floating label or helper line (label becomes the aria-label; errors show as a red border). */
  dense?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const selectedBuilding = buildings.find((b) => b.id === value) ?? null;
  const grouped = buildings.some((b) => b.group);

  return (
    <Autocomplete
      options={buildings}
      value={selectedBuilding}
      groupBy={grouped ? (b) => b.group ?? "อาคาร" : undefined}
      slots={{ popper: WidePopper }}
      onChange={(_, item) => {
        onChange(item ? item.id : "");
      }}
      getOptionLabel={(b) => (!b ? "" : b.group ? `[${b.code}] ${b.nameTh ?? b.name}` : `${b.code ? `[${b.code}] ` : ""}${b.name}${b.nameTh ? ` (${b.nameTh})` : ""}`)}
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
          const matchGroup = b.group?.toLowerCase().includes(query);
          return Boolean(matchCode || matchName || matchNameTh || matchGroup);
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
                    fontSize: "0.8rem",
                    height: 22,
                    borderColor: "primary.main",
                    color: "primary.main",
                  }}
                />
              ) : null}
              {b.group ? (
                <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {b.nameTh ?? b.name}
                </Typography>
              ) : <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {b.name}
                </Typography>
                {b.nameTh ? (
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                    {b.nameTh}
                  </Typography>
                ) : null}
              </Box>}
            </Stack>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          label={dense ? undefined : label}
          placeholder={selectedBuilding ? undefined : dense ? "อาคาร" : placeholder}
          size="small"
          fullWidth
          error={Boolean(error)}
          title={dense ? error : undefined}
          helperText={dense ? undefined : (error ?? (buildings.length === 0 ? "ยังไม่มีอาคารให้เลือก" : undefined))}
          slotProps={{ htmlInput: { ...params.inputProps, "aria-label": label } }}
        />
      )}
    />
  );
}

