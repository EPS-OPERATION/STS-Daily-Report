import { useMemo, useState, type MouseEvent } from "react";
import ArrowDropDownOutlinedIcon from "@mui/icons-material/ArrowDropDownOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
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

export interface ContractorFilterItem {
  code: string;
  name?: string;
  manDays?: number;
  /** Shown on the right instead of man-days (e.g. "12 รายการ"). */
  countLabel?: string;
  color: string;
}

interface ContractorFilterPopoverProps {
  items: ContractorFilterItem[];
  selectedCodes: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function ContractorFilterPopover({
  items,
  selectedCodes,
  onChange,
}: ContractorFilterPopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [search, setSearch] = useState("");

  const open = Boolean(anchorEl);
  const allCodes = useMemo(() => items.map((i) => i.code), [items]);
  const isFiltered = selectedCodes.size > 0 && selectedCodes.size < allCodes.length;
  const isAllSelected = selectedCodes.size === allCodes.length;
  const isNoneSelected = selectedCodes.size === 0;

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        (item.name && item.name.toLowerCase().includes(q)),
    );
  }, [items, search]);

  const handleOpen = (e: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleToggle = (code: string) => {
    const next = new Set(selectedCodes);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    onChange(next);
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      onChange(new Set());
    } else {
      onChange(new Set(allCodes));
    }
  };

  const handleSelectAll = () => {
    onChange(new Set(allCodes));
  };

  const handleClearAll = () => {
    onChange(new Set());
  };

  const buttonLabel = isAllSelected
    ? `ผู้รับเหมา: ทั้งหมด (${allCodes.length})`
    : isNoneSelected
      ? "ผู้รับเหมา: ไม่ได้เลือก"
      : `ผู้รับเหมา: ${selectedCodes.size}/${allCodes.length} เจ้า`;

  return (
    <>
      <Badge color="primary" variant="dot" invisible={!isFiltered}>
        <Button
          size="small"
          variant={isFiltered ? "contained" : "outlined"}
          color={isFiltered ? "primary" : "inherit"}
          onClick={handleOpen}
          startIcon={<FilterAltOutlinedIcon fontSize="small" />}
          endIcon={<ArrowDropDownOutlinedIcon />}
          sx={{
            minWidth: 150,
            textTransform: "none",
            borderColor: isFiltered ? undefined : "divider",
            bgcolor: isFiltered ? undefined : "background.paper",
            fontWeight: 600,
          }}
        >
          {buttonLabel}
        </Button>
      </Badge>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              width: 320,
              p: 0,
              borderRadius: 2,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              border: 1,
              borderColor: "divider",
            },
          },
        }}
      >
        {/* Header Search */}
        <Box sx={{ p: 1.5, pb: 1 }}>
          <TextField
            size="small"
            fullWidth
            autoFocus
            placeholder="ค้นหาผู้รับเหมา..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {/* Select All Row */}
        <Box sx={{ px: 1.5, py: 0.5, bgcolor: "action.hover" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={isAllSelected}
                  indeterminate={isFiltered}
                  onChange={handleToggleSelectAll}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  (เลือกทั้งหมด / Select All)
                </Typography>
              }
              sx={{ mr: 0, userSelect: "none" }}
            />
            <Typography variant="caption" color="text.secondary">
              {selectedCodes.size}/{allCodes.length}
            </Typography>
          </Stack>
        </Box>

        <Divider />

        {/* Scrollable Checklist */}
        <Box sx={{ maxHeight: 250, overflowY: "auto", p: 0.5 }}>
          {filteredItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              ไม่พบผู้รับเหมา
            </Typography>
          ) : (
            filteredItems.map((item) => {
              const checked = selectedCodes.has(item.code);
              return (
                <Box
                  key={item.code}
                  onClick={() => handleToggle(item.code)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    cursor: "pointer",
                    userSelect: "none",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                    <Checkbox
                      size="small"
                      checked={checked}
                      sx={{ p: 0.5 }}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleToggle(item.code)}
                    />
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: item.color,
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {item.code}
                      </Typography>
                      {item.name && item.name !== item.code && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ display: "block", maxWidth: 140 }}
                        >
                          {item.name}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  {item.manDays !== undefined && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                        ml: 1,
                      }}
                    >
                      {item.manDays.toLocaleString()} คน-วัน
                    </Typography>
                  )}
                  {item.manDays === undefined && item.countLabel ? (
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontVariantNumeric: "tabular-nums", flexShrink: 0, ml: 1 }}>
                      {item.countLabel}
                    </Typography>
                  ) : null}
                </Box>
              );
            })
          )}
        </Box>

        <Divider />

        {/* Footer Actions */}
        <Box sx={{ p: 1, bgcolor: "background.default" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={0.5}>
              <Button size="small" onClick={handleSelectAll} startIcon={<CheckOutlinedIcon sx={{ fontSize: 14 }} />}>
                ทั้งหมด
              </Button>
              <Button size="small" color="inherit" onClick={handleClearAll} startIcon={<ClearOutlinedIcon sx={{ fontSize: 14 }} />}>
                ล้าง
              </Button>
            </Stack>
            <Button size="small" variant="contained" onClick={handleClose}>
              ตกลง
            </Button>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
