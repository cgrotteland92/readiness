import { recoveryDaySchema } from "@readiness/shared";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../app.ts";
import { db, sql } from "../db/client.ts";
import { recoveryDays } from "../db/schema.ts";
import { manualSource } from "../recovery/manual-source.ts";
import { resetDb } from "../test/reset-db.ts";

const fullDay = {
  date: "2026-11-01",
  hrv: 62.5,
  restingHr: 48,
  sleepHours: 7.5,
  feeling: 4,
};

function post(body: unknown) {
  return app.request("/recovery-days", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function insertImportedDay(date: string) {
  return db
    .insert(recoveryDays)
    .values({ date, source: "fit_import", hrv: 99 });
}

beforeEach(resetDb);

afterAll(async () => {
  await sql.end();
});

describe("POST /recovery-days", () => {
  it("logs a day as manual data", async () => {
    const res = await post(fullDay);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(recoveryDaySchema.safeParse(body).success).toBe(true);
    expect(body).toEqual({ ...fullDay, source: "manual" });
  });

  it("ignores a source sent by the client", async () => {
    const res = await post({ ...fullDay, source: "fit_import" });

    expect((await res.json()).source).toBe("manual");
  });

  it("leaves missing values out instead of filling them in", async () => {
    const res = await post({ date: "2026-11-01", feeling: 2 });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      date: "2026-11-01",
      feeling: 2,
      source: "manual",
    });
  });

  it("keeps a sleep value of zero", async () => {
    const res = await post({ date: "2026-11-01", sleepHours: 0 });

    expect(res.status).toBe(201);
    expect((await res.json()).sleepHours).toBe(0);
  });

  it.each([
    ["a day with no values", { date: "2026-11-01" }],
    ["a missing date", { hrv: 60 }],
    ["an impossible date", { ...fullDay, date: "2026-02-30" }],
    ["zero hrv", { ...fullDay, hrv: 0 }],
    ["hrv too large for the column", { ...fullDay, hrv: 10_000 }],
    ["fractional resting heart rate", { ...fullDay, restingHr: 48.5 }],
    ["sleep above 24 hours", { ...fullDay, sleepHours: 25 }],
    ["negative sleep", { ...fullDay, sleepHours: -1 }],
    ["feeling above 5", { ...fullDay, feeling: 6 }],
    ["feeling below 1", { ...fullDay, feeling: 0 }],
    ["malformed JSON", "{not json"],
  ])("returns 400 for %s and saves nothing", async (_label, body) => {
    const res = await post(body);

    expect(res.status).toBe(400);
    expect(await db.select().from(recoveryDays)).toEqual([]);
  });

  it("returns 409 if the date is already logged", async () => {
    await post(fullDay);
    const res = await post({ ...fullDay, feeling: 1 });

    expect(res.status).toBe(409);
    const stored = await (
      await app.request("/recovery-days/2026-11-01")
    ).json();
    expect(stored.feeling).toBe(fullDay.feeling);
  });

  it("can log a date that already has data from another source", async () => {
    await insertImportedDay("2026-11-01");

    const res = await post(fullDay);

    expect(res.status).toBe(201);
  });
});

describe("GET /recovery-days", () => {
  it("returns the range in date order, including both ends", async () => {
    await post({ ...fullDay, date: "2026-11-03" });
    await post({ ...fullDay, date: "2026-11-01" });
    await post({ ...fullDay, date: "2026-11-02" });
    await post({ ...fullDay, date: "2026-11-04" });

    const res = await app.request(
      "/recovery-days?from=2026-11-01&to=2026-11-03"
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.map((d: { date: string }) => d.date)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
  });

  it("returns an empty list when the range has no data", async () => {
    const res = await app.request(
      "/recovery-days?from=2026-11-01&to=2026-11-03"
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it.each([
    ["no range", ""],
    ["a missing end", "?from=2026-11-01"],
    ["an impossible date", "?from=2026-02-30&to=2026-03-01"],
    ["a reversed range", "?from=2026-11-03&to=2026-11-01"],
  ])("returns 400 for %s", async (_label, query) => {
    const res = await app.request(`/recovery-days${query}`);

    expect(res.status).toBe(400);
  });
});

describe("GET /recovery-days/:date", () => {
  it("returns the logged day", async () => {
    await post(fullDay);

    const res = await app.request("/recovery-days/2026-11-01");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ...fullDay, source: "manual" });
  });

  it("returns 404 for a date with no data", async () => {
    const res = await app.request("/recovery-days/2026-11-01");

    expect(res.status).toBe(404);
  });

  it("returns 400 for an invalid date", async () => {
    const res = await app.request("/recovery-days/2026-02-30");

    expect(res.status).toBe(400);
  });
});

describe("PUT /recovery-days/:date", () => {
  function put(date: string, body: unknown) {
    return app.request(`/recovery-days/${date}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("corrects a logged day", async () => {
    await post(fullDay);

    const res = await put("2026-11-01", { hrv: 55, feeling: 2 });

    expect(res.status).toBe(200);
    const stored = await manualSource.getDay("2026-11-01");
    expect(stored).toMatchObject({ hrv: 55, feeling: 2 });
    expect(await res.json()).toEqual({
      date: "2026-11-01",
      hrv: 55,
      feeling: 2,
      source: "manual",
    });
  });

  it("clears values that are left out instead of keeping them", async () => {
    await post(fullDay);

    await put("2026-11-01", { feeling: 3 });

    const stored = await manualSource.getDay("2026-11-01");
    expect(stored?.hrv).toBeUndefined();
    expect(stored?.sleepHours).toBeUndefined();
  });

  it("uses the date in the URL, not one in the body", async () => {
    await post(fullDay);

    const res = await put("2026-11-01", { date: "2026-12-24", feeling: 3 });

    expect((await res.json()).date).toBe("2026-11-01");
    expect(await manualSource.getDay("2026-12-24")).toBeNull();
  });

  it("does not change other days", async () => {
    await post(fullDay);
    await post({ ...fullDay, date: "2026-11-02" });

    await put("2026-11-01", { feeling: 1 });

    const other = await manualSource.getDay("2026-11-02");
    expect(other?.feeling).toBe(fullDay.feeling);
  });

  it("does not change imported data for the same date", async () => {
    await insertImportedDay("2026-11-01");
    await post(fullDay);

    await put("2026-11-01", { hrv: 55 });

    const rows = await db.select().from(recoveryDays);
    const imported = rows.find((row) => row.source === "fit_import");
    expect(imported?.hrv).toBe(99);
  });

  it("returns 404 when only imported data exists for the date", async () => {
    await insertImportedDay("2026-11-01");

    const res = await put("2026-11-01", { hrv: 55 });

    expect(res.status).toBe(404);
    const [imported] = await db.select().from(recoveryDays);
    expect(imported.hrv).toBe(99);
  });

  it("returns 400 for an invalid date", async () => {
    const res = await put("2026-02-30", { feeling: 3 });

    expect(res.status).toBe(400);
  });

  it.each([
    ["no values", {}],
    ["feeling above 5", { feeling: 6 }],
    ["hrv too large for the column", { hrv: 10_000 }],
    ["malformed JSON", "{not json"],
  ])("returns 400 for %s and changes nothing", async (_label, body) => {
    await post(fullDay);

    const res = await put("2026-11-01", body);

    expect(res.status).toBe(400);
    const stored = await manualSource.getDay("2026-11-01");
    expect(stored?.hrv).toBe(fullDay.hrv);
  });
});

describe("DELETE /recovery-days/:date", () => {
  function remove(date: string) {
    return app.request(`/recovery-days/${date}`, { method: "DELETE" });
  }

  it("deletes the logged day", async () => {
    await post(fullDay);

    const res = await remove("2026-11-01");

    expect(res.status).toBe(204);
    expect(await manualSource.getDay("2026-11-01")).toBeNull();
  });

  it("does not delete other days", async () => {
    await post(fullDay);
    await post({ ...fullDay, date: "2026-11-02" });

    await remove("2026-11-01");

    expect(await manualSource.getDay("2026-11-02")).not.toBeNull();
  });

  it("keeps imported data for the same date", async () => {
    await insertImportedDay("2026-11-01");
    await post(fullDay);

    await remove("2026-11-01");

    const rows = await db.select().from(recoveryDays);
    expect(rows.map((row) => row.source)).toEqual(["fit_import"]);
  });

  it("returns 404 when only imported data exists for the date", async () => {
    await insertImportedDay("2026-11-01");

    const res = await remove("2026-11-01");

    expect(res.status).toBe(404);
    expect(await db.select().from(recoveryDays)).toHaveLength(1);
  });

  it("returns 400 for an invalid date", async () => {
    const res = await remove("2026-02-30");

    expect(res.status).toBe(400);
  });
});

describe("manualSource", () => {
  it("does not return rows from another source", async () => {
    await insertImportedDay("2026-11-01");

    expect(await manualSource.getDay("2026-11-01")).toBeNull();
    expect(await manualSource.getRange("2026-11-01", "2026-11-01")).toEqual([]);
  });

  it("returns its own row when both sources have the date", async () => {
    await insertImportedDay("2026-11-01");
    await post(fullDay);

    const day = await manualSource.getDay("2026-11-01");

    expect(day?.source).toBe("manual");
    expect(day?.hrv).toBe(fullDay.hrv);
  });
});
