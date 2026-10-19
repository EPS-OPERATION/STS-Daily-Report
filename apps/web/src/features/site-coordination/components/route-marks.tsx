import { Arrow, Circle, Group, RegularPolygon, Text } from "react-konva";
import { routeMidpoint } from "../utils/canvas-geometry.js";
import { CAPTION_FONT } from "../utils/canvas-text.js";
import { CAPTION_MAX_WIDTH } from "../utils/canvas-text.js";
import { CAPTION_LINE_HEIGHT } from "../utils/canvas-text.js";
import { MARK_SCALE } from "../utils/canvas-text.js";
import { CAPTION_MAX_LINES } from "../utils/canvas-text.js";
import { layoutTextTitle } from "../utils/canvas-text.js";

// Direction marks on a road route (image pixels): a start dot, small arrows along the line every
// ~90 screen px and an arrowhead at the end, so the way the contractor drives reads at a glance.
// Two-way roads get an arrowhead at both ends and no in-between marks (those would point one way).
// The title sits under the midpoint chip. Never listens: the route line itself takes the clicks.
export function RouteMarks({ points, dx, dy, color, paper, scale, title, textColor, arrowsHidden = false, twoWay = false, labelDy = 14, markScale = MARK_SCALE }: {
  points: { x: number; y: number }[]; dx: number; dy: number; color: string; paper: string; scale: number; title: string; textColor: string;
  /** Label only (e.g. a register road with no direction). */
  arrowsHidden?: boolean;
  /** Traffic both ways: arrowheads at both ends. */
  twoWay?: boolean;
  /** Screen px from the midpoint down to the label (stacked when labels would overlap). */
  labelDy?: number;
  /** Size of the route label (map Display setting). */
  markScale?: number;
}) {
  const step = 90 / scale;
  const marks: { x: number; y: number; rotation: number }[] = [];
  let next = step / 2;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const rotation = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
    while (next < length) {
      marks.push({ x: a.x + ((b.x - a.x) * next) / length, y: a.y + ((b.y - a.y) * next) / length, rotation });
      next += step;
    }
    next -= length;
  }
  const end = points[points.length - 1]!, before = points[points.length - 2]!;
  const start = points[0]!, after = points[1]!;
  const mid = routeMidpoint(points.map((p) => ({ x: p.x, y: p.y })), 1, 1);
  const label = title ? layoutTextTitle(title, { font: CAPTION_FONT, maxWidth: CAPTION_MAX_WIDTH, lineHeight: CAPTION_LINE_HEIGHT, maxLines: CAPTION_MAX_LINES, minWidth: 64 }) : null;
  return <Group x={dx} y={dy} listening={false}>
    {/* The last stretch near the arrowhead stays clear of small marks. */}
    {!arrowsHidden && !twoWay && marks.filter((m) => Math.hypot(m.x - end.x, m.y - end.y) > 30 / scale).map((m, i) => (
      <RegularPolygon key={i} x={m.x} y={m.y} sides={3} radius={5 / scale} rotation={m.rotation} fill={paper} />
    ))}
    {!arrowsHidden && !twoWay && <Circle x={points[0]!.x} y={points[0]!.y} radius={7 / scale} fill={paper} stroke={color} strokeWidth={3 / scale} />}
    {!arrowsHidden && <Arrow points={[before.x, before.y, end.x, end.y]} pointerLength={22 / scale} pointerWidth={22 / scale} fill={color} stroke={color} strokeWidth={6 / scale} lineCap="round" />}
    {!arrowsHidden && twoWay && <Arrow points={[after.x, after.y, start.x, start.y]} pointerLength={22 / scale} pointerWidth={22 / scale} fill={color} stroke={color} strokeWidth={6 / scale} lineCap="round" />}
    {label && <Group x={mid.x} y={mid.y} scaleX={markScale / scale} scaleY={markScale / scale}>
      <Text x={-label.width / 2} y={labelDy} width={label.width} text={label.lines.join("\n")} fontFamily="Inter" fontSize={12} fontStyle="600" lineHeight={CAPTION_LINE_HEIGHT / 12} align="center" fill={textColor} stroke={paper} strokeWidth={3} fillAfterStrokeEnabled />
    </Group>}
  </Group>;
}
