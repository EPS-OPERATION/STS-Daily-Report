import { t } from "elysia";
import { COORDINATION_ICON_SCALE_MAX, COORDINATION_ICON_SCALE_MIN, COORDINATION_MAX, COORDINATION_MIN } from "@sts/shared";
const uuid = t.String({ format: "uuid" });
export const projectParams = t.Object({ projectId: uuid });
export const itemParams = t.Object({ projectId: uuid, id: uuid });
export const contractorParams = t.Object({ projectId: uuid, contractorId: uuid });
export const dateQuery = t.Object({ date: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }) });
// The PDF report is one map at a time (defaults to the main map).
export const reportQuery = t.Object({ date: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }), mapId: t.Optional(uuid) });
export const revisionQuery = t.Object({ revision: t.Numeric({ minimum: 1 }) });
const point = t.Object({ x: t.Number({ minimum: COORDINATION_MIN, maximum: COORDINATION_MAX }), y: t.Number({ minimum: COORDINATION_MIN, maximum: COORDINATION_MAX }) });
const fields = {
  mapId: t.Optional(uuid),
  sectionId: t.Optional(t.Union([uuid, t.Null()])),
  contractorId: uuid, workDate: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }), title: t.String({ minLength: 1, maxLength: 200 }),
  icon: t.String({ minLength: 1, maxLength: 50, pattern: "^[a-z0-9_]+$" }),
  x: t.Number({ minimum: COORDINATION_MIN, maximum: COORDINATION_MAX }), y: t.Number({ minimum: COORDINATION_MIN, maximum: COORDINATION_MAX }), rotation: t.Number({ minimum: -360, maximum: 360 }),
  areaKind: t.Union([t.Literal("rectangle"), t.Literal("polygon"), t.Literal("route")]),
  // Areas are closed polygons (3+ points); a road route is an open polyline (2+ points).
  geometry: t.Object({ type: t.Union([t.Literal("polygon"), t.Literal("polyline")]), points: t.Array(point, { minItems: 2, maxItems: 500 }) }),
  linkArea: t.Optional(t.Boolean()),
  twoWay: t.Optional(t.Boolean()),
  iconScale: t.Optional(t.Number({ minimum: COORDINATION_ICON_SCALE_MIN, maximum: COORDINATION_ICON_SCALE_MAX })),
  note: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
};
export const createBody = t.Object(fields, { additionalProperties: false });
export const updateBody = t.Object({ ...fields, revision: t.Integer({ minimum: 1 }) }, { additionalProperties: false });
export const dayNoteBody = t.Object({ note: t.String({ maxLength: 2000 }) }, { additionalProperties: false });
export const colorBody = t.Object({ color: t.String({ pattern: "^#[0-9A-Fa-f]{6}$" }), revision: t.Integer({ minimum: 1 }) });

// Project item catalog ("Add item" menu). Code is optional: the server derives it from the English label.
export const itemTypeParams = t.Object({ projectId: uuid, id: uuid });
export const createItemTypeBody = t.Object({
  code: t.Optional(t.String({ minLength: 1, maxLength: 50, pattern: "^[a-z0-9_]+$" })),
  label: t.String({ minLength: 1, maxLength: 100 }),
  labelTh: t.String({ minLength: 1, maxLength: 100 }),
  iconKey: t.String({ minLength: 1, maxLength: 50 }),
  sortOrder: t.Optional(t.Integer({ minimum: 0, maximum: 9999 })),
}, { additionalProperties: false });
export const reorderItemTypesBody = t.Object({
  ids: t.Array(uuid, { minItems: 1, maxItems: 100 }),
}, { additionalProperties: false });
export const updateItemTypeBody = t.Object({
  label: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  labelTh: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  iconKey: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
  sortOrder: t.Optional(t.Integer({ minimum: 0, maximum: 9999 })),
  isActive: t.Optional(t.Boolean()),
}, { additionalProperties: false });

// Road register (EPS): one segment between junctions, drawn as an open line.
export const roadParams = t.Object({ projectId: uuid, id: uuid });
export const roadSegmentBody = t.Object({
  road: t.String({ minLength: 1, maxLength: 20 }),
  name: t.String({ minLength: 1, maxLength: 80 }),
  points: t.Array(point, { minItems: 2, maxItems: 500 }),
  closed: t.Optional(t.Boolean()),
}, { additionalProperties: false });

// Working-area maps (EPS admin). Create/replace come as multipart forms with the picture attached.
const pictureFile = t.File({ type: ["image/png", "image/jpeg", "image/webp"], maxSize: "12m" });
export const mapParams = t.Object({ projectId: uuid, id: uuid });
export const createMapBody = t.Object({ name: t.String({ minLength: 1, maxLength: 80 }), nameTh: t.String({ minLength: 1, maxLength: 80 }), file: pictureFile });
export const updateMapBody = t.Object({ name: t.Optional(t.String({ minLength: 1, maxLength: 80 })), nameTh: t.Optional(t.String({ minLength: 1, maxLength: 80 })), file: t.Optional(pictureFile) });
export const reorderMapsBody = t.Object({ ids: t.Array(uuid, { minItems: 1, maxItems: 50 }) }, { additionalProperties: false });

// Route sections (EPS): a named, coloured stretch drawn on a map.
export const sectionParams = t.Object({ projectId: uuid, id: uuid });
export const sectionBody = t.Object({
  mapId: t.Optional(uuid),
  code: t.String({ minLength: 1, maxLength: 20 }),
  work: t.String({ minLength: 1, maxLength: 300 }),
  color: t.String({ pattern: "^#[0-9A-Fa-f]{6}$" }),
  points: t.Array(point, { minItems: 2, maxItems: 500 }),
}, { additionalProperties: false });
