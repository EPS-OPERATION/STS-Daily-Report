import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import { mergeStandardItemsBody, projectIdParams, standardItemListQuery, standardItemParams } from "./report-standard-item.schema.js";
import { deleteStandardItemService, listStandardItemsService, mergeStandardItemsService } from "./report-standard-item.service.js";

export const reportStandardItemRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/projects/:projectId/report-standard-items",
    async ({ params, query, auth }) => ok(await listStandardItemsService(auth, params.projectId, query.contractorId)),
    { params: projectIdParams, query: standardItemListQuery },
  )
  .post(
    "/projects/:projectId/report-standard-items",
    async ({ params, body, auth }) => ok(await mergeStandardItemsService(auth, params.projectId, body)),
    { params: projectIdParams, body: mergeStandardItemsBody },
  )
  .delete(
    "/projects/:projectId/report-standard-items/:id",
    async ({ params, auth, set }) => {
      await deleteStandardItemService(auth, params.projectId, params.id);
      set.status = 204;
      return null;
    },
    { params: standardItemParams },
  );
