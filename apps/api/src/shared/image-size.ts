// Pixel size read from the file header of a PNG, JPEG or WebP, so an upload's real size is known without an
// image library (and a client cannot claim a different size than the file has). null = not one of those formats.
export interface ImageSize { width: number; height: number; type: "png" | "jpeg" | "webp" }

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));
const u16be = (b: Uint8Array, at: number) => (b[at]! << 8) | b[at + 1]!;
const u32be = (b: Uint8Array, at: number) => ((b[at]! << 24) | (b[at + 1]! << 16) | (b[at + 2]! << 8) | b[at + 3]!) >>> 0;
const u24le = (b: Uint8Array, at: number) => b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16);

function png(b: Uint8Array): ImageSize | null {
  if (b.length < 24 || b[0] !== 0x89 || ascii(b, 1, 3) !== "PNG" || ascii(b, 12, 4) !== "IHDR") return null;
  return { type: "png", width: u32be(b, 16), height: u32be(b, 20) };
}

function jpeg(b: Uint8Array): ImageSize | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let at = 2;
  while (at + 9 < b.length) {
    if (b[at] !== 0xff) { at++; continue; }
    const marker = b[at + 1]!;
    if (marker === 0xff) { at++; continue; }
    // Start-of-frame markers carry the size (C4, C8 and CC are not frames).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { type: "jpeg", height: u16be(b, at + 5), width: u16be(b, at + 7) };
    }
    // Markers without a length: standalone (RSTn, SOI, EOI, TEM).
    if ((marker >= 0xd0 && marker <= 0xd9) || marker === 0x01) { at += 2; continue; }
    at += 2 + u16be(b, at + 2);
  }
  return null;
}

function webp(b: Uint8Array): ImageSize | null {
  if (b.length < 30 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return null;
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8X") return { type: "webp", width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
  if (chunk === "VP8 ") return { type: "webp", width: (b[26]! | (b[27]! << 8)) & 0x3fff, height: (b[28]! | (b[29]! << 8)) & 0x3fff };
  if (chunk === "VP8L" && b[20] === 0x2f) {
    const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
    return { type: "webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  return null;
}

export function imageSize(bytes: Uint8Array): ImageSize | null {
  const size = png(bytes) ?? jpeg(bytes) ?? webp(bytes);
  return size && size.width > 0 && size.height > 0 ? size : null;
}
