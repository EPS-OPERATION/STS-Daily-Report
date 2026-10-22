import type { CoordinationItemType } from "@sts/shared";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { CoordinationGlyph } from "./coordination-icon.js";

// Work-type grid used by the "Add item" popover and the edit panel (selected tile = current type).
// The catalog is project data: admins add/rename/hide types on /site-coordination/item-types.
export function TypePicker({
  types,
  value,
  onPick,
  columns = 4,
  exclude = [],
}: {
  types: CoordinationItemType[];
  value?: string;
  onPick: (code: string) => void;
  columns?: number;
  exclude?: string[];
}) {
  const visible = types.filter((t) => t.isActive && !exclude.includes(t.code));
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(64px, 1fr))`, gap: 0.5 }}>
      {visible.map((type) => {
        const active = value === type.code;
        return (
          <Button
            key={type.code}
            variant="text"
            color="inherit"
            onClick={() => onPick(type.code)}
            aria-pressed={active}
            title={type.label}
            sx={{
              flexDirection: "column",
              gap: 0.5,
              py: 1,
              minHeight: 64,
              textTransform: "none",
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: active ? "primary.main" : "transparent",
              bgcolor: active ? "action.selected" : "transparent",
            }}
          >
            <CoordinationGlyph iconKey={type.iconKey} size={26} />
            <Typography variant="caption" noWrap color={active ? "text.primary" : "text.secondary"} sx={{ fontWeight: active ? 700 : 500, maxWidth: "100%" }}>
              {type.labelTh}
            </Typography>
          </Button>
        );
      })}
    </Box>
  );
}
