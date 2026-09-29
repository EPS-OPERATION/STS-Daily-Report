import { Elysia, t } from "elysia";
import { getDb } from "@/db/client.js";
import { ok } from "@/shared/http/response.js";
import { listProjectContractors, listProjects } from "./project.repository.js";

export const projectRoutes = new Elysia()
  .get("/projects", async () => ok(await listProjects(getDb())))
  .get("/projects/:projectId/contractors", async ({ params }) => ok(await listProjectContractors(getDb(), params.projectId)), {
    params: t.Object({ projectId: t.String({ format: "uuid" }) }),
  });
