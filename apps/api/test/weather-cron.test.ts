import { describe, expect, it } from "bun:test";
import { weatherConditionOf } from "@sts/shared";
import { msUntilNextRun } from "../src/modules/weather/weather.cron.js";

describe("hourly weather job", () => {
  it("runs at five past the hour (Bangkok = UTC+7, no DST)", () => {
    expect(msUntilNextRun(new Date("2026-10-17T08:00:00Z"))).toBe(5 * 60_000); // 15:00 → 15:05
    expect(msUntilNextRun(new Date("2026-10-17T08:05:00Z"))).toBe(60 * 60_000); // exactly 15:05 → 16:05
    expect(msUntilNextRun(new Date("2026-10-17T08:30:00Z"))).toBe(35 * 60_000); // 15:30 → 16:05
  });
});

describe("weather code → report choice", () => {
  it("maps storms, rain, wind and heat like the morning form", () => {
    expect(weatherConditionOf({ weatherCode: 95, windKmh: 5, temperatureC: 28 })).toBe("thunderstorm");
    expect(weatherConditionOf({ weatherCode: 61, windKmh: 5, temperatureC: 28 })).toBe("rain");
    expect(weatherConditionOf({ weatherCode: 3, windKmh: 30, temperatureC: 28 })).toBe("windy");
    expect(weatherConditionOf({ weatherCode: 2, windKmh: 5, temperatureC: 35 })).toBe("hot");
    expect(weatherConditionOf({ weatherCode: 3, windKmh: 5, temperatureC: 28 })).toBe("normal");
  });
});
