/**
 * Client-side image compression utility.
 * Optimizes photos taken by phones/cameras on construction sites before uploading over poor 3G/4G network.
 * - Resizes large dimensions down to maximum dimension (default 1600px) while maintaining aspect ratio.
 * - Compresses to JPEG (default quality 0.8) to reduce payload size by ~85-95% (e.g. 10MB -> ~200KB).
 * - Leaves small files or non-image files untouched.
 */

export interface CompressOptions {
  /** Maximum width or height in pixels. Default: 1600 */
  maxDimension?: number;
  /** JPEG quality 0.0 - 1.0. Default: 0.8 */
  quality?: number;
  /** Files smaller than this size (bytes) won't be recompressed. Default: 256KB */
  maxSizeBytes?: number;
}

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const { maxDimension = 1600, quality = 0.8, maxSizeBytes = 256 * 1024 } = options;

  // Only compress images, skip svg/gifs/documents or already small photos
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // Maintain aspect ratio while bounding inside maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file); // fallback to original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // If compression didn't actually reduce size, keep original
            resolve(file);
            return;
          }

          const newName = file.name.replace(/\.[^.]+$/, ".jpg");
          const compressed = new File([blob], newName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fallback to original on load error
    };

    img.src = objectUrl;
  });
}
