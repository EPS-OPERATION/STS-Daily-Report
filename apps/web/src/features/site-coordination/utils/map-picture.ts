import { COORDINATION_MAP_MAX_SIDE } from "@sts/shared";

/** What the server accepts as an upload (it re-checks the real size from the file itself). */
export const MAP_PICTURE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAP_PICTURE_MAX_BYTES = 12 * 1024 * 1024;

export interface MapPicture {
  file: File;
  width: number;
  height: number;
  /** The picture was shrunk or re-encoded from the one picked. */
  resized: boolean;
}

const load = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new window.Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("The picture could not be read"));
  image.src = url;
});

/** Longest side after fitting a picture into the limit (never enlarges). */
export const fitSide = (width: number, height: number, max = COORDINATION_MAP_MAX_SIDE) => {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

// Phones decode a map into memory at full pixel size (a 6500px drawing is ~130 MB), so a big picture is shrunk
// in the browser before it is sent: the limit is the longest side. A picture that is already small enough and
// within the size limit is sent untouched.
export async function prepareMapPicture(picked: File): Promise<MapPicture> {
  if (!(MAP_PICTURE_TYPES as readonly string[]).includes(picked.type)) throw new Error("Use a PNG, JPG or WebP picture");
  const url = URL.createObjectURL(picked);
  try {
    const image = await load(url);
    const { naturalWidth: width, naturalHeight: height } = image;
    const target = fitSide(width, height);
    if (target.width === width && picked.size <= MAP_PICTURE_MAX_BYTES) return { file: picked, width, height, resized: false };
    const canvas = document.createElement("canvas");
    canvas.width = target.width; canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot resize the picture");
    // A transparent PNG would turn black as a JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) throw new Error("This browser cannot resize the picture");
    if (blob.size > MAP_PICTURE_MAX_BYTES) throw new Error("The picture is still larger than 12 MB after resizing — use a simpler picture");
    const name = `${picked.name.replace(/\.[^.]+$/, "") || "map"}.jpg`;
    return { file: new File([blob], name, { type: "image/jpeg" }), width: target.width, height: target.height, resized: true };
  } finally {
    URL.revokeObjectURL(url);
  }
}
