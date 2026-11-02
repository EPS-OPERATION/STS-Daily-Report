import type { ApiEnv } from "@sts/env";
import type { StorageService, UploadInput } from "./storage.service.js";

// Supabase Storage over its REST API (no SDK). Server-side only: uses the
// service-role key, so the bucket can stay private and reads go through signed URLs.
export function createSupabaseStorage(env: ApiEnv): StorageService {
  const base = `${env.SUPABASE_URL!.replace(/\/$/, "")}/storage/v1`;
  const bucket = env.STORAGE_BUCKET;
  const auth = { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY! };
  const path = (key: string) => key.split("/").map(encodeURIComponent).join("/");

  const check = async (res: Response, what: string) => {
    if (!res.ok) throw new Error(`Supabase storage ${what} failed: ${res.status} ${await res.text()}`);
    return res;
  };

  return {
    async upload(input: UploadInput) {
      await check(
        await fetch(`${base}/object/${bucket}/${path(input.key)}`, {
          method: "POST",
          headers: { ...auth, "Content-Type": input.contentType ?? "application/octet-stream", "x-upsert": "true" },
          body: input.body,
        }),
        "upload",
      );
      return { key: input.key };
    },
    async remove(key: string) {
      await check(
        await fetch(`${base}/object/${bucket}`, {
          method: "DELETE",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({ prefixes: [key] }),
        }),
        "remove",
      );
    },
    async getPresignedUrl(key: string, expiresSeconds = 3600) {
      const res = await check(
        await fetch(`${base}/object/sign/${bucket}/${path(key)}`, {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({ expiresIn: expiresSeconds }),
        }),
        "sign",
      );
      const { signedURL } = (await res.json()) as { signedURL: string };
      return `${base}${signedURL}`;
    },
  };
}
