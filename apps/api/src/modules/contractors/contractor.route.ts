import { Elysia } from "elysia";
import { normalizePagination } from "@sts/shared";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok, paginated } from "@/shared/http/response.js";
import {
  createContractorService,
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

// Reads are open like other modules; add/edit is EPS admin only. There is no delete:
// a company leaves by being deactivated, so its reports, map items and logins stay.
export const contractorRoutes = new Elysia({ prefix: "/contractors" })
  .get("/", async ({ query }) => {
    const p = normalizePagination(query as Record<string, unknown>);
    const { rows, total } = await listContractorsService({
      page: p.page,
      pageSize: p.pageSize,
      sort: p.sort,
      order: p.order,
      search: p.search,
      projectId: query.projectId,
    });
    return paginated(rows, p.page, p.pageSize, total);
  }, { query: listContractorsQuery })
  .get("/:id", async ({ params }) => ok(await getContractorService(params.id)), {
    params: contractorIdParams,
  })
  .use(requireAuth)
  .post("/", async ({ auth, body, set }) => {
    const created = await createContractorService(auth, body);
    set.status = 201;
    return ok(created);
  }, { body: createContractorBody })
  .patch("/:id", async ({ auth, params, body }) => ok(await updateContractorService(auth, params.id, body)), {
    params: contractorIdParams,
    body: updateContractorBody,
  });
