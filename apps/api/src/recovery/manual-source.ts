import type { RecoveryDay, RecoverySource } from "@readiness/shared";
import { and, asc, between, eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { recoveryDays } from "../db/schema.ts";

// Missing values stay missing: null becomes an absent field, never a zero.
export function toRecoveryDay(
  row: typeof recoveryDays.$inferSelect
): RecoveryDay {
  return {
    date: row.date,
    source: row.source,
    hrv: row.hrv ?? undefined,
    restingHr: row.restingHr ?? undefined,
    sleepHours: row.sleepHours ?? undefined,
    feeling: row.feeling ?? undefined,
  };
}

// Reads only its own rows, because baselines must not mix sources.
export const manualSource: RecoverySource = {
  name: "manual",

  async getDay(date) {
    const [row] = await db
      .select()
      .from(recoveryDays)
      .where(
        and(eq(recoveryDays.source, "manual"), eq(recoveryDays.date, date))
      );
    return row ? toRecoveryDay(row) : null;
  },

  async getRange(from, to) {
    const rows = await db
      .select()
      .from(recoveryDays)
      .where(
        and(
          eq(recoveryDays.source, "manual"),
          between(recoveryDays.date, from, to)
        )
      )
      .orderBy(asc(recoveryDays.date));
    return rows.map(toRecoveryDay);
  },
};
