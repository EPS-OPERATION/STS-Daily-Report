import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { imageSize } from "../src/shared/image-size.js";

const site = (name: string) => new Uint8Array(readFileSync(new URL(`../../web/public/site-plan/${name}`, import.meta.url)));

describe("imageSize", () => {
  it("reads a real JPEG", () => {
    expect(imageSize(site("STS_33kV_Line.jpg"))).toEqual({ type: "jpeg", width: 1532, height: 1125 });
  });
  it("reads a real PNG", () => {
    expect(imageSize(site("STS_KY_Layout_Plan.png"))).toEqual({ type: "png", width: 6542, height: 4951 });
  });
  it("reads a real WebP (lossy VP8)", () => {
    const size = imageSize(site("STS_KY_Layout_Plan.preview.webp"));
    expect(size?.type).toBe("webp");
    expect(size!.width).toBeGreaterThan(1000);
    expect(Math.abs(size!.width / size!.height - 6542 / 4951)).toBeLessThan(0.01);
  });
  it("reads VP8X and lossless WebP headers", () => {
    const vp8x = new Uint8Array(32);
    vp8x.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58]);
    vp8x.set([0x1f, 0x03, 0x00], 24); // width - 1 = 799
    vp8x.set([0x57, 0x02, 0x00], 27); // height - 1 = 599
    expect(imageSize(vp8x)).toEqual({ type: "webp", width: 800, height: 600 });
    const vp8l = new Uint8Array(32);
    vp8l.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c]);
    vp8l[20] = 0x2f;
    const bits = 799 | (599 << 14);
    vp8l.set([bits & 255, (bits >>> 8) & 255, (bits >>> 16) & 255, (bits >>> 24) & 255], 21);
    expect(imageSize(vp8l)).toEqual({ type: "webp", width: 800, height: 600 });
  });
  it("rejects other files", () => {
    expect(imageSize(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(imageSize(new Uint8Array(0))).toBeNull();
    expect(imageSize(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
  });
});
