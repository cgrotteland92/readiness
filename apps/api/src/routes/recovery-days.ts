import {
  createRecoveryDayInput,
  isoDate,
  updateRecoveryDayInput,
} from "@readiness/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/client.ts";
import { recoveryDays } from "../db/schema.ts";
import { manualSource, toRecoveryDay } from "../recovery/manual-source.ts";

const rangeQuery = z
  .object({ from: isoDate, to: isoDate })
  // YYYY-MM-DD strings sort in date order, so a string comparison is enough.
  .refine((range) => range.from <= range.to, "from must not be after to");

// Edits and deletes only reach manual rows, so imported data stays as imported.
function manualDay(date: string) {
  return and(
    eq(recoveryDays.source, manualSource.name),
    eq(recoveryDays.date, date)
  );
}

export const recoveryDayRoutes = new Hono();

recoveryDayRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => undefined);
  const input = createRecoveryDayInput.safeParse(body);
  if (!input.success) {
    return c.json({ error: "Invalid input", issues: input.error.issues }, 400);
  }

  // The source is set here, so this route can only ever write manual data.
  const [created] = await db
    .insert(recoveryDays)
    .values({ ...input.data, source: manualSource.name })
    .onConflictDoNothing()
    .returning();
  if (!created) {
    return c.json({ error: "This date is already logged" }, 409);
  }

  return c.json(toRecoveryDay(created), 201);
});

recoveryDayRoutes.get("/", async (c) => {
  const range = rangeQuery.safeParse(c.req.query());
  if (!range.success) {
    return c.json({ error: "Invalid range", issues: range.error.issues }, 400);
  }

  return c.json(await manualSource.getRange(range.data.from, range.data.to));
});

recoveryDayRoutes.get("/:date", async (c) => {
  const date = isoDate.safeParse(c.req.param("date"));
  if (!date.success) {
    return c.json({ error: "Invalid date" }, 400);
  }

  const day = await manualSource.getDay(date.data);
  if (!day) {
    return c.json({ error: "No recovery data for this date" }, 404);
  }

  return c.json(day);
});

recoveryDayRoutes.put("/:date", async (c) => {
  const date = isoDate.safeParse(c.req.param("date"));
  if (!date.success) {
    return c.json({ error: "Invalid date" }, 400);
  }

  const body = await c.req.json().catch(() => undefined);
  const input = updateRecoveryDayInput.safeParse(body);
  if (!input.success) {
    return c.json({ error: "Invalid input", issues: input.error.issues }, 400);
  }

  // Explicit nulls, because Drizzle skips undefined and would keep the old value.
  const [updated] = await db
    .update(recoveryDays)
    .set({
      hrv: input.data.hrv ?? null,
      restingHr: input.data.restingHr ?? null,
      sleepHours: input.data.sleepHours ?? null,
      feeling: input.data.feeling ?? null,
    })
    .where(manualDay(date.data))
    .returning();
  if (!updated) {
    return c.json({ error: "No recovery data for this date" }, 404);
  }

  return c.json(toRecoveryDay(updated));
});

recoveryDayRoutes.delete("/:date", async (c) => {
  const date = isoDate.safeParse(c.req.param("date"));
  if (!date.success) {
    return c.json({ error: "Invalid date" }, 400);
  }

  const deleted = await db
    .delete(recoveryDays)
    .where(manualDay(date.data))
    .returning();
  if (deleted.length === 0) {
    return c.json({ error: "No recovery data for this date" }, 404);
  }

  return c.body(null, 204);
});
