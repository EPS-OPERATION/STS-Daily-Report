import { getDb } from "@/db/client.js";
import { NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { getStorage } from "@/shared/storage/index.js";
import { updateMapView } from "./site-map.repository.js";
import { mapViewDto, requireMapView } from "./site-map.service.js";

export async function validateMapImage(file: File) {
  if (!file.size || file.size > 20 * 1024 * 1024)
    throw new ValidationError("Image must be non-empty and no larger than 20 MB");
  const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension) throw new ValidationError("Use a PNG, JPEG or WebP image");
  const body = Buffer.from(await file.arrayBuffer());
  const valid =
    body.length >= 12 &&
    ((file.type === "image/png" && body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (file.type === "image/jpeg" && body[0] === 255 && body[1] === 216 && body[2] === 255) ||
      (file.type === "image/webp" &&
        body.toString("ascii", 0, 4) === "RIFF" &&
        body.toString("ascii", 8, 12) === "WEBP"));
  if (!valid) throw new ValidationError("Image content does not match its file type");
  return { body, contentType: file.type, extension };
}

export async function uploadMapViewImageService(viewId: string, file: File, width: number, height: number) {
  const view = await requireMapView(viewId);
  if (![width, height].every((value) => Number.isInteger(value) && value > 0 && value <= 30000)) {
    throw new ValidationError("Image dimensions must be positive integers no greater than 30000");
  }
  const image = await validateMapImage(file);
  const key = `projects/${view.projectId}/maps/${view.sitePlanId}/views/${view.id}/${crypto.randomUUID()}.${image.extension}`;
  const storage = getStorage();
  await storage.upload({ key, body: image.body, contentType: image.contentType });
  try {
    const updated = await updateMapView(getDb(), viewId, { imageObjectKey: key, legacyAssetUrl: null, width, height });
    if (!updated) throw new NotFoundError("Map View not found", { viewId });
    // Older images can still be referenced by legacy plans; retain them during migration.
    return await mapViewDto(updated);
  } catch (error) {
    // Remove only a newly uploaded object if the database did not accept its metadata.
    const saved = await requireMapView(viewId).catch(() => null);
    if (saved && saved.imageObjectKey !== key) await storage.remove(key).catch(() => undefined);
    throw error;
  }
}
