import ArrowDropDownOutlinedIcon from "@mui/icons-material/ArrowDropDownOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState, type ReactNode } from "react";

// One multi-select dropdown for every toolbar filter (contractors, work types, …):
// same trigger, same popover width, same checklist rows and footer.
export interface FilterOption {
  value: string;
  label: string;
  /** Second line under the label (contractor name, hint, …). */
  sublabel?: string;
  /** Leading node: a colour dot or a glyph. */
  leading?: ReactNode;
  /** Right-aligned value (count, man-days, …). */
  count?: string;
  /** Render faded (e.g. an option with nothing on the map). */
  dim?: boolean;
}

export function FilterButton({
  icon,
  label,
  active,
  count,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  count?: number;
  onClick: (el: HTMLElement) => void;
}) {
  return (
    <Badge color="primary" badgeContent={count} invisible={!count} overlap="rectangular">
      <Button
        size="medium"
        variant="outlined"
        color={active ? "primary" : "inherit"}
        startIcon={icon}
        endIcon={<ArrowDropDownOutlinedIcon />}
        onClick={(e) => onClick(e.currentTarget)}
        sx={{
          whiteSpace: "nowrap",
          textTransform: "none",
          fontWeight: active ? 700 : 600,
          borderColor: active ? "primary.main" : "divider",
          bgcolor: (t) => (active ? "primary.light" : t.palette.background.paper),
          color: active ? "primary.main" : "text.primary",
          "&:hover": { borderColor: "primary.main" },
        }}
      >
        {label}
      </Button>
    </Badge>
  );
}

export function MultiSelectFilter({
  icon,
  buttonLabel,
  filteredCount,
  options,
  selected,
  onChange,
  searchable = false,
  searchPlaceholder,
  emptyText = "No options",
  clearLabel = "Clear",
  doneLabel = "Done",
  onlyLabel = "Only",
  align = "left",
  width = 300,
}: {
  icon: ReactNode;
  buttonLabel: string;
  /** Number of active filters — shows the badge and the accent trigger. */
  filteredCount?: number;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  clearLabel?: string;
  doneLabel?: string;
  /** Per-row shortcut: keep just this option and close (one tap to look at one thing). */
  onlyLabel?: string;
  align?: "left" | "right";
  width?: number;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState("");

  const allValues = useMemo(() => options.map((o) => o.value), [options]);
  const allSelected = allValues.length > 0 && selected.size === allValues.length;
  const isFiltered = selected.size > 0 && selected.size < allValues.length;

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q),
    );
  }, [options, search]);

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };
  const close = () => {
    setAnchor(null);
    setSearch("");
  };
  const only = (value: string) => {
    onChange(new Set([value]));
    close();
  };

  return (
    <>
      <FilterButton icon={icon} label={buttonLabel} active={Boolean(filteredCount && filteredCount > 0)} count={filteredCount} onClick={setAnchor} />
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: align }}
        transformOrigin={{ vertical: "top", horizontal: align }}
        slotProps={{ paper: { sx: { mt: 0.75, width, borderRadius: 2, border: 1, borderColor: "divider", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } } }}
      >
        {searchable ? (
          <Box sx={{ p: 1.5, pb: 1 }}>
            <TextField
              size="small"
              fullWidth
              autoFocus
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlinedIcon fontSize="small" color="action" /></InputAdornment> } }}
            />
          </Box>
        ) : null}

        {/* Master checkbox: select / clear all, with the running count. */}
        <Box sx={{ px: 1.5, py: 0.5, bgcolor: "action.hover" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={isFiltered}
                  onChange={() => onChange(allSelected ? new Set() : new Set(allValues))}
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Select all</Typography>}
              sx={{ mr: 0, userSelect: "none" }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {selected.size}/{allValues.length}
            </Typography>
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ maxHeight: 280, overflowY: "auto", p: 0.5 }}>
          {visible.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              {emptyText}
            </Typography>
          ) : (
            visible.map((o) => {
              const checked = selected.has(o.value);
              return (
                <Box
                  key={o.value}
                  onClick={() => toggle(o.value)}
                  className="fp-row"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    cursor: "pointer",
                    userSelect: "none",
                    opacity: o.dim ? 0.55 : 1,
                    "&:hover": { bgcolor: "action.hover" },
                    // Pointer devices swap the count for "Only" on hover; touch has no hover, so both stay visible.
                    "& .fp-only": { display: "none" },
                    "&:hover .fp-only": { display: "inline-flex" },
                    "&:hover .fp-count": { display: "none" },
                    "@media (hover: none)": { "& .fp-only": { display: "inline-flex" }, "&:hover .fp-count": { display: "inline" } },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                    <Checkbox size="small" checked={checked} tabIndex={-1} sx={{ p: 0.5 }} onClick={(e) => e.stopPropagation()} onChange={() => toggle(o.value)} />
                    {o.leading}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {o.label}
                      </Typography>
                      {o.sublabel ? (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", maxWidth: 160 }}>
                          {o.sublabel}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                    {o.count ? (
                      <Typography className="fp-count" variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                        {o.count}
                      </Typography>
                    ) : null}
                    {allValues.length > 1 && !(checked && selected.size === 1) ? (
                      <Button
                        className="fp-only"
                        size="small"
                        variant="outlined"
                        onClick={(e) => { e.stopPropagation(); only(o.value); }}
                        sx={{ minWidth: 0, px: 1, py: 0, fontSize: 12, lineHeight: 1.8 }}
                      >
                        {onlyLabel}
                      </Button>
                    ) : null}
                  </Stack>
                </Box>
              );
            })
          )}
        </Box>

        <Divider />

        <Box sx={{ px: 1, py: 0.75, bgcolor: "background.default", display: "flex", alignItems: "center" }}>
          <Button size="small" variant="text" color="inherit" disabled={selected.size === 0} onClick={() => onChange(new Set())}>
            {clearLabel}
          </Button>
          <Button size="small" variant="contained" onClick={close} sx={{ ml: "auto" }}>
            {doneLabel}
          </Button>
        </Box>
      </Popover>
    </>
  );
}
