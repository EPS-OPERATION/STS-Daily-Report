import { t } from "elysia";
import { hhmm } from "@/shared/http/params.js";

// EPS settles a road booking's time (the service checks the role).
export const roadUsageParams = t.Object({ projectId: t.String({ format: "uuid" }), id: t.String({ format: "uuid" }) });

export const roadAdjustBody = t.Object({ startTime: hhmm, endTime: hhmm }, { additionalProperties: false });
