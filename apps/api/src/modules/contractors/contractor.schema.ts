import { t } from "elysia";

export const contractorIdParams = t.Object({ id: t.String({ format: "uuid" }) });

export const listContractorsQuery = t.Object({
  page: t.Optional(t.String()),
  pageSize: t.Optional(t.String()),
  sort: t.Optional(t.String()),
  order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
  search: t.Optional(t.String()),
  projectId: t.Optional(t.String({ format: "uuid" })),
});

const hexColor = t.String({ pattern: "^#[0-9A-Fa-f]{6}$" });
const contactName = t.Union([t.String({ maxLength: 120 }), t.Null()]);
const contactPhone = t.Union([t.String({ maxLength: 40 }), t.Null()]);

export const createContractorBody = t.Object({
  code: t.String({ minLength: 1, maxLength: 32 }),
  name: t.String({ minLength: 1, maxLength: 200 }),
  contactName: t.Optional(contactName),
  contactPhone: t.Optional(contactPhone),
  projectId: t.String({ format: "uuid" }),
  color: t.Optional(hexColor),
});

export const updateContractorBody = t.Object({
  code: t.Optional(t.String({ minLength: 1, maxLength: 32 })),
  name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  contactName: t.Optional(contactName),
  contactPhone: t.Optional(contactPhone),
  active: t.Optional(t.Boolean()),
  projectId: t.Optional(t.String({ format: "uuid" })),
  color: t.Optional(hexColor),
});
