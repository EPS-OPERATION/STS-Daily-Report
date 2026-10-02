import { t } from "elysia";

export const projectIdParams = t.Object({ projectId: t.String({ format: "uuid" }) });

export const markerParams = t.Object({
  projectId: t.String({ format: "uuid" }),
  buildingId: t.String({ format: "uuid" }),
  view: t.Union([t.Literal("overview"), t.Literal("topview"), t.Literal("plan")]),
});

export const markerBody = t.Object({
  x: t.Number({ minimum: 0, maximum: 1 }),
  y: t.Number({ minimum: 0, maximum: 1 }),
});

export const buildingParams = t.Object({
  projectId: t.String({ format: "uuid" }),
  buildingId: t.String({ format: "uuid" }),
});

export const partParams = t.Object({
  projectId: t.String({ format: "uuid" }),
  partId: t.String({ format: "uuid" }),
});

export const partMarkerParams = t.Object({
  projectId: t.String({ format: "uuid" }),
  partId: t.String({ format: "uuid" }),
  view: t.Union([t.Literal("overview"), t.Literal("topview"), t.Literal("plan")]),
});

export const partBody = t.Object({
  code: t.String({ minLength: 1, maxLength: 20 }),
  name: t.String({ minLength: 1, maxLength: 120 }),
  status: t.Union([t.Literal("active"), t.Literal("inactive")]),
});
