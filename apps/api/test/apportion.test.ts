import { describe, expect, it } from "bun:test";
import { apportion } from "@sts/shared";

describe("sharing a crew across buildings in whole people", () => {
  it("always adds up to the crew", () => {
    for (const [total, weights] of [
      [10, [5.5, 4.5]],
      [7, [1, 1, 1]],
      [26, [3.3, 8.1, 0.4, 12.2]],
      [1, [0.3, 0.3, 0.4]],
    ] as [number, number[]][]) {
      expect(apportion(total, weights).reduce((s, n) => s + n, 0)).toBe(total);
    }
  });

  it("gives the bigger share the extra person", () => {
    expect(apportion(10, [6, 4])).toEqual([6, 4]);
    expect(apportion(10, [5.6, 4.4])).toEqual([6, 4]);
    expect(apportion(3, [2, 1])).toEqual([2, 1]);
  });

  it("breaks an exact tie towards the larger weight, then the earlier place", () => {
    expect(apportion(1, [1, 1])).toEqual([1, 0]);
    expect(apportion(1, [1, 3, 3])).toEqual([0, 1, 0]);
  });

  it("returns zeros when there is nobody or no time to share", () => {
    expect(apportion(0, [1, 2])).toEqual([0, 0]);
    expect(apportion(5, [0, 0])).toEqual([0, 0]);
  });
});
