import {
  Box,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedOutlinedIcon from "@mui/icons-material/RadioButtonUncheckedOutlined";
import type { ActiveFilter, Facility } from "@/types/site-operations.types.js";

export function FacilityPlacementPanel({
  facilities,
  selectedId,
  points,
  search,
  onSearch,
  onSelect,
  onCreate,
  loading,
  failed = false,
  disabled,
  status,
  onStatus,
}: {
  facilities: Facility[];
  selectedId: string | null;
  points?: Map<string, { x: number; y: number }>;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  loading: boolean;
  failed?: boolean;
  disabled: boolean;
  status?: ActiveFilter;
  onStatus?: (value: ActiveFilter) => void;
}) {
  const visible = facilities.filter(
    (row) =>
      `${row.name} ${row.code ?? ""}`.toLowerCase().includes(search.toLowerCase()) &&
      (!status || status === "all" || row.isActive === (status === "active")),
  );
  return (
    <Stack spacing={1.5} sx={{ height: "100%", minHeight: 0 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1">Facilities</Typography>
        {points && !loading && !failed ? (
          <Typography variant="caption" color="text.secondary">
            {facilities.filter((row) => points.has(row.id)).length} / {facilities.length} placed
          </Typography>
        ) : null}
      </Stack>
      <TextField label="Search Facilities" value={search} onChange={(event) => onSearch(event.target.value)} />
      {onStatus ? (
        <TextField
          select
          label="Show"
          value={status}
          onChange={(event) => onStatus(event.target.value as ActiveFilter)}
        >
          <MenuItem value="all">All Facilities</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Archived</MenuItem>
        </TextField>
      ) : null}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {failed ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
            Facilities are unavailable. Use Retry to load them.
          </Typography>
        ) : loading ? (
          Array.from({ length: 5 }, (_, index) => <Skeleton key={index} height={52} />)
        ) : (
          <List disablePadding aria-label={points ? "Facility placements" : "Project Facilities"}>
            {visible.map((row) => {
              const placed = points?.has(row.id);
              return (
                <ListItemButton
                  component="button"
                  key={row.id}
                  selected={row.id === selectedId}
                  aria-pressed={row.id === selectedId}
                  disabled={disabled}
                  aria-label={points ? `${placed ? "Select" : "Place"} ${row.name}` : `Select ${row.name}`}
                  onClick={() => onSelect(row.id)}
                  sx={{ width: "100%", textAlign: "left", borderRadius: 1, mb: 0.5, py: 0.75, px: 1 }}
                >
                  {points ? (
                    <ListItemIcon sx={{ minWidth: 30, color: placed ? "primary.main" : "text.disabled" }}>
                      {placed ? (
                        <CheckCircleOutlineIcon fontSize="small" />
                      ) : (
                        <RadioButtonUncheckedOutlinedIcon fontSize="small" />
                      )}
                    </ListItemIcon>
                  ) : null}
                  <ListItemText
                    primary={row.name}
                    secondary={points ? (placed ? "Placed" : "Not placed") : row.code}
                    slotProps={{ primary: { variant: "body2" }, secondary: { variant: "caption" } }}
                  />
                  {!row.isActive ? <Chip size="small" label="Archived" variant="outlined" /> : null}
                </ListItemButton>
              );
            })}
            {!visible.length ? (
              <Typography color="text.secondary" variant="body2" sx={{ p: 1 }}>
                No Facilities found.
              </Typography>
            ) : null}
          </List>
        )}
      </Box>
      <Button startIcon={<AddOutlinedIcon />} variant="outlined" onClick={onCreate} disabled={disabled || failed}>
        New Facility
      </Button>
    </Stack>
  );
}
