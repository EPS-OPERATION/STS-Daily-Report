import type Elysia from "elysia";
import { AppError, toErrorBody } from "@/shared/errors/app-error.js";

export function errorPlugin(app: Elysia<any, any, any, any, any, any>) {
  return app
    .onError(({ error, set }) => {
      // App errors carry their own status/code — honor them before generic handling.
      if (error instanceof AppError) {
        const mapped = toErrorBody(error);
        set.status = mapped.status;
        return mapped.body;
      }
      const maybe = error as { status?: number; message?: string; value?: unknown };
      if (typeof maybe?.status === "number" && maybe.status >= 400 && maybe.status < 500) {
        set.status = 400;
        return {
          error: {
            code: "VALIDATION_ERROR",
            message: maybe.message ?? "Invalid request",
            ...(maybe.value !== undefined ? { details: maybe.value } : {}),
          },
        };
      }
      const mapped = toErrorBody(error);
      set.status = mapped.status;
      return mapped.body;
    })
    .as("scoped");
}
