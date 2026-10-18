import { t } from "elysia";

const uuid = t.String({ format: "uuid" });

export const projectIdParams = t.Object({ projectId: uuid });
export const permitTypeParams = t.Object({ projectId: uuid, id: uuid });

export const createPermitTypeBody = t.Object({
  code: t.String({ minLength: 1, maxLength: 50 }),
  label: t.String({ minLength: 1, maxLength: 100 }),
  labelTh: t.String({ minLength: 1, maxLength: 100 }),
  iconKey: t.Optional(t.String({ maxLength: 50 })),
  sortOrder: t.Optional(t.Integer({ minimum: 0, maximum: 9999 })),
  isActive: t.Optional(t.Boolean()),
});

export const updatePermitTypeBody = t.Object({
  label: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  labelTh: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  iconKey: t.Optional(t.String({ maxLength: 50 })),
  sortOrder: t.Optional(t.Integer({ minimum: 0, maximum: 9999 })),
  isActive: t.Optional(t.Boolean()),
});
