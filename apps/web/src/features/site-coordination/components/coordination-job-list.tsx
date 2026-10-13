import type { CoordinationContractor, CoordinationItem } from "@sts/shared";
import TextFieldsOutlined from "@mui/icons-material/TextFieldsOutlined";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ICON_LABELS } from "../types/icon-labels.js";
import { MachineGlyph } from "./machine-icon.js";

// Every job of the day under the map (same contractor filter as the map), so the detail behind
// each short title — the note — stays readable without opening jobs one by one.
export function CoordinationJobList({
  items,
  contractors,
  selectedId,
  onSelect,
}: {
  items: CoordinationItem[];
  contractors: CoordinationContractor[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const byId = new Map(contractors.map((c) => [c.id, c]));
  const rows = [...items].sort((a, b) => (byId.get(a.contractorId)?.code ?? "").localeCompare(byId.get(b.contractorId)?.code ?? ""));
  if (!rows.length) return null;
  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}>
      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ px: 1.5, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          รายการงานบนผัง
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {rows.length} รายการ · คลิกเพื่อดูบนผัง
        </Typography>
      </Stack>
      {rows.map((item, i) => {
        const c = byId.get(item.contractorId);
        const color = c?.color ?? "#64748B";
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
              borderLeft: "3px solid",
              borderLeftColor: active ? color : "transparent",
              bgcolor: active ? `${color}14` : "transparent",
              "&:hover": { bgcolor: `${color}0F` },
            }}
          >
            <Box sx={{ width: 32, flexShrink: 0, display: "flex", justifyContent: "center", pt: 0.25 }}>
              {item.icon === "text" ? <TextFieldsOutlined fontSize="small" /> : <MachineGlyph icon={item.icon} />}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box component="span" sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {c?.code ?? "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {c?.name} · {ICON_LABELS[item.icon]} · {item.areaKind === "polygon" ? "พื้นที่รูปทรงอิสระ" : "พื้นที่สี่เหลี่ยม"}
                </Typography>
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
  );
}
