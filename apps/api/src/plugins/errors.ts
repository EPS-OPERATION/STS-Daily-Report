import type Elysia from "elysia";
import { AppError, toErrorBody } from "@/shared/errors/app-error.js";

export function errorPlugin(app: Elysia<any, any, any, any, any, any>) {
  return app
    .onError(({ error, set, request }) => {
      // App errors carry their own status/code — honor them before generic handling.
      if (error instanceof AppError) {
        const mapped = toErrorBody(error);
        set.status = mapped.status;
        return mapped.body;
      }
      const maybe = error as { status?: number; message?: string; value?: unknown };
      const path = new URL(request.url).pathname;
      // Elysia validation errors can embed the submitted body, including credentials.
      const sensitive = path.startsWith("/api/v1/auth/") || path.startsWith("/api/v1/users");
      if (typeof maybe?.status === "number" && maybe.status >= 400 && maybe.status < 500) {
        set.status = 400;
        return {
          error: {
            code: "VALIDATION_ERROR",
            message: sensitive ? "Invalid request. Check the required fields and password length." : maybe.message ?? "Invalid request",
            ...(!sensitive && maybe.value !== undefined ? { details: maybe.value } : {}),
          },
        };
      }
      if (sensitive) {
        set.status = 500;
        return { error: { code: "INTERNAL_ERROR", message: "Internal server error" } };
      }
      const mapped = toErrorBody(error);
      set.status = mapped.status;
      return mapped.body;
    })
    .as("scoped");
}
