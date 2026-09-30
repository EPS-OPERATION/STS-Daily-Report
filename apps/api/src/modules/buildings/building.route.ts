import { Elysia } from "elysia";
import { ok } from "@/shared/http/response.js";
import { listBuildingsService } from "./building.service.js";
import { projectIdParams } from "./building.schema.js";

export const buildingRoutes = new Elysia().get(
  "/projects/:projectId/buildings",
  async ({ params }) => ok(await listBuildingsService(params.projectId)),
  { params: projectIdParams },
);
