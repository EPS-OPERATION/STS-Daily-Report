import { z } from "zod";

// Production builds default to the same origin (`/api/v1`: Vercel rewrite or the reverse proxy);
// only `vite dev` (mode development) falls back to the local API.
const DEFAULT_API_URL = import.meta.env.MODE === "development" ? "http://localhost:3000/api/v1" : "/api/v1";

const schema = z.object({
  VITE_API_URL: z.string().default(DEFAULT_API_URL),
  // Optional error reporting (Sentry-protocol DSN). Blank = off. A DSN is public by design (it can only submit events).
  VITE_SENTRY_DSN: z.string().default(""),
  VITE_SENTRY_ENVIRONMENT: z.string().default(""),
});

const parsed = schema.safeParse({
  VITE_API_URL: import.meta.env["VITE_API_URL"] || undefined,
  VITE_SENTRY_DSN: import.meta.env["VITE_SENTRY_DSN"] || undefined,
  VITE_SENTRY_ENVIRONMENT: import.meta.env["VITE_SENTRY_ENVIRONMENT"] || undefined,
});

if (!parsed.success) {
  console.error("Invalid web env", parsed.error.flatten().fieldErrors);
}

// Shown on the error screen so people know whom to call when something breaks.
export const SUPPORT_CONTACT = { tel: "092-5917878", email: "QAQCSystem01@scg.com" } as const;

export const config = {
  apiUrl: parsed.success ? parsed.data.VITE_API_URL : DEFAULT_API_URL,
  sentryDsn: parsed.success ? parsed.data.VITE_SENTRY_DSN : "",
  sentryEnvironment: parsed.success ? parsed.data.VITE_SENTRY_ENVIRONMENT : "",
};
