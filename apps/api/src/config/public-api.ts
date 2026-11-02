import { API_PREFIX } from "./constants.js";

// Routes reachable without a session in production. The weather sync route is here because it
// authenticates itself with the CRON_SECRET bearer (and answers 404 when that secret is unset).
const PUBLIC_API = new Set([
  `POST ${API_PREFIX}/auth/login`, `GET ${API_PREFIX}/auth/config`, `POST ${API_PREFIX}/auth/logout`,
  `POST ${API_PREFIX}/auth/register`, `POST ${API_PREFIX}/auth/reset-password`, `GET ${API_PREFIX}/auth/registration-options`, `GET ${API_PREFIX}/auth/registration-projects`,
  `POST ${API_PREFIX}/internal/weather/sync`,
]);

export function isPublicApi(method: string, path: string): boolean {
  return PUBLIC_API.has(`${method} ${path.replace(/\/$/, "")}`);
}
