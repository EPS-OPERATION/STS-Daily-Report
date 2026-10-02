import { describe, expect, it } from "bun:test";
import type { ZonePartOption } from "../apps/web/src/features/site-maps/types/site-plan.types.js";

const editorPath = "../apps/web/src/features/zone-configuration/helpers/" + "zone-part-editor.js";
const zonePartEditor = await import(editorPath).catch(() => null);

const part: ZonePartOption = {
  id: "part-a",
  zoneId: "zone-1",
  code: "A",
  name: "Part A",
  displayColor: "#457B9D",
  mapX: 0.3,
  mapY: 0.4,
  sortOrder: 0,
  isActive: true,
};

describe("Zone Part editor marker", () => {
  it("round-trips an optional normalized marker through map space", () => {
    const toDrafts = zonePartEditor?.toZonePartDrafts;
    const toInputs = zonePartEditor?.toZonePartInputs;

    expect(toInputs).toBeDefined();
    const drafts = toDrafts([part], 1000, 500);
    expect(drafts[0].point).toEqual({ x: 300, y: 200 });
    expect(toInputs(drafts, 1000, 500)).toEqual([
      {
        id: "part-a",
        code: "A",
        name: "Part A",
        displayColor: "#457B9D",
        mapX: 0.3,
        mapY: 0.4,
        sortOrder: 0,
        isActive: true,
      },
    ]);
  });

  it("allows a valid Part with no marker", () => {
    const toInputs = zonePartEditor?.toZonePartInputs;
    expect(toInputs).toBeDefined();
    expect(
      toInputs(
        [
          {
            key: "new:0",
            id: null,
            code: "A",
            name: "Part A",
            displayColor: "#457B9D",
            point: null,
            sortOrder: 0,
            isActive: true,
          },
        ],
        1000,
        500,
      ),
    ).toEqual([
      { code: "A", name: "Part A", displayColor: "#457B9D", mapX: null, mapY: null, sortOrder: 0, isActive: true },
    ]);
  });

  it("detects changes to labels, colors, active state, and marker position", () => {
    const toDrafts = zonePartEditor?.toZonePartDrafts;
    const hasChanges = zonePartEditor?.hasZonePartDraftChanges as
      ((drafts: unknown[], original: ZonePartOption[], mapW: number, mapH: number) => boolean) | undefined;
    expect(hasChanges).toBeDefined();
    const drafts = toDrafts([part], 1000, 500);

    expect(hasChanges?.(drafts, [part], 1000, 500)).toBe(false);
    expect(hasChanges?.([{ ...drafts[0], name: "Changed name" }], [part], 1000, 500)).toBe(true);
    expect(hasChanges?.([{ ...drafts[0], isActive: false }], [part], 1000, 500)).toBe(true);
    expect(hasChanges?.([{ ...drafts[0], point: { x: 400, y: 200 } }], [part], 1000, 500)).toBe(true);
  });
});
