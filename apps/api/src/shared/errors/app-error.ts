export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request", details?: unknown) {
    super("VALIDATION_ERROR", 400, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", details?: unknown) {
    super("NOT_FOUND", 404, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super("CONFLICT", 409, message, details);
  }
}

export function toErrorBody(err: unknown): {
  status: number;
  body: { error: { code: string; message: string; details?: unknown } };
} {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        error: { code: err.code, message: err.message, ...(err.details !== undefined ? { details: err.details } : {}) },
      },
    };
  }
  if (err instanceof Error && err.name === "ValidationError") {
    return { status: 400, body: { error: { code: "VALIDATION_ERROR", message: err.message } } };
  }
  const message = process.env["NODE_ENV"] === "production" ? "Internal server error" : String((err as Error)?.message ?? err);
  return { status: 500, body: { error: { code: "INTERNAL_ERROR", message } } };
}
