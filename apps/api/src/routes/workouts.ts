import { type Workout, createWorkoutInput } from "@readiness/shared";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/client.ts";
import { exercises, workoutEntries, workouts } from "../db/schema.ts";

const workoutId = z.string().uuid();

// Attaches entries to workouts. The database stores missing values as null,
// the shared Workout type leaves them out, and undefined is dropped from JSON.
async function withEntries(
  rows: (typeof workouts.$inferSelect)[]
): Promise<Workout[]> {
  // One query for all entries, instead of one query per workout.
  const entries = await db
    .select()
    .from(workoutEntries)
    .where(
      inArray(
        workoutEntries.workoutId,
        rows.map((row) => row.id)
      )
    )
    .orderBy(asc(workoutEntries.position));

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    type: row.type,
    durationMin: row.durationMin ?? undefined,
    rpe: row.rpe ?? undefined,
    note: row.note ?? undefined,
    entries: entries
      .filter((entry) => entry.workoutId === row.id)
      .map((entry) => ({
        id: entry.id,
        exerciseId: entry.exerciseId,
        position: entry.position,
        sets: entry.sets ?? undefined,
        reps: entry.reps ?? undefined,
        weightKg: entry.weightKg ?? undefined,
        durationSec: entry.durationSec ?? undefined,
        distanceM: entry.distanceM ?? undefined,
        note: entry.note ?? undefined,
      })),
  }));
}

export const workoutRoutes = new Hono();

workoutRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => undefined);
  const input = createWorkoutInput.safeParse(body);
  if (!input.success) {
    return c.json({ error: "Invalid input", issues: input.error.issues }, 400);
  }
  const { entries, ...workout } = input.data;

  // Without this check, an unknown exercise would hit the foreign key and
  // look like a server error. The foreign key is still the final guarantee.
  const exerciseIds = [...new Set(entries.map((e) => e.exerciseId))];
  const found = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(inArray(exercises.id, exerciseIds));
  if (found.length !== exerciseIds.length) {
    const foundIds = new Set(found.map((e) => e.id));
    return c.json(
      {
        error: "Unknown exercise",
        exerciseIds: exerciseIds.filter((id) => !foundIds.has(id)),
      },
      400
    );
  }

  // A transaction, so a failed entry cannot leave half a workout behind.
  const created = await db.transaction(async (tx) => {
    const [row] = await tx.insert(workouts).values(workout).returning();
    if (entries.length > 0) {
      await tx
        .insert(workoutEntries)
        .values(entries.map((entry) => ({ ...entry, workoutId: row.id })));
    }
    return row;
  });

  const [result] = await withEntries([created]);
  return c.json(result, 201);
});

workoutRoutes.get("/", async (c) => {
  const rows = await db
    .select()
    .from(workouts)
    .orderBy(desc(workouts.date), desc(workouts.createdAt));

  return c.json(await withEntries(rows));
});

workoutRoutes.get("/:id", async (c) => {
  const id = workoutId.safeParse(c.req.param("id"));
  if (!id.success) {
    return c.json({ error: "Invalid workout id" }, 400);
  }

  const rows = await db.select().from(workouts).where(eq(workouts.id, id.data));
  if (rows.length === 0) {
    return c.json({ error: "Workout not found" }, 404);
  }

  const [result] = await withEntries(rows);
  return c.json(result);
});
