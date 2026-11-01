import { type Exercise, createExerciseInput } from "@readiness/shared";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/client.ts";
import { exercises } from "../db/schema.ts";

// The shape of the shared Exercise type, so created_at stays internal.
const exerciseColumns = {
  id: exercises.id,
  name: exercises.name,
  pattern: exercises.pattern,
  equipment: exercises.equipment,
  category: exercises.category,
  muscleGroups: exercises.muscleGroups,
};

const exerciseId = z.string().uuid();

export const exerciseRoutes = new Hono();

exerciseRoutes.post("/", async (c) => {
  // Malformed JSON becomes undefined and fails validation like any other bad input.
  const body = await c.req.json().catch(() => undefined);
  const input = createExerciseInput.safeParse(body);
  if (!input.success) {
    return c.json({ error: "Invalid input", issues: input.error.issues }, 400);
  }

  const [created] = await db
    .insert(exercises)
    .values(input.data)
    .onConflictDoNothing({ target: exercises.name })
    .returning(exerciseColumns);
  if (!created) {
    return c.json({ error: "An exercise with this name already exists" }, 409);
  }

  return c.json(created, 201);
});

exerciseRoutes.get("/", async (c) => {
  const rows: Exercise[] = await db
    .select(exerciseColumns)
    .from(exercises)
    .orderBy(asc(exercises.name));

  return c.json(rows);
});

exerciseRoutes.get("/:id", async (c) => {
  const id = exerciseId.safeParse(c.req.param("id"));
  if (!id.success) {
    return c.json({ error: "Invalid exercise id" }, 400);
  }

  const [exercise] = await db
    .select(exerciseColumns)
    .from(exercises)
    .where(eq(exercises.id, id.data));
  if (!exercise) {
    return c.json({ error: "Exercise not found" }, 404);
  }

  return c.json(exercise);
});
