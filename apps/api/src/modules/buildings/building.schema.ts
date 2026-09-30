import { t } from "elysia";

export const projectIdParams = t.Object({ projectId: t.String({ format: "uuid" }) });
