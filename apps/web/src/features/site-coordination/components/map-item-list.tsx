import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { FALLBACK_MAP_COLOR, SITE_ICONS, type SiteCalloutMarker } from "../types/coordination.types.js";

// Cards under the map: every job of the day, grouped by contractor, in its colour.
export function MapItemList({
  markers,
  colors,
  activeId,
  onSelect,
  canDelete,
  onDelete,
}: {
  markers: SiteCalloutMarker[];
  colors: Map<string, string>;
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Whether this job may be deleted here (e.g. contractor: own jobs only). */
  canDelete?: (contractorCode: string) => boolean;
  onDelete?: (id: string) => void;
}) {
  const items = [...markers].sort((a, b) => a.contractorCode.localeCompare(b.contractorCode) || a.createdAt.localeCompare(b.createdAt));

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        ไม่มีกิจกรรมบนผังในวันนี้
      </Typography>
    );
  }

  return (
    <Grid container spacing={1.5}>
      {items.map((m) => {
        const color = colors.get(m.contractorCode) ?? FALLBACK_MAP_COLOR;
        const selected = m.id === activeId;
        return (
          <Grid key={m.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              onClick={() => onSelect(m.id)}
              sx={{ cursor: "pointer", border: "2px solid", borderColor: selected ? color : "divider", "&:hover": { borderColor: color } }}
            >
              <CardContent sx={{ p: 1.5, display: "flex", gap: 1.25, alignItems: "flex-start" }}>
                <Box
                  sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", border: `3px solid ${color}`, bgcolor: alpha(color, 0.15), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21 }}
                >
                  {SITE_ICONS.find((i) => i.type === m.icon)?.emoji ?? "📍"}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color }}>
                    {m.contractorCode} · {m.contractorName}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {m.text}
                  </Typography>
                  {m.comment ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", whiteSpace: "pre-line" }}>
                      {m.comment}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                    {m.area ? "▣ มีพื้นที่ใช้งาน" : "ยังไม่ระบุพื้นที่"}
                  </Typography>
                </Box>
                {canDelete?.(m.contractorCode) && onDelete ? (
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(m.id);
                    }}
                    sx={{ minWidth: 0, px: 1 }}
                  >
                    ลบ
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
