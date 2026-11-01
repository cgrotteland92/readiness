import { sql } from "../db/client.ts";

export async function resetDb() {
  // Last line of defence: this deletes everything, so refuse a non-test database.
  if (!sql.options.database.endsWith("_test")) {
    throw new Error(`Refusing to reset database "${sql.options.database}"`);
  }
  await sql`truncate workout_entries, workouts, exercises, recovery_days`;
}
