import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { projectIdParams } from "@/shared/http/params.js";
import { ok } from "@/shared/http/response.js";
import { epsManpowerBody, epsManpowerQuery } from "./eps-manpower.schema.js";
import { getEpsManpowerService, saveEpsManpowerService } from "./eps-manpower.service.js";

// EPS owner-company manpower: not a contractor report, but it feeds the same manpower tables so
// EPS staff appear beside contractors in every manpower chart.
export const epsManpowerRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/projects/:projectId/eps-manpower",
    async ({ params, query, auth }) => ok(await getEpsManpowerService(auth, params.projectId, query.date)),
    { params: projectIdParams, query: epsManpowerQuery },
  )
  .put(
    "/projects/:projectId/eps-manpower",
    async ({ params, body, auth }) => ok(await saveEpsManpowerService(auth, params.projectId, body)),
    { params: projectIdParams, body: epsManpowerBody },
  );
