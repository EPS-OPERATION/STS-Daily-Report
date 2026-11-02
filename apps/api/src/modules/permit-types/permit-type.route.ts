import { Elysia, t } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import {
  createPermitTypeBody,
  permitTypeParams,
  projectIdParams,
  updatePermitTypeBody,
} from "./permit-type.schema.js";
import {
  createPermitTypeService,
  deletePermitTypeService,
  listPermitTypesService,
  updatePermitTypeService,
} from "./permit-type.service.js";

export const permitTypeRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/projects/:projectId/permit-types",
    async ({ params, query }) => {
      const includeInactive = query.includeInactive === "true";
      return ok(await listPermitTypesService(params.projectId, includeInactive));
    },
    {
      params: projectIdParams,
      query: t.Object({ includeInactive: t.Optional(t.String()) }),
    },
  )
  .post(
    "/projects/:projectId/permit-types",
    async ({ params, body, auth, set }) => {
      const result = await createPermitTypeService(auth, params.projectId, body);
      set.status = 201;
      return ok(result);
    },
    { params: projectIdParams, body: createPermitTypeBody },
  )
  .patch(
    "/projects/:projectId/permit-types/:id",
    async ({ params, body, auth }) => ok(await updatePermitTypeService(auth, params.projectId, params.id, body)),
    { params: permitTypeParams, body: updatePermitTypeBody },
  )
  .delete(
    "/projects/:projectId/permit-types/:id",
    async ({ params, auth, set }) => {
      await deletePermitTypeService(auth, params.projectId, params.id);
      set.status = 204;
      return null;
    },
    { params: permitTypeParams },
  );
