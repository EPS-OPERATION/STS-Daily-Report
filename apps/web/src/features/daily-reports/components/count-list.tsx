import AddIcon from "@mui/icons-material/Add";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RemoveIcon from "@mui/icons-material/Remove";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";

export interface CountItem {
  key: string;
  label: string;
  sub?: string;
  /** Shown before "show more". */
  primary?: boolean;
}

// Compact "role / machine → count" table (mockup V18/V20 style). Rows with a
// value are highlighted; secondary rows fold away unless they already have a value.
export function CountList({
  items,
  values,
  onChange,
  unit,
  totalLabel,
  max = 5000,
}: {
  items: CountItem[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
  unit: string;
  totalLabel?: string;
  max?: number;
}) {
  const hiddenWithValue = items.some((i) => !i.primary && (values[i.key] ?? 0) > 0);
  const [expanded, setExpanded] = useState(hiddenWithValue);
  const showAll = expanded || hiddenWithValue;
  const visible = items.filter((i) => i.primary || showAll);
  const hiddenCount = items.length - visible.length;
  const total = Object.values(values).reduce((s, n) => s + (n || 0), 0);

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
      {visible.map((item) => {
        const value = values[item.key] ?? 0;
        const on = value > 0;
        return (
          <Stack
            key={item.key}
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              px: 1.5,
              py: 0.75,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: on ? "primary.light" : "background.paper",
            }}
          >
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: on ? 700 : 500 }} noWrap>
                {item.label}
              </Typography>
              {item.sub ? (
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                  {item.sub}
                </Typography>
              ) : null}
            </Box>
            <IconButton
              size="small"
              aria-label={`ลด ${item.label}`}
              disabled={value <= 0}
              onClick={() => onChange(item.key, Math.max(0, value - 1))}
              sx={{ border: 1, borderColor: "divider", width: 32, height: 32 }}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
            <InputBase
              value={value === 0 ? "" : value}
              placeholder="0"
              onChange={(e) => {
                const n = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
                onChange(item.key, Number.isNaN(n) ? 0 : Math.min(max, n));
              }}
              onFocus={(e) => e.target.select()}
              inputProps={{
                inputMode: "numeric",
                "aria-label": item.label,
                style: { textAlign: "center", fontWeight: 700, padding: "4px 0" },
              }}
              sx={{ width: 56, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}
            />
            <IconButton
              size="small"
              aria-label={`เพิ่ม ${item.label}`}
              onClick={() => onChange(item.key, Math.min(max, value + 1))}
              sx={{ border: 1, borderColor: "divider", width: 32, height: 32 }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
        );
      })}
      {hiddenCount > 0 || (expanded && !hiddenWithValue) ? (
        <Button
          fullWidth
          variant="text"
          size="small"
          onClick={() => setExpanded((e) => !e)}
          endIcon={showAll ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ borderRadius: 0, borderBottom: totalLabel ? 1 : 0, borderColor: "divider" }}
        >
          {showAll ? "ซ่อนรายการอื่น" : `แสดงรายการอื่น (${hiddenCount})`}
        </Button>
      ) : null}
      {totalLabel ? (
        <Stack direction="row" justifyContent="space-between" sx={{ px: 1.5, py: 1.25, bgcolor: "navy.dark", color: "common.white" }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "inherit" }}>
            {totalLabel}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 800, color: "inherit" }}>
            {total} {unit}
          </Typography>
        </Stack>
      ) : null}
    </Box>
  );
}
