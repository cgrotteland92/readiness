import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../app.ts";
import { resetDb } from "../../test/reset-db.ts";
import { sql } from "../client.ts";
import { exerciseSeed, seedExercises } from "./exercises.ts";

beforeEach(resetDb);

afterAll(async () => {
  await sql.end();
});

async function listExercises() {
  return (await app.request("/exercises")).json();
}

describe("exercise seed data", () => {
  it("has no duplicate names, ignoring case", () => {
    const names = exerciseSeed.map((e) => e.name.toLowerCase());

    expect(names.length - new Set(names).size).toBe(0);
  });

  it("tags every exercise with equipment and muscle groups", () => {
    const untagged = exerciseSeed.filter(
      (e) => e.equipment.length === 0 || e.muscleGroups.length === 0
    );

    expect(untagged).toEqual([]);
  });
});

describe("seedExercises", () => {
  it("adds every exercise, readable through the API", async () => {
    const added = await seedExercises();

    expect(added).toBe(exerciseSeed.length);
    expect(await listExercises()).toHaveLength(exerciseSeed.length);
  });

  it("adds nothing when run a second time", async () => {
    await seedExercises();

    expect(await seedExercises()).toBe(0);
    expect(await listExercises()).toHaveLength(exerciseSeed.length);
  });

  it("keeps an existing exercise with the same name unchanged", async () => {
    const mine = {
      name: exerciseSeed[0].name,
      pattern: "carry",
      equipment: ["other"],
      category: "mobility",
      muscleGroups: ["core"],
    };
    await app.request("/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mine),
    });

    const added = await seedExercises();

    expect(added).toBe(exerciseSeed.length - 1);
    const all: { name: string }[] = await listExercises();
    expect(all.find((e) => e.name === mine.name)).toMatchObject(mine);
  });
});
