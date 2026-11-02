import { t } from "elysia";
import { DATE_RE } from "@/modules/site-activities/site-activity.schema.js";

const isoDate = t.String({ pattern: DATE_RE });

export const projectIdParams = t.Object({ projectId: t.String({ format: "uuid" }) });
export const droneIdParams = t.Object({ id: t.String({ format: "uuid" }) });
export const listQuery = t.Object({ from: t.Optional(isoDate), to: t.Optional(isoDate) });

export const uploadBody = t.Object({
  date: isoDate,
  title: t.String({ minLength: 1, maxLength: 200 }),
  description: t.Optional(t.String({ maxLength: 2000 })),
  capturedBy: t.Optional(t.String({ maxLength: 120 })),
  tags: t.Optional(t.String({ maxLength: 300 })),
  file: t.File({ type: "image", maxSize: "15m" }),
});
