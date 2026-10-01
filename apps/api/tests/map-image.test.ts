import { describe, expect, it } from "bun:test";
import { validateMapImage } from "../src/modules/site-maps/site-map-image.service.js";

describe("Map View image upload validation", () => {
  it("accepts an actual PNG and determines its storage type independently from the filename", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlJkAAAAASUVORK5CYII=",
      "base64",
    );
    const image = await validateMapImage(new File([png], "untrusted-filename.svg", { type: "image/png" }));
    expect(image.contentType).toBe("image/png");
    expect(image.extension).toBe("png");
    expect(Buffer.from(image.body)).toEqual(png);
  });

  it("rejects a spoofed image MIME type and oversized uploads", async () => {
    const invalid = await validateMapImage(new File(["<svg>not a PNG</svg>"], "map.png", { type: "image/png" })).then(
      () => null,
      (error: Error) => error,
    );
    expect(invalid?.message).toContain("content");
    const large = await validateMapImage(
      new File([new Uint8Array(20 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
    ).then(
      () => null,
      (error: Error) => error,
    );
    expect(large?.message).toContain("20 MB");
  });
});
