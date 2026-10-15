import { COORDINATION_ICONS, type CoordinationIcon } from "@sts/shared";
import TextFieldsOutlined from "@mui/icons-material/TextFieldsOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { ICON_LABELS } from "../types/icon-labels.js";
import { MachineGlyph } from "./machine-icon.js";

// Work-type grid used by the "เพิ่มงาน" popover and the edit panel (selected tile = current type).
export function TypePicker({ value, onPick, columns = 4, exclude = [] }: { value?: CoordinationIcon; onPick: (icon: CoordinationIcon) => void; columns?: number; exclude?: CoordinationIcon[] }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(64px, 1fr))`, gap: 0.5 }}>
      {COORDINATION_ICONS.filter((icon) => !exclude.includes(icon)).map((icon) => {
        const active = value === icon;
        return (
          <Button
            key={icon}
            variant="text"
            color="inherit"
            onClick={() => onPick(icon)}
            aria-pressed={active}
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
            {icon === "text" ? <TextFieldsOutlined fontSize="small" /> : <MachineGlyph icon={icon} />}
            <Typography variant="caption" noWrap color={active ? "text.primary" : "text.secondary"} sx={{ fontWeight: active ? 700 : 500 }}>
              {ICON_LABELS[icon]}
            </Typography>
          </Button>
        );
      })}
    </Box>
  );
}
