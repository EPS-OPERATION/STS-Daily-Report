import { t } from "elysia";
import { PERMIT_TYPE_CODES, STANDARD_ITEM_KINDS } from "@sts/shared";

const uuid = t.String({ format: "uuid" });

export const projectIdParams = t.Object({ projectId: uuid });
export const standardItemParams = t.Object({ projectId: uuid, id: uuid });
export const standardItemListQuery = t.Object({ contractorId: uuid });

const standardItemInput = t.Object({
  kind: t.Union(STANDARD_ITEM_KINDS.map((k) => t.Literal(k))),
  label: t.String({ maxLength: 200 }),
  buildingId: t.Optional(uuid),
  defaultCount: t.Integer({ minimum: 1, maximum: 500 }),
  permitType: t.Optional(t.Union(PERMIT_TYPE_CODES.map((c) => t.Literal(c)))),
  highRisk: t.Optional(t.Boolean()),
  taskName: t.Optional(t.String({ maxLength: 120 })),
  supervisorName: t.Optional(t.String({ maxLength: 120 })),
});

export const mergeStandardItemsBody = t.Object({
  contractorId: uuid,
  items: t.Array(standardItemInput, { minItems: 1, maxItems: 100 }),
});
