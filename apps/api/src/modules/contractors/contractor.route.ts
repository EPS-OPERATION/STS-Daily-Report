import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { normalizePagination } from "@sts/shared";
import { ok, paginated } from "@/shared/http/response.js";
import {
  createContractorService,
  deleteContractorService,
  getContractorService,
  listContractorsService,
  updateContractorService,
} from "./contractor.service.js";
import {
  contractorIdParams,
  createContractorBody,
  listContractorsQuery,
  updateContractorBody,
} from "./contractor.schema.js";

export const contractorRoutes = new Elysia({ prefix: "/contractors" })
  .use(requireAuth)
  .get(
    "/",
    async ({ query }) => {
      const p = normalizePagination(query as Record<string, unknown>);
      const { rows, total } = await listContractorsService({
        page: p.page,
        pageSize: p.pageSize,
        sort: p.sort,
        order: p.order,
        search: p.search,
      });
      return paginated(rows, p.page, p.pageSize, total);
    },
    { query: listContractorsQuery },
  )
  .get("/:id", async ({ params }) => ok(await getContractorService(params.id)), {
    params: contractorIdParams,
  })
  .post(
    "/",
    async ({ body, set }) => {
      const created = await createContractorService(body);
      set.status = 201;
      return ok(created);
    },
    { body: createContractorBody },
  )
  .patch("/:id", async ({ params, body }) => ok(await updateContractorService(params.id, body)), {
    params: contractorIdParams,
    body: updateContractorBody,
  })
  .delete(
    "/:id",
    async ({ params, set }) => {
      await deleteContractorService(params.id);
      set.status = 204;
      return null;
    },
    { params: contractorIdParams },
  );
