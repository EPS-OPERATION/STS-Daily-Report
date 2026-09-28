import { getEnv } from "@/config/env.js";
import { createMinioStorage } from "./minio-storage.js";
import type { StorageService } from "./storage.service.js";

export type { StorageService, UploadInput } from "./storage.service.js";

let storage: StorageService | null = null;

// TODO(auth): re-check bucket policies + signed-URL expiry once auth lands.
export function getStorage(): StorageService {
  if (!storage) storage = createMinioStorage(getEnv());
  return storage;
}
