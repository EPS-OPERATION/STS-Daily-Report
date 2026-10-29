import { createHash } from "node:crypto";
import { clientIp } from "@/auth/client-ip.js";
import { getEnv } from "@/config/env.js";

// Integrity helpers for append-only edit histories (Electronic Transactions Act): a stable content hash of what was
// confirmed, and who/where it was saved from. Used by the safety statistics history.

/** Who saved, from where: the technical evidence kept with each version. */
export interface SaveMeta {
  ip: string | null;
  userAgent: string | null;
}

// Stable JSON (keys sorted, recursively) so the same content always gives the same hash.
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value instanceof Date ? value.toISOString() : value);
}

export const contentHash = (snapshot: unknown) => createHash("sha256").update(canonicalJson(snapshot), "utf8").digest("hex");

type Server = { requestIP(request: Request): { address: string } | null } | null | undefined;

/** IP + browser of a save, kept with the report version as technical evidence. */
export function requestMeta(request: Request, server: Server): SaveMeta {
  const ip = clientIp(request.headers, server?.requestIP(request)?.address, getEnv().TRUST_PROXY);
  return { ip: ip === "unknown" ? null : ip, userAgent: request.headers.get("user-agent") };
}
