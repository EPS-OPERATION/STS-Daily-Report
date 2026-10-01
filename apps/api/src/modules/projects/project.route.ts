import { Elysia } from "elysia";
import { ok } from "@/shared/http/response.js";
import { requireAuth } from "@/middleware/require-auth.js";
import { requireSiteConfiguration } from "@/middleware/require-site-configuration.js";
import {
  assignProjectContractorsService,
  createProjectService,
  getProjectService,
  listProjectContractorsService,
  listProjectsService,
  updateProjectService,
} from "./project.service.js";
import {
  assignContractorsBody,
  createProjectBody,
  projectListQuery,
  projectParams,
  updateProjectBody,
} from "./project.schema.js";

export const projectRoutes = new Elysia()
  .use(requireAuth)
  .get("/projects", async ({ query }) => ok(await listProjectsService(query.status)), { query: projectListQuery })
  .post(
    "/projects",
    async ({ body, set }) => {
      set.status = 201;
      return ok(await createProjectService(body));
    },
    { body: createProjectBody, beforeHandle: requireSiteConfiguration },
  )
  .get("/projects/:projectId", async ({ params }) => ok(await getProjectService(params.projectId)), {
    params: projectParams,
  })
  .patch("/projects/:projectId", async ({ params, body }) => ok(await updateProjectService(params.projectId, body)), {
    params: projectParams,
    body: updateProjectBody,
    beforeHandle: requireSiteConfiguration,
  })
  .get(
    "/projects/:projectId/contractors",
    async ({ params }) => ok(await listProjectContractorsService(params.projectId)),
    { params: projectParams },
  )
  .put(
    "/projects/:projectId/contractors",
    async ({ params, body }) => ok(await assignProjectContractorsService(params.projectId, body.contractorIds)),
    { params: projectParams, body: assignContractorsBody, beforeHandle: requireSiteConfiguration },
  );
