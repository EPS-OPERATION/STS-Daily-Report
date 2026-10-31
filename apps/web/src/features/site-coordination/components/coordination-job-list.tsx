import type { CoordinationContractor, CoordinationItem, CoordinationItemType } from "@sts/shared";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import ExpandLessOutlined from "@mui/icons-material/ExpandLessOutlined";
import FilterAltOffOutlined from "@mui/icons-material/FilterAltOffOutlined";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { EmptySection } from "@/components/ui/empty-state.js";
import { TOKENS } from "@/app/theme/tokens.js";
import { CoordinationGlyph } from "./coordination-icon.js";

// Every job of the day under the map (same contractor filter as the map), so the detail behind
// each short title — the note — stays readable without opening jobs one by one.
export function CoordinationJobList({
  items,
  contractors,
  itemTypes = [],
  selectedId,
  onSelect,
  embedded = false,
  onCollapse,
  footer,
  header,
  clashCodes,
  filtered = false,
}: {
  /** A contractor / type / search filter is on: an empty list then says "nothing matches" (no jobs at all = no card). */
  filtered?: boolean;
  /** Pinned above the list (the area's route-section legend). */
  header?: ReactNode;
  /** Contractor codes whose road route collides with this job's route (empty = no clash). */
  clashCodes?: (id: string) => string[];
  /** Inside the map card: no own border; a right-hand panel the height of the map on wide screens. */
  embedded?: boolean;
  items: CoordinationItem[];
  contractors: CoordinationContractor[];
  itemTypes: CoordinationItemType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Folds the panel away (the map shows a tab to bring it back). */
  onCollapse?: () => void;
  /** Pinned under the scrolling list (the day note). */
  footer?: ReactNode;
}) {
  const byId = new Map(contractors.map((c) => [c.id, c]));
  const typeByCode = new Map(itemTypes.map((t) => [t.code, t]));
  const rows = [...items].sort((a, b) => (byId.get(a.contractorId)?.code ?? "").localeCompare(byId.get(b.contractorId)?.code ?? ""));
  const frame = embedded
    ? { borderTop: { xs: "1px solid", lg: "none" }, borderLeft: { lg: "1px solid" }, borderColor: "divider", height: { lg: "100%" }, display: "flex", flexDirection: "column" as const, minHeight: 0 }
    : { border: "1px solid", borderColor: "divider", borderRadius: 1 };
  return (
    <Box sx={{ bgcolor: "background.paper", ...frame }}>
      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ px: 1.5, py: 1.25, borderBottom: "1px solid", borderColor: "divider", position: "sticky", top: 0, bgcolor: "background.paper", zIndex: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          รายการงานบนผัง
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {rows.length} รายการ · คลิกเพื่อดูบนผัง
        </Typography>
        {onCollapse ? (
          <Tooltip title="ซ่อนรายการงาน">
            <IconButton size="small" aria-label="Hide item list" onClick={onCollapse} sx={{ alignSelf: "center", my: -0.5 }}>
              <ChevronRightOutlined fontSize="small" sx={{ display: { xs: "none", lg: "block" } }} />
              <ExpandLessOutlined fontSize="small" sx={{ display: { xs: "block", lg: "none" } }} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
      {header ? (
        // With no jobs the route sections take the whole panel; with jobs they keep their short, scrollable height.
        <Box sx={{ flex: rows.length ? "0 0 auto" : 1, minHeight: 0, maxHeight: rows.length ? 320 : undefined, overflowY: "auto" }}>{header}</Box>
      ) : null}
      <Box sx={{ flex: rows.length ? 1 : "0 0 auto", minHeight: 0, overflowY: "auto", px: 1.5, py: 1 }}>
      {!rows.length && filtered ? (
        <EmptySection dense icon={<FilterAltOffOutlined />} title="ไม่มีงานที่ตรงกับตัวกรอง" description="ลองปรับตัวกรองหรือกด Clear filters เพื่อดูงานทั้งหมด" />
      ) : null}
      {rows.map((item, i) => {
        const c = byId.get(item.contractorId);
        const color = c?.color ?? TOKENS.neutral;
        const active = item.id === selectedId;
        return (
          <Stack
            key={item.id}
            direction="row"
            spacing={1.5}
            alignItems="flex-start"
            onClick={() => onSelect(item.id)}
            sx={{
              px: 1.5,
              py: 1,
              cursor: "pointer",
              borderTop: i ? "1px solid" : "none",
              borderColor: "divider",
              bgcolor: active ? `${color}14` : "transparent",
              boxShadow: active ? `inset 0 0 0 1px ${color}66` : "none",
              transition: "background-color 120ms ease-out",
              "&:hover": { bgcolor: `${color}0F` },
            }}
          >
            <Box sx={{ width: 32, flexShrink: 0, display: "flex", justifyContent: "center", pt: 0.25 }}>
              <CoordinationGlyph iconKey={typeByCode.get(item.icon)?.iconKey ?? "map-pin"} size={22} color={color} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box component="span" sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {c?.code ?? "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {c?.name} · {typeByCode.get(item.icon)?.labelTh ?? item.icon}
                </Typography>
                {clashCodes?.(item.id).length ? (
                  <Chip size="small" color="error" label={`ทับเส้นทาง ${clashCodes(item.id).join(", ")}`} sx={{ height: 20, flexShrink: 0 }} />
                ) : null}
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {item.title}
              </Typography>
              {item.note ? (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
                  {item.note}
                </Typography>
              ) : null}
            </Box>
          </Stack>
        );
      })}
      </Box>
      {footer}
    </Box>
  );
}
