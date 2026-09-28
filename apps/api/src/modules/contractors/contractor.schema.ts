import { t } from "elysia";

export const contractorIdParams = t.Object({ id: t.String({ format: "uuid" }) });

export const listContractorsQuery = t.Object({
  page: t.Optional(t.String()),
  pageSize: t.Optional(t.String()),
  sort: t.Optional(t.String()),
  order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
  search: t.Optional(t.String()),
});

export const createContractorBody = t.Object({
  code: t.String({ minLength: 1, maxLength: 32 }),
  name: t.String({ minLength: 1, maxLength: 200 }),
});

export const updateContractorBody = t.Object({
  code: t.Optional(t.String({ minLength: 1, maxLength: 32 })),
  name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
});
