import { COORDINATION_ICONS, type CoordinationIcon } from "@sts/shared";
import CategoryOutlined from "@mui/icons-material/CategoryOutlined";
import TextFieldsOutlined from "@mui/icons-material/TextFieldsOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { FilterButton, MultiSelectFilter, type FilterOption } from "@/components/ui/filter-popover.js";
import { ICON_LABELS } from "../types/icon-labels.js";
import { MARK_SCALE, MARK_SCALE_MAX, MARK_SCALE_MIN } from "../utils/canvas-text.js";
import { MachineGlyph } from "./machine-icon.js";

// What the map draws (per browser): the job icon is always shown, everything else can be switched off.
export interface MapDisplay {
  /** Road routes (arrows) drawn by contractors. */
  roads: boolean;
  /** Names of the register roads (Map page only). */
  roadNames: boolean;
  areas: boolean;
  labels: boolean;
  notes: boolean;
  links: boolean;
  chips: boolean;
  detailCard: boolean;
  jobList: boolean;
  /** Size of icons, company tags and labels (1 = full size). */
  markSize: number;
}

type DisplaySwitch = Exclude<keyof MapDisplay, "markSize">;

export const DEFAULT_MAP_DISPLAY: MapDisplay = { roads: true, roadNames: true, areas: true, labels: true, notes: true, links: true, chips: true, detailCard: true, jobList: true, markSize: MARK_SCALE };

const DISPLAY_KEY = "sts_map_display_v1";

export function loadMapDisplay(): MapDisplay {
  try {
    const raw = localStorage.getItem(DISPLAY_KEY);
    if (!raw) return DEFAULT_MAP_DISPLAY;
    const saved = { ...DEFAULT_MAP_DISPLAY, ...(JSON.parse(raw) as Partial<MapDisplay>) };
    const size = Number(saved.markSize);
    return { ...saved, markSize: Number.isFinite(size) ? Math.min(MARK_SCALE_MAX, Math.max(MARK_SCALE_MIN, size)) : MARK_SCALE };
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

const DISPLAY_OPTIONS: { key: DisplaySwitch; label: string; hint: string; group: "map" | "detail" }[] = [
  { key: "roadNames", label: "Road names", hint: "ชื่อถนนจากทะเบียนถนน (ไม่มีเส้น)", group: "map" },
  { key: "roads", label: "Road routes", hint: "เส้นและลูกศรทิศทางที่ผู้รับเหมาใช้ถนน", group: "map" },
  { key: "areas", label: "Work areas", hint: "กรอบสีขอบเขตที่ใช้", group: "map" },
  { key: "labels", label: "Item labels", hint: "ข้อความสั้นบนผัง", group: "map" },
  { key: "notes", label: "Notes under labels", hint: "บรรทัดเล็กสีจาง สูงสุด 2 บรรทัด", group: "map" },
  { key: "links", label: "Icon–area links", hint: "เส้นประจากหมุดถึงขอบพื้นที่", group: "map" },
  { key: "chips", label: "Contractor code tags", hint: "ป้ายกลางพื้นที่ เช่น LCE", group: "map" },
  { key: "detailCard", label: "Detail card on map", hint: "ผรม · ชื่องาน · ประเภท · หมายเหตุ เมื่อคลิกงาน", group: "detail" },
  { key: "jobList", label: "Item list + notes", hint: "แสดงเมื่อยังไม่ได้เลือกงาน (เลือกงานแล้วจะเป็นแผงแก้ไข)", group: "detail" },
];

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
  const all = selected.size === COORDINATION_ICONS.length;

  const options: FilterOption[] = COORDINATION_ICONS.map((icon) => {
    const n = counts.get(icon) ?? 0;
    return {
      value: icon,
      label: ICON_LABELS[icon],
      leading: (
        <Box sx={{ width: 24, display: "flex", justifyContent: "center", color: "text.secondary" }}>
          {icon === "text" ? <TextFieldsOutlined fontSize="small" /> : <MachineGlyph icon={icon} />}
        </Box>
      ),
      count: `${n} งาน`,
      dim: n === 0,
    };
  });

  const selectedValues = useMemo(() => new Set<string>(selected), [selected]);

  return (
    <MultiSelectFilter
      icon={<CategoryOutlined fontSize="small" />}
      buttonLabel={all ? "ประเภทงาน: ทั้งหมด" : `ประเภทงาน: ${selected.size}/${COORDINATION_ICONS.length}`}
      filteredCount={all ? undefined : selected.size}
      options={options}
      selected={selectedValues}
      onChange={(next) => onChange(new Set([...next] as CoordinationIcon[]))}
      doneLabel="ตกลง"
      align="left"
    />
  );
}

// Display switches (what is drawn on the map / which detail panels show).
export function DisplayOptions({ value, onChange, exclude = [] }: { value: MapDisplay; onChange: (next: MapDisplay) => void; exclude?: DisplaySwitch[] }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const options = DISPLAY_OPTIONS.filter((o) => !exclude.includes(o.key));
  const hidden = options.filter((o) => !value[o.key]).length + (value.markSize !== MARK_SCALE ? 1 : 0);
  const section = (group: "map" | "detail", title: string) => (
    <Box sx={{ py: 0.5 }}>
      <Typography variant="overline" color="text.secondary" sx={{ px: 1.75, lineHeight: 2 }}>
        {title}
      </Typography>
      {options.filter((o) => o.group === group).map((o) => (
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
      <FilterButton icon={<VisibilityOutlined fontSize="small" />} label="Display" active={hidden > 0} count={hidden} onClick={setAnchor} />
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 0.75, width: 300, borderRadius: 2 } } }}
      >
        <Box sx={{ px: 1.75, pt: 1.25 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Icon &amp; label size
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {Math.round(value.markSize * 100)}%
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            ขนาดไอคอน ป้ายรหัส และชื่อบนผัง — เล็กลงเมื่องานซ้อนกัน
          </Typography>
          <Slider
            size="small"
            aria-label="Icon and label size"
            min={MARK_SCALE_MIN}
            max={MARK_SCALE_MAX}
            step={0.05}
            marks={[{ value: MARK_SCALE }]}
            value={value.markSize}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
            onChange={(_, v) => onChange({ ...value, markSize: v as number })}
          />
        </Box>
        <Divider />
        {section("map", "บนผัง")}
        <Divider />
        {section("detail", "รายละเอียด")}
        <Divider />
        <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, py: 0.75 }}>
          <Button onClick={() => onChange(DEFAULT_MAP_DISPLAY)}>
            คืนค่าเริ่มต้น
          </Button>
        </Stack>
      </Popover>
    </>
  );
}
