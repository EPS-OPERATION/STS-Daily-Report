import { getEnv } from "@/config/env.js";
import { createMinioStorage } from "./minio-storage.js";
import type { StorageService } from "./storage.service.js";

export type { StorageService, UploadInput } from "./storage.service.js";

let storage: StorageService | null = null;

// Callers mint short-lived read URLs only after authenticating the request.
export function getStorage(): StorageService {
  if (!storage) storage = createMinioStorage(getEnv());
  return storage;
}
