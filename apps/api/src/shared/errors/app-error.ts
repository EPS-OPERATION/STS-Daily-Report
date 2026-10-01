export type ErrorCode =
  "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "AUTH_REQUIRED" | "FORBIDDEN" | "INVALID_LOGIN" | "INTERNAL_ERROR";

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

export class AuthRequiredError extends AppError {
  constructor(message = "Authentication required") {
    super("AUTH_REQUIRED", 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Site Configuration management permission is required") {
    super("FORBIDDEN", 403, message);
  }
}

export class InvalidLoginError extends AppError {
  // Generic on purpose: never reveal whether the email exists or is inactive.
  constructor(message = "Unable to sign in with this email.") {
    super("INVALID_LOGIN", 401, message);
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
  const databaseError = err as { code?: string; cause?: { code?: string } } | null;
  if ((databaseError?.code ?? databaseError?.cause?.code) === "23505") {
    return {
      status: 409,
      body: { error: { code: "CONFLICT", message: "A record with this key or code already exists." } },
    };
  }
  const message =
    process.env["NODE_ENV"] === "production" ? "Internal server error" : String((err as Error)?.message ?? err);
  return { status: 500, body: { error: { code: "INTERNAL_ERROR", message } } };
}
