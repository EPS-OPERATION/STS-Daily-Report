import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { morningBody } from "../src/modules/daily-reports/daily-report.schema.js";

// A cached older web bundle can send temperatureC / humidityPct as null for "not measured".
// The morning route must accept that (and still reject out-of-range numbers).
const app = new Elysia().post("/morning", ({ body }) => ({ ok: true, body }), { body: morningBody });

const base = {
  date: "2026-11-03",
  contractorId: "77777777-7777-4777-8777-777777777777",
  startTime: "08:00",
  endTime: "17:00",
  workHours: 8,
  weather: "normal",
  equipment: [],
  crews: [
    {
      discipline: "CE",
      positions: [{ position: "worker", headcount: 1 }],
      thaiMale: 1,
      thaiFemale: 0,
      foreignMale: 0,
      foreignFemale: 0,
      allocations: [{ buildingId: "cd9bf7cd-9f66-4c2f-91fb-d1fc17efc46d", headcount: 1, workDescription: "test" }],
    },
  ],
};

const post = (body: unknown) =>
  app.handle(new Request("http://test/morning", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("morning body: weather fields", () => {
  it("accepts null temperatureC and humidityPct (not measured)", async () => {
    const res = await post({ ...base, temperatureC: null, humidityPct: null });
    expect(res.status).toBe(200);
  });

  it("still accepts numbers and omitted values", async () => {
    expect((await post({ ...base, temperatureC: 31.5, humidityPct: 78 })).status).toBe(200);
    expect((await post(base)).status).toBe(200);
  });

  it("still rejects out-of-range values", async () => {
    expect((await post({ ...base, temperatureC: 99 })).status).toBe(422);
    expect((await post({ ...base, humidityPct: 120 })).status).toBe(422);
  });
});
