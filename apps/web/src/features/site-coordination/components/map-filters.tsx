import { COORDINATION_ICONS, type CoordinationIcon } from "@sts/shared";
import ArrowDropDownOutlined from "@mui/icons-material/ArrowDropDownOutlined";
import CategoryOutlined from "@mui/icons-material/CategoryOutlined";
import TextFieldsOutlined from "@mui/icons-material/TextFieldsOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useState, type ReactNode } from "react";
import { ICON_LABELS } from "../types/icon-labels.js";
import { MachineGlyph } from "./machine-icon.js";

// What the map draws (per browser): the job icon is always shown, everything else can be switched off.
export interface MapDisplay {
  areas: boolean;
  labels: boolean;
  notes: boolean;
  links: boolean;
  chips: boolean;
  detailCard: boolean;
  jobList: boolean;
}

export const DEFAULT_MAP_DISPLAY: MapDisplay = { areas: true, labels: true, notes: true, links: true, chips: true, detailCard: true, jobList: true };

const DISPLAY_KEY = "sts_map_display_v1";

export function loadMapDisplay(): MapDisplay {
  try {
    const raw = localStorage.getItem(DISPLAY_KEY);
    return raw ? { ...DEFAULT_MAP_DISPLAY, ...(JSON.parse(raw) as Partial<MapDisplay>) } : DEFAULT_MAP_DISPLAY;
  } catch {
    return DEFAULT_MAP_DISPLAY;
  }
}

export function saveMapDisplay(display: MapDisplay) {
  try {
    localStorage.setItem(DISPLAY_KEY, JSON.stringify(display));
  } catch {
    // storage blocked — the choice just isn't remembered
  }
}

const DISPLAY_OPTIONS: { key: keyof MapDisplay; label: string; hint: string; group: "map" | "detail" }[] = [
  { key: "areas", label: "พื้นที่ทำงาน", hint: "กรอบสีขอบเขตที่ใช้", group: "map" },
  { key: "labels", label: "ชื่องานใต้ไอคอน", hint: "ข้อความสั้นบนผัง", group: "map" },
  { key: "notes", label: "หมายเหตุใต้ชื่องาน", hint: "บรรทัดเล็กสีจาง สูงสุด 2 บรรทัด", group: "map" },
  { key: "links", label: "เส้นเชื่อมไอคอน–พื้นที่", hint: "เส้นประจากหมุดถึงขอบพื้นที่", group: "map" },
  { key: "chips", label: "ป้ายรหัสผู้รับเหมา", hint: "ป้ายกลางพื้นที่ เช่น LCE", group: "map" },
  { key: "detailCard", label: "การ์ดรายละเอียดบนผัง", hint: "ผรม · ชื่องาน · ประเภท · หมายเหตุ เมื่อคลิกงาน", group: "detail" },
  { key: "jobList", label: "แผงรายการงาน + หมายเหตุ", hint: "แสดงเมื่อยังไม่ได้เลือกงาน (เลือกงานแล้วจะเป็นแผงแก้ไข)", group: "detail" },
];

// Toolbar trigger in the same shape as the contractor filter popover button.
function FilterButton({ icon, label, active, count, onClick }: { icon: ReactNode; label: string; active: boolean; count?: number; onClick: (el: HTMLElement) => void }) {
  return (
    <Badge color="primary" badgeContent={count} invisible={!count} overlap="rectangular">
      <Button
        variant="outlined"
        color={active ? "primary" : "inherit"}
        startIcon={icon}
        endIcon={<ArrowDropDownOutlined />}
        onClick={(e) => onClick(e.currentTarget)}
        sx={{
          height: 40,
          whiteSpace: "nowrap",
          textTransform: "none",
          fontWeight: active ? 700 : 500,
          borderColor: active ? "primary.main" : "divider",
          bgcolor: (t) => (active ? alpha(t.palette.primary.main, 0.06) : t.palette.background.paper),
          color: active ? "primary.main" : "text.primary",
        }}
      >
        {label}
      </Button>
    </Badge>
  );
}

// Work-type filter: one row per icon type with its glyph and how many jobs of that type are on the day.
export function TypeFilter({
  selected,
  counts,
  onChange,
}: {
  selected: Set<CoordinationIcon>;
  counts: Map<CoordinationIcon, number>;
  onChange: (next: Set<CoordinationIcon>) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const all = selected.size === COORDINATION_ICONS.length;
  const toggle = (icon: CoordinationIcon) => {
    const next = new Set(selected);
    if (next.has(icon)) next.delete(icon);
    else next.add(icon);
    onChange(next);
  };
  return (
    <>
      <FilterButton
        icon={<CategoryOutlined fontSize="small" />}
        label={all ? "ประเภทงาน: ทั้งหมด" : `ประเภทงาน: ${selected.size}`}
        active={!all}
        onClick={setAnchor}
      />
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { mt: 0.75, width: 280, borderRadius: 2 } } }}
      >
        <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
            ประเภทงาน
          </Typography>
          <Button size="small" onClick={() => onChange(new Set(all ? [] : COORDINATION_ICONS))}>
            {all ? "ล้าง" : "ทั้งหมด"}
          </Button>
        </Stack>
        <Divider />
        <Box sx={{ py: 0.5 }}>
          {COORDINATION_ICONS.map((icon) => {
            const n = counts.get(icon) ?? 0;
            return (
              <Stack
                key={icon}
                direction="row"
                alignItems="center"
                spacing={1}
                onClick={() => toggle(icon)}
                sx={{ px: 1, py: 0.25, cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, opacity: n ? 1 : 0.55 }}
              >
                <Checkbox size="small" checked={selected.has(icon)} tabIndex={-1} sx={{ p: 0.5 }} />
                <Box sx={{ width: 28, display: "flex", justifyContent: "center" }}>
                  {icon === "text" ? <TextFieldsOutlined fontSize="small" /> : <MachineGlyph icon={icon} />}
                </Box>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {ICON_LABELS[icon]}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {n} งาน
                </Typography>
              </Stack>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}

// Display switches (what is drawn on the map / which detail panels show).
export function DisplayOptions({ value, onChange }: { value: MapDisplay; onChange: (next: MapDisplay) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const hidden = DISPLAY_OPTIONS.filter((o) => !value[o.key]).length;
  const section = (group: "map" | "detail", title: string) => (
    <Box sx={{ py: 0.5 }}>
      <Typography variant="overline" color="text.secondary" sx={{ px: 1.75, lineHeight: 2 }}>
        {title}
      </Typography>
      {DISPLAY_OPTIONS.filter((o) => o.group === group).map((o) => (
        <Stack
          key={o.key}
          direction="row"
          alignItems="center"
          onClick={() => onChange({ ...value, [o.key]: !value[o.key] })}
          sx={{ px: 1.75, py: 0.5, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {o.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {o.hint}
            </Typography>
          </Box>
          <Switch size="small" checked={value[o.key]} tabIndex={-1} />
        </Stack>
      ))}
    </Box>
  );
  return (
    <>
      <FilterButton icon={<VisibilityOutlined fontSize="small" />} label="การแสดงผล" active={hidden > 0} count={hidden} onClick={setAnchor} />
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 0.75, width: 300, borderRadius: 2 } } }}
      >
        {section("map", "บนผัง")}
        <Divider />
        {section("detail", "รายละเอียด")}
        <Divider />
        <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, py: 0.75 }}>
          <Button size="small" onClick={() => onChange(DEFAULT_MAP_DISPLAY)}>
            คืนค่าเริ่มต้น
          </Button>
        </Stack>
      </Popover>
    </>
  );
}
