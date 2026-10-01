import { t } from "elysia";

export const projectParams = t.Object({ projectId: t.String({ format: "uuid" }) });
export const projectListQuery = t.Object({
  status: t.Optional(t.Union([t.Literal("active"), t.Literal("inactive"), t.Literal("all")])),
});
export const createProjectBody = t.Object({
  code: t.String({ minLength: 1, maxLength: 50 }),
  name: t.String({ minLength: 1, maxLength: 200 }),
  description: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
  status: t.Optional(t.Union([t.Literal("active"), t.Literal("inactive")])),
});
export const updateProjectBody = t.Partial(createProjectBody);
export const assignContractorsBody = t.Object({
  contractorIds: t.Array(t.String({ format: "uuid" }), { maxItems: 500 }),
});
