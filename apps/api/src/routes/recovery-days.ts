import { createRecoveryDayInput, isoDate } from "@readiness/shared";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/client.ts";
import { recoveryDays } from "../db/schema.ts";
import { manualSource, toRecoveryDay } from "../recovery/manual-source.ts";

const rangeQuery = z
  .object({ from: isoDate, to: isoDate })
  // YYYY-MM-DD strings sort in date order, so a string comparison is enough.
  .refine((range) => range.from <= range.to, "from must not be after to");

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
