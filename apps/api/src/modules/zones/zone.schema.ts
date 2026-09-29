import { t } from "elysia";

export const projectIdParams = t.Object({ projectId: t.String({ format: "uuid" }) });

export const listZonesQuery = t.Object({
  status: t.Optional(t.Union([t.Literal("active"), t.Literal("inactive"), t.Literal("all")])),
});
