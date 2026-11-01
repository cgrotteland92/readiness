import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app.ts";
import { db, sql } from "../db/client.ts";
import { resetDb } from "../test/reset-db.ts";

const backSquat = {
  name: "Back Squat",
  pattern: "squat",
  equipment: ["barbell"],
  category: "strength",
};

function post(body: unknown) {
  return app.request("/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(resetDb);

afterAll(async () => {
  await sql.end();
});

describe("POST /exercises", () => {
  it("creates an exercise and generates its id", async () => {
    const res = await post(backSquat);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      ...backSquat,
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
  });

  it("defaults equipment to an empty list", async () => {
    const { equipment, ...withoutEquipment } = backSquat;
    const res = await post(withoutEquipment);

    expect(res.status).toBe(201);
    expect((await res.json()).equipment).toEqual([]);
  });

  it("ignores an id sent by the client", async () => {
    const id = "00000000-0000-4000-8000-000000000000";
    const res = await post({ ...backSquat, id });

    expect(res.status).toBe(201);
    expect((await res.json()).id).not.toBe(id);
  });

  it("trims the name", async () => {
    const res = await post({ ...backSquat, name: "  Front Squat  " });

    expect((await res.json()).name).toBe("Front Squat");
  });

  it.each([
    ["a missing name", { ...backSquat, name: undefined }],
    ["a blank name", { ...backSquat, name: "   " }],
    ["an unknown pattern", { ...backSquat, pattern: "wiggle" }],
    ["unknown equipment", { ...backSquat, equipment: ["hammer"] }],
    ["an unknown category", { ...backSquat, category: "fun" }],
    ["malformed JSON", "{not json"],
  ])("returns 400 for %s and saves nothing", async (_label, body) => {
    const res = await post(body);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid input");
    const list = await app.request("/exercises");
    expect(await list.json()).toEqual([]);
  });

  it("returns 409 for a duplicate name", async () => {
    await post(backSquat);
    const res = await post(backSquat);

    expect(res.status).toBe(409);
  });
});

describe("GET /exercises", () => {
  it("lists exercises sorted by name", async () => {
    await post({ ...backSquat, name: "Thruster" });
    await post({ ...backSquat, name: "Air Squat" });

    const res = await app.request("/exercises");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.map((e: { name: string }) => e.name)).toEqual([
      "Air Squat",
      "Thruster",
    ]);
  });
});

describe("GET /exercises/:id", () => {
  it("returns the exercise", async () => {
    const created = await (await post(backSquat)).json();

    const res = await app.request(`/exercises/${created.id}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(created);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await app.request(
      "/exercises/00000000-0000-4000-8000-000000000000"
    );

    expect(res.status).toBe(404);
  });

  it("returns 400 for an id that is not a UUID", async () => {
    const res = await app.request("/exercises/not-a-uuid");

    expect(res.status).toBe(400);
  });
});

describe("unexpected errors", () => {
  it("returns a generic 500 without leaking details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const select = vi.spyOn(db, "select").mockImplementation(() => {
      throw new Error("secret database detail");
    });

    const res = await app.request("/exercises");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });

    select.mockRestore();
    log.mockRestore();
  });
});
