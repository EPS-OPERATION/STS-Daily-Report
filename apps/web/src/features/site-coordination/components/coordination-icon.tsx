import type { CSSProperties } from "react";
import { Group, Path } from "react-konva";
import { COORDINATION_ICON_PATHS } from "./coordination-icon-paths.js";

// Phosphor fill artwork, drawn from the same path data in the admin picker (SVG) and on the map (Konva).
// The marker's white disc supplies the contrast, so the glyph itself is a flat contractor colour.
const FALLBACK = COORDINATION_ICON_PATHS["map-pin"]!;

function pathsOf(iconKey: string): string[] {
  return COORDINATION_ICON_PATHS[iconKey] ?? FALLBACK;
}

export function CoordinationGlyph({
  iconKey,
  size = 26,
  color,
  style,
}: {
  iconKey: string;
  size?: number;
  /** Defaults to currentColor (menu/list contexts). */
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flexShrink: 0, fill: color ?? "currentColor", ...style }}
    >
      {pathsOf(iconKey).map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/** The same glyph on a Konva layer (map + printed snapshot). */
export function CoordinationIconShape({
  iconKey,
  color,
  rotation = 0,
  size = 38,
}: {
  iconKey: string;
  color: string;
  rotation?: number;
  size?: number;
}) {
  const ratio = size / 256;
  return (
    <Group rotation={rotation} offsetX={size / 2} offsetY={size / 2} listening={false}>
      {pathsOf(iconKey).map((d, i) => (
        <Path key={i} data={d} fill={color} scaleX={ratio} scaleY={ratio} perfectDrawEnabled={false} />
      ))}
    </Group>
  );
}

/** Human labels for the admin icon picker (the icon set is fixed; job labels come from the item type). */
export const COORDINATION_ICON_LABELS: Record<string, string> = {
  crane: "Crane",
  "crane-tower": "Tower crane",
  bulldozer: "Bulldozer",
  tractor: "Tractor",
  truck: "Truck",
  "truck-trailer": "Truck + trailer",
  "traffic-cone": "Traffic cone",
  "traffic-sign": "Traffic sign",
  "hard-hat": "Hard hat",
  fire: "Hot work / fire",
  "fire-extinguisher": "Fire extinguisher",
  pipe: "Pipe",
  "pipe-wrench": "Pipe wrench",
  wrench: "Wrench",
  hammer: "Hammer",
  toolbox: "Toolbox",
  package: "Materials / package",
  warehouse: "Warehouse",
  factory: "Factory",
  wall: "Wall / masonry",
  stairs: "Stairs / access",
  ruler: "Survey / measure",
  "paint-roller": "Painting",
  engine: "Engine",
  gear: "Equipment",
  drop: "Water",
  lightning: "Electrical",
  warning: "Hazard",
  "map-pin": "Work point",
  "road-horizon": "Road",
  "text-t": "Text",
};
