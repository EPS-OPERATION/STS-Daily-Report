import { useTheme } from "@mui/material/styles";
import type { Zone, ZoneStatus } from "@/mock/site-data.js";

// Schematic site plan (stylized blocks, not satellite imagery).
// Each zone polygon can host MULTIPLE contractors — color encodes zone state only.
export function SitePlanSvg({
  zones,
  selectedId,
  dimOthers = false,
  onSelect,
  height = 420,
}: {
  zones: Zone[];
  selectedId?: string | null;
  dimOthers?: boolean;
  onSelect?: (id: string) => void;
  height?: number;
}) {
  const theme = useTheme();
  const fillFor = (status: ZoneStatus): { fill: string; stroke: string } => {
    switch (status) {
      case "active":
        return { fill: "#DDF2E3", stroke: theme.palette.success.main };
      case "attention":
        return { fill: "#FDEFD4", stroke: theme.palette.warning.main };
      case "blocked":
        return { fill: "#FADDDD", stroke: theme.palette.error.main };
      case "idle":
      default:
        return { fill: "#EDF0F4", stroke: "#98A2B3" };
    }
  };
  return (
    <svg
      viewBox="0 0 640 400"
      width="100%"
      height={height}
      role="img"
      aria-label="Schematic site plan with six zones"
      style={{ display: "block", backgroundColor: "#EFF3F6", borderRadius: 8 }}
    >
      {/* faint grid */}
      {Array.from({ length: 15 }, (_, i) => (
        <line key={`v${i}`} x1={(i + 1) * 40} y1={0} x2={(i + 1) * 40} y2={400} stroke="#DCE3EA" strokeWidth={1} />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={(i + 1) * 40} x2={640} y2={(i + 1) * 40} stroke="#DCE3EA" strokeWidth={1} />
      ))}
      {/* roads */}
      <line x1={0} y1={190} x2={640} y2={190} stroke="#FFFFFF" strokeWidth={10} />
      <line x1={0} y1={190} x2={640} y2={190} stroke="#C9D3DD" strokeWidth={1} strokeDasharray="8 6" />
      <line x1={485} y1={0} x2={485} y2={400} stroke="#FFFFFF" strokeWidth={10} />
      <line x1={485} y1={0} x2={485} y2={400} stroke="#C9D3DD" strokeWidth={1} strokeDasharray="8 6" />
      {zones.map((z) => {
        const c = fillFor(z.status);
        const selected = selectedId === z.id;
        const dimmed = dimOthers && selectedId != null && !selected;
        return (
          <g
            key={z.id}
            onClick={() => onSelect?.(z.id)}
            style={{ cursor: onSelect ? "pointer" : "default", opacity: dimmed ? 0.35 : 1 }}
          >
            <polygon
              points={z.polygon}
              fill={c.fill}
              stroke={selected ? theme.palette.primary.main : c.stroke}
              strokeWidth={selected ? 3 : 2}
            />
            <text
              x={z.labelX}
              y={z.labelY - 4}
              textAnchor="middle"
              fontSize={22}
              fontWeight={700}
              fill={theme.palette.text.primary}
            >
              {z.no}
            </text>
            <text
              x={z.labelX}
              y={z.labelY + 16}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill={theme.palette.text.secondary}
            >
              {z.short}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
