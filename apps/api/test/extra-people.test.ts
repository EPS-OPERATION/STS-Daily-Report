import { describe, expect, it } from "bun:test";
import { extraPeopleToPlace } from "@sts/shared";

describe("people who came after the morning report", () => {
  it("asks for the difference when the afternoon crew is larger", () => {
    expect(extraPeopleToPlace({ CE: 20 }, { CE: 23 }, {})).toEqual([
      { discipline: "CE", morning: 20, afternoon: 23, extra: 3, placed: 0, missing: 3, noMorning: false },
    ]);
  });

  it("is satisfied once the extra-work rows hold at least the difference", () => {
    expect(extraPeopleToPlace({ CE: 20 }, { CE: 23 }, { CE: 3 })[0]!.missing).toBe(0);
    expect(extraPeopleToPlace({ CE: 20 }, { CE: 23 }, { CE: 5 })[0]!.missing).toBe(0);
  });

  it("asks nothing when the afternoon crew is the same or smaller", () => {
    expect(extraPeopleToPlace({ CE: 20 }, { CE: 20 }, {})).toEqual([]);
    expect(extraPeopleToPlace({ CE: 20 }, { CE: 16 }, {})).toEqual([]);
  });

  it("checks each discipline on its own; a discipline missing in the morning is all extra", () => {
    const r = extraPeopleToPlace({ CE: 20 }, { CE: 20, ME: 4 }, { CE: 2 });
    expect(r).toEqual([{ discipline: "ME", morning: 0, afternoon: 4, extra: 4, placed: 0, missing: 4, noMorning: false }]);
  });

  it("without a morning report, asks for every afternoon person", () => {
    expect(extraPeopleToPlace(null, { CE: 12 }, {})).toEqual([
      { discipline: "CE", morning: 0, afternoon: 12, extra: 12, placed: 0, missing: 12, noMorning: true },
    ]);
    expect(extraPeopleToPlace(null, { CE: 12 }, { CE: 12 })[0]!.missing).toBe(0);
  });
});
