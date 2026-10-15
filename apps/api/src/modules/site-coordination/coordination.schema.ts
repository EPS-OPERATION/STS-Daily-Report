import { t } from "elysia";
import { COORDINATION_MAX, COORDINATION_MIN } from "@sts/shared";
const uuid = t.String({ format: "uuid" });
export const projectParams = t.Object({ projectId: uuid });
export const itemParams = t.Object({ projectId: uuid, id: uuid });
export const contractorParams = t.Object({ projectId: uuid, contractorId: uuid });
export const dateQuery = t.Object({ date: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }) });
export const revisionQuery = t.Object({ revision: t.Numeric({ minimum: 1 }) });
const point = t.Object({ x: t.Number({ minimum: COORDINATION_MIN, maximum: COORDINATION_MAX }), y: t.Number({ minimum: COORDINATION_MIN, maximum: COORDINATION_MAX }) });
const fields = {
  contractorId: uuid, workDate: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }), title: t.String({ minLength: 1, maxLength: 200 }),
  icon: t.Union([t.Literal("crane"), t.Literal("machinery"), t.Literal("truck"), t.Literal("weld"), t.Literal("pipe"), t.Literal("box"), t.Literal("pin"), t.Literal("road"), t.Literal("text")]),
  x: t.Number({ minimum: COORDINATION_MIN, maximum: COORDINATION_MAX }), y: t.Number({ minimum: COORDINATION_MIN, maximum: COORDINATION_MAX }), rotation: t.Number({ minimum: -360, maximum: 360 }),
  areaKind: t.Union([t.Literal("rectangle"), t.Literal("polygon"), t.Literal("route")]),
  // Areas are closed polygons (3+ points); a road route is an open polyline (2+ points).
  geometry: t.Object({ type: t.Union([t.Literal("polygon"), t.Literal("polyline")]), points: t.Array(point, { minItems: 2, maxItems: 500 }) }),
  linkArea: t.Optional(t.Boolean()),
  note: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
};
export const createBody = t.Object(fields, { additionalProperties: false });
export const updateBody = t.Object({ ...fields, revision: t.Integer({ minimum: 1 }) }, { additionalProperties: false });
export const dayNoteBody = t.Object({ note: t.String({ maxLength: 2000 }) }, { additionalProperties: false });
export const colorBody = t.Object({ color: t.String({ pattern: "^#[0-9A-Fa-f]{6}$" }), revision: t.Integer({ minimum: 1 }) });

// Road register (EPS): one segment between junctions, drawn as an open line.
export const roadParams = t.Object({ projectId: uuid, id: uuid });
export const roadSegmentBody = t.Object({
  road: t.String({ minLength: 1, maxLength: 20 }),
  name: t.String({ minLength: 1, maxLength: 80 }),
  points: t.Array(point, { minItems: 2, maxItems: 500 }),
  closed: t.Optional(t.Boolean()),
}, { additionalProperties: false });
