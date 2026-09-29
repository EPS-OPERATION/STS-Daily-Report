import { useTheme, type Theme } from "@mui/material/styles";
import { useState } from "react";
import { centroid, toSvgPoints } from "../utils/geometry.js";
import type { PlanArea, ZoneState } from "../types/site-plan.types.js";

const VIEW_W = 640;
const VIEW_H = 400;

function colors(status: ZoneState, theme: Theme): { fill: string; stroke: string } {
  switch (status) {
    case "blocked":
      return { fill: "#FADDDD", stroke: theme.palette.error.main };
    case "attention":
      return { fill: "#FDEFD4", stroke: theme.palette.warning.main };
    case "active":
      return { fill: "#D8E9FB", stroke: theme.palette.info.main };
    case "completed":
      return { fill: "#DDF2E3", stroke: theme.palette.success.main };
    case "idle":
    default:
      return { fill: "#EDF0F4", stroke: "#98A2B3" };
  }
}

export interface MapZone extends PlanArea {
  state: ZoneState;
  summary: string;
}

// Responsive schematic plan: normalized geometry over an optional master
// layout background image. Polygons are keyboard-focusable buttons.
export function PlanMap({
  zones,
  selectedId,
  dimOthers = false,
  backgroundUrl,
  onSelect,
  height = 460,
}: {
  zones: MapZone[];
  selectedId?: string | null;
  dimOthers?: boolean;
  backgroundUrl?: string | null;
  onSelect?: (id: string) => void;
  height?: number;
}) {
  const theme = useTheme();
  // Static dev background falls back to the schematic grid when absent.
  const [bgOk, setBgOk] = useState(true);
  const showBg = Boolean(backgroundUrl) && bgOk;
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      height={height}
      role="group"
      aria-label="Site plan with work zones"
      style={{ display: "block", backgroundColor: "#EFF3F6", borderRadius: 8 }}
    >
      {showBg ? (
        // Drawing is expected pre-cropped to the viewport aspect (see
        // apps/web/public/site-plan/README.md); slice fills any remainder.
        <image
          href={backgroundUrl as string}
          x={0}
          y={0}
          width={VIEW_W}
          height={VIEW_H}
          opacity={0.9}
          preserveAspectRatio="xMidYMid slice"
          onError={() => setBgOk(false)}
        />
      ) : (
        <g aria-hidden="true">
          {Array.from({ length: 15 }, (_, i) => (
            <line key={`v${i}`} x1={(i + 1) * 40} y1={0} x2={(i + 1) * 40} y2={VIEW_H} stroke="#DCE3EA" strokeWidth={1} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={(i + 1) * 40} x2={VIEW_W} y2={(i + 1) * 40} stroke="#DCE3EA" strokeWidth={1} />
          ))}
        </g>
      )}
      {zones.map((z) => {
        const c = colors(z.state, theme);
        const selected = selectedId === z.zone.id;
        const dimmed = dimOthers && selectedId != null && !selected;
        const center = centroid(z.geometry, VIEW_W, VIEW_H);
        return (
          <g
            key={z.zone.id}
            role="button"
            tabIndex={onSelect ? 0 : -1}
            aria-label={`Zone ${z.zone.code} ${z.zone.name}. ${z.summary}`}
            aria-pressed={selected}
            onClick={() => onSelect?.(z.zone.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(z.zone.id);
              }
            }}
            style={{ cursor: onSelect ? "pointer" : "default", opacity: dimmed ? 0.35 : 1, outline: "none" }}
          >
            <polygon
              points={toSvgPoints(z.geometry, VIEW_W, VIEW_H)}
              fill={c.fill}
              fillOpacity={backgroundUrl ? 0.55 : 1}
              stroke={selected ? theme.palette.primary.main : c.stroke}
              strokeWidth={selected ? 3.5 : 2}
            />
            <text
              x={center.x}
              y={center.y - 4}
              textAnchor="middle"
              fontSize={22}
              fontWeight={selected ? 800 : 700}
              fill={theme.palette.text.primary}
            >
              {z.zone.code}
            </text>
            <text
              x={center.x}
              y={center.y + 16}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill={theme.palette.text.secondary}
            >
              {z.zone.name.length > 18 ? `${z.zone.name.slice(0, 17)}…` : z.zone.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
