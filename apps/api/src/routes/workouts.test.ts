import { workoutSchema } from "@readiness/shared";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app.ts";
import { db, sql } from "../db/client.ts";
import { workoutEntries } from "../db/schema.ts";
import { resetDb } from "../test/reset-db.ts";

const unknownId = "00000000-0000-4000-8000-000000000000";

function post(path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function listWorkouts() {
  return (await app.request("/workouts")).json();
}

let exerciseId: string;

function validWorkout() {
  return {
    date: "2026-11-01",
    type: "heavy_strength",
    durationMin: 60,
    rpe: 8,
    note: "Felt good",
    entries: [
      { exerciseId, position: 0, sets: 5, reps: 5, weightKg: 100.5 },
      { exerciseId, position: 1, durationSec: 300, distanceM: 1000.5 },
    ],
  };
}

function withEntry(entry: Record<string, unknown>) {
  return {
    ...validWorkout(),
    entries: [{ exerciseId, position: 0, ...entry }],
  };
}

beforeEach(async () => {
  await resetDb();
  const res = await post("/exercises", {
    name: "Back Squat",
    pattern: "squat",
    equipment: ["barbell"],
    category: "strength",
  });
  exerciseId = (await res.json()).id;
});

afterAll(async () => {
  await sql.end();
});

describe("POST /workouts", () => {
  it("creates a workout with its entries", async () => {
    const res = await post("/workouts", validWorkout());
    const body = await res.json();

    expect(res.status).toBe(201);
    // The response must match the shared schema that the frontend relies on.
    expect(workoutSchema.safeParse(body).success).toBe(true);
    expect(body).toMatchObject(validWorkout());
  });

  it("leaves out optional fields that were not sent", async () => {
    const res = await post("/workouts", {
      date: "2026-11-01",
      type: "rest",
      entries: [{ exerciseId, position: 0 }],
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(workoutSchema.safeParse(body).success).toBe(true);
    expect(body).not.toHaveProperty("rpe");
    expect(body.entries[0]).not.toHaveProperty("sets");
  });

  it("accepts a workout without entries", async () => {
    const res = await post("/workouts", {
      date: "2026-11-01",
      type: "rest",
      entries: [],
    });

    expect(res.status).toBe(201);
    expect((await res.json()).entries).toEqual([]);
  });

  it("accepts a leap day", async () => {
    const res = await post("/workouts", {
      ...validWorkout(),
      date: "2028-02-29",
    });

    expect(res.status).toBe(201);
    expect((await res.json()).date).toBe("2028-02-29");
  });

  it.each([
    ["a missing date", { date: undefined }],
    ["a wrongly formatted date", { date: "01.11.2026" }],
    ["an impossible month", { date: "2026-13-45" }],
    ["a day that does not exist", { date: "2026-02-30" }],
    ["a leap day in a normal year", { date: "2026-02-29" }],
    ["year zero", { date: "0000-01-01" }],
    ["an unknown type", { type: "nap" }],
    ["rpe above 10", { rpe: 11 }],
    ["rpe below 1", { rpe: 0 }],
    ["a duration too large for the column", { durationMin: 3_000_000_000 }],
    ["missing entries", { entries: undefined }],
  ])("returns 400 for %s and saves nothing", async (_label, change) => {
    const res = await post("/workouts", { ...validWorkout(), ...change });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid input");
    expect(await listWorkouts()).toEqual([]);
  });

  it.each([
    ["a negative weight", { weightKg: -1 }],
    ["a weight too large for the column", { weightKg: 10_000 }],
    ["a distance too large for the column", { distanceM: 10_000_000 }],
    ["fractional reps", { reps: 2.5 }],
    ["zero sets", { sets: 0 }],
    ["sets too large for the column", { sets: 3_000_000_000 }],
  ])("returns 400 for an entry with %s", async (_label, entry) => {
    const res = await post("/workouts", withEntry(entry));

    expect(res.status).toBe(400);
    expect(await listWorkouts()).toEqual([]);
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await post("/workouts", "{not json");

    expect(res.status).toBe(400);
  });

  it("returns 400 when two entries share a position", async () => {
    const res = await post("/workouts", {
      ...validWorkout(),
      entries: [
        { exerciseId, position: 0 },
        { exerciseId, position: 0 },
      ],
    });

    expect(res.status).toBe(400);
    expect(await listWorkouts()).toEqual([]);
  });

  it("returns 400 and names an unknown exercise", async () => {
    const res = await post("/workouts", {
      ...validWorkout(),
      entries: [
        { exerciseId, position: 0 },
        { exerciseId: unknownId, position: 1 },
      ],
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Unknown exercise",
      exerciseIds: [unknownId],
    });
    expect(await listWorkouts()).toEqual([]);
  });

  it("saves nothing if an entry fails after the workout is inserted", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    // Passes validation, but Postgres rejects a null byte in text.
    const res = await post("/workouts", {
      ...validWorkout(),
      entries: [{ exerciseId, position: 0, note: "bad\u0000note" }],
    });

    expect(res.status).toBe(500);
    expect(await listWorkouts()).toEqual([]);

    log.mockRestore();
  });
});

describe("PUT /workouts/:id", () => {
  function put(id: string, body: unknown) {
    return app.request(`/workouts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  async function createWorkout() {
    return (await post("/workouts", validWorkout())).json();
  }

  it("replaces the workout and its entries and keeps the id", async () => {
    const created = await createWorkout();

    const res = await put(created.id, {
      date: "2026-11-02",
      type: "metcon",
      rpe: 9,
      entries: [{ exerciseId, position: 0, reps: 21 }],
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(workoutSchema.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({
      id: created.id,
      date: "2026-11-02",
      type: "metcon",
      rpe: 9,
    });
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].reps).toBe(21);
    const stored = await (await app.request(`/workouts/${created.id}`)).json();
    expect(stored).toEqual(body);
  });

  it("clears optional fields that are left out", async () => {
    const created = await createWorkout();

    const res = await put(created.id, {
      date: "2026-11-01",
      type: "rest",
      entries: [],
    });
    const body = await res.json();

    expect(body).not.toHaveProperty("durationMin");
    expect(body).not.toHaveProperty("rpe");
    expect(body).not.toHaveProperty("note");
    expect(body.entries).toEqual([]);
  });

  it("does not change other workouts", async () => {
    const created = await createWorkout();
    const other = await createWorkout();

    await put(created.id, { date: "2026-11-02", type: "rest", entries: [] });

    const stored = await (await app.request(`/workouts/${other.id}`)).json();
    expect(stored).toEqual(other);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await put(unknownId, validWorkout());

    expect(res.status).toBe(404);
  });

  it("returns 400 for an id that is not a UUID", async () => {
    const res = await put("not-a-uuid", validWorkout());

    expect(res.status).toBe(400);
  });

  it.each([
    ["an impossible date", { date: "2026-02-30" }],
    ["rpe above 10", { rpe: 11 }],
    [
      "an unknown exercise",
      { entries: [{ exerciseId: unknownId, position: 0 }] },
    ],
  ])("returns 400 for %s and changes nothing", async (_label, change) => {
    const created = await createWorkout();

    const res = await put(created.id, { ...validWorkout(), ...change });

    expect(res.status).toBe(400);
    const stored = await (await app.request(`/workouts/${created.id}`)).json();
    expect(stored).toEqual(created);
  });

  it("returns 400 for malformed JSON", async () => {
    const created = await createWorkout();

    const res = await put(created.id, "{not json");

    expect(res.status).toBe(400);
  });

  it("keeps the old entries if inserting the new ones fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const created = await createWorkout();

    // Passes validation, but Postgres rejects a null byte in text.
    const res = await put(created.id, {
      ...validWorkout(),
      date: "2026-11-02",
      entries: [{ exerciseId, position: 0, note: "bad\u0000note" }],
    });

    expect(res.status).toBe(500);
    const stored = await (await app.request(`/workouts/${created.id}`)).json();
    expect(stored).toEqual(created);

    log.mockRestore();
  });
});

describe("DELETE /workouts/:id", () => {
  it("deletes the workout and its entries", async () => {
    const created = await (await post("/workouts", validWorkout())).json();

    const res = await app.request(`/workouts/${created.id}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(204);
    expect(await listWorkouts()).toEqual([]);
    expect(await db.select().from(workoutEntries)).toEqual([]);
  });

  it("keeps the exercises the workout used", async () => {
    const created = await (await post("/workouts", validWorkout())).json();

    await app.request(`/workouts/${created.id}`, { method: "DELETE" });

    const res = await app.request(`/exercises/${exerciseId}`);
    expect(res.status).toBe(200);
  });

  it("does not delete other workouts", async () => {
    const created = await (await post("/workouts", validWorkout())).json();
    const other = await (await post("/workouts", validWorkout())).json();

    await app.request(`/workouts/${created.id}`, { method: "DELETE" });

    expect(await listWorkouts()).toEqual([other]);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await app.request(`/workouts/${unknownId}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
  });

  it("returns 400 for an id that is not a UUID", async () => {
    const res = await app.request("/workouts/not-a-uuid", { method: "DELETE" });

    expect(res.status).toBe(400);
  });
});

describe("GET /workouts", () => {
  it("returns an empty list when there are no workouts", async () => {
    const res = await app.request("/workouts");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("lists the newest first, each with its own entries", async () => {
    await post("/workouts", {
      date: "2026-10-01",
      type: "metcon",
      entries: [{ exerciseId, position: 0, reps: 21 }],
    });
    await post("/workouts", {
      date: "2026-11-01",
      type: "skill",
      entries: [{ exerciseId, position: 0, reps: 3 }],
    });

    const body = await listWorkouts();

    expect(
      body.map((w: { date: string; entries: { reps: number }[] }) => [
        w.date,
        w.entries.map((e) => e.reps),
      ])
    ).toEqual([
      ["2026-11-01", [3]],
      ["2026-10-01", [21]],
    ]);
  });
});

describe("GET /workouts/:id", () => {
  it("returns the workout with entries in position order", async () => {
    const created = await (
      await post("/workouts", {
        ...validWorkout(),
        entries: [
          { exerciseId, position: 2, reps: 2 },
          { exerciseId, position: 0, reps: 1 },
          { exerciseId, position: 1, reps: 3 },
        ],
      })
    ).json();

    const res = await app.request(`/workouts/${created.id}`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(created);
    expect(body.entries.map((e: { position: number }) => e.position)).toEqual([
      0, 1, 2,
    ]);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await app.request(`/workouts/${unknownId}`);

    expect(res.status).toBe(404);
  });

  it("returns 400 for an id that is not a UUID", async () => {
    const res = await app.request("/workouts/not-a-uuid");

    expect(res.status).toBe(400);
  });
});
