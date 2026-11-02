import { describe, expect, it } from "bun:test";
import { compareReportedWeather, type WeatherHour } from "@sts/shared";

// One Bangkok day (2026-10-16) of recorded hours; rain mm per local hour as given.
function day(rainByHour: Record<number, number> = {}, base: Partial<WeatherHour> = {}): WeatherHour[] {
  return Array.from({ length: 24 }, (_, h) => ({
    hour: new Date(Date.UTC(2026, 9, 15, 17 + h)).toISOString(), // 00:00 Bangkok = 17:00 UTC the day before
    temperatureC: 29,
    humidityPct: 80,
    precipitationMm: rainByHour[h] ?? 0,
    windKmh: 5,
    gustKmh: 15,
    weatherCode: rainByHour[h] ? 61 : 2,
    source: "open-meteo",
    ...base,
  }));
}
const report = (weather: "rain" | "normal" | "hot" | "windy" | "thunderstorm", temperatureC: number | null = 29, humidityPct: number | null = 80) => ({
  weather,
  temperatureC,
  humidityPct,
  startTime: "08:00",
  endTime: "17:00",
});

describe("reported vs recorded weather", () => {
  it("matches a dry report on a dry day", () => {
    expect(compareReportedWeather(report("normal"), day()).verdict).toBe("match");
  });

  it("flags 'normal' when it rained in the morning", () => {
    const r = compareReportedWeather(report("normal"), day({ 9: 1.5, 10: 2 }));
    expect(r.verdict).toBe("mismatch");
    expect(r.recorded?.morning.rainMm).toBe(3.5);
    expect(r.recorded?.morning.rainSpan).toBe("09:00–11:00");
  });

  it("does not hold afternoon rain against a morning report (shown as information)", () => {
    const r = compareReportedWeather(report("normal"), day({ 13: 1.5, 14: 2 }));
    expect(r.verdict).toBe("match");
    expect(r.recorded?.rainMm).toBe(3.5);
    expect(r.checks.some((c) => c.message.includes("ช่วงบ่ายมีฝน 3.5 mm"))).toBe(true);
  });

  it("flags 'rain' when no rain fell during work", () => {
    expect(compareReportedWeather(report("rain"), day({ 2: 5 })).verdict).toBe("mismatch"); // night rain only
  });

  it("matches 'rain' on a rainy morning; afternoon-only rain is a warning", () => {
    expect(compareReportedWeather(report("rain"), day({ 9: 1 })).verdict).toBe("match");
    expect(compareReportedWeather(report("rain"), day({ 15: 1 })).verdict).toBe("partial");
  });

  it("warns on temperature far from the start hour", () => {
    const r = compareReportedWeather(report("normal", 36), day());
    expect(r.verdict).toBe("partial");
    expect(r.checks.find((c) => c.field === "temperature")?.level).toBe("warn");
  });

  it("has nothing to judge without recorded hours or a report", () => {
    expect(compareReportedWeather(report("normal"), []).verdict).toBe("no_data");
    expect(compareReportedWeather({ weather: null, temperatureC: null, humidityPct: null, startTime: null, endTime: null }, day()).verdict).toBe("not_reported");
  });
});
