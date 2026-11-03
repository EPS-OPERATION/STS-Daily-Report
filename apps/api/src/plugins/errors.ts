import type Elysia from "elysia";
import { reportUnexpectedError } from "@/observability/report-error.js";
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
        // A schema/validation failure is almost always a client/version mismatch, not something the user can fix by
        // reading it. Log the real reason (which field) so EPS/devs can see it in the platform logs, but never send
        // the raw validator output or the submitted body back — the user gets a plain, actionable message.
        console.warn(`[validation] ${request.method} ${path} :: ${String(maybe.message ?? "").replace(/\s+/g, " ").slice(0, 300)}`);
        set.status = 400;
        return {
          error: {
            code: "VALIDATION_ERROR",
            message: sensitive
              ? "Invalid request. Check the required fields and password length."
              : "ส่งข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้า (Ctrl+Shift+R) แล้วลองใหม่อีกครั้ง หากยังไม่สำเร็จโปรดแจ้ง EPS",
          },
        };
      }
      if (sensitive) {
        reportUnexpectedError(error, { method: request.method, path, sensitive: true });
        set.status = 500;
        return { error: { code: "INTERNAL_ERROR", message: "Internal server error" } };
      }
      const mapped = toErrorBody(error);
      if (mapped.status >= 500) reportUnexpectedError(error, { method: request.method, path, sensitive: false });
      set.status = mapped.status;
      return mapped.body;
    })
    .as("scoped");
}
