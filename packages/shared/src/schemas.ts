// packages/shared/src/schemas.ts
// Delte skjemaer for treningsappen. Brukes i API, validering av LLM-output og React.
import { z } from "zod";

// ---------- Hjelpetyper ----------

/** Dato uten klokkeslett, "YYYY-MM-DD". Enklest å jobbe med for daglige data. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine(isCalendarDate, "Not a real calendar date");

// Date rolls impossible dates over (Feb 30 becomes Mar 2), so the round trip
// catches them. Postgres has no year 0, so that is rejected too.
function isCalendarDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getUTCFullYear() > 0 &&
    parsed.toISOString().slice(0, 10) === value
  );
}

// Upper limits match the database columns, so out-of-range input is a
// validation error instead of a database error.
const maxInt = 2_147_483_647;

// ---------- Øvelser ----------

export const movementPattern = z.enum([
  "squat",
  "hinge",
  "push",
  "pull",
  "carry",
  "core",
  "olympic",
  "gymnastics",
  "cardio",
]);

export const equipment = z.enum([
  "barbell",
  "dumbbell",
  "kettlebell",
  "bodyweight",
  "pullup_bar",
  "rings",
  "rower",
  "bike",
  "box",
  "jump_rope",
  "other",
]);

export const exerciseCategory = z.enum([
  "strength",
  "gymnastics",
  "conditioning",
  "olympic",
  "mobility",
]);

export const exerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  pattern: movementPattern,
  equipment: z.array(equipment).default([]),
  category: exerciseCategory,
});
export type Exercise = z.infer<typeof exerciseSchema>;

/** Input for creating an exercise. The server generates the id. */
export const createExerciseInput = exerciseSchema
  .omit({ id: true })
  .extend({ name: z.string().trim().min(1) });
export type CreateExerciseInput = z.infer<typeof createExerciseInput>;

// ---------- Økter ----------

export const workoutType = z.enum([
  "heavy_strength",
  "metcon",
  "skill",
  "endurance",
  "mixed",
  "rest",
]);

export const workoutEntrySchema = z.object({
  id: z.string().uuid(),
  exerciseId: z.string().uuid(),
  position: z.number().int().nonnegative().max(maxInt), // rekkefølge i økta
  sets: z.number().int().positive().max(maxInt).optional(),
  reps: z.number().int().positive().max(maxInt).optional(),
  weightKg: z.number().nonnegative().max(9999.99).optional(),
  durationSec: z.number().int().positive().max(maxInt).optional(),
  distanceM: z.number().nonnegative().max(9_999_999.9).optional(),
  note: z.string().optional(),
});
export type WorkoutEntry = z.infer<typeof workoutEntrySchema>;

export const workoutSchema = z.object({
  id: z.string().uuid(),
  date: isoDate,
  type: workoutType,
  durationMin: z.number().int().positive().max(maxInt).optional(),
  rpe: z.number().int().min(1).max(10).optional(), // subjektiv anstrengelse
  note: z.string().optional(),
  entries: z.array(workoutEntrySchema),
});
export type Workout = z.infer<typeof workoutSchema>;

/** Input når du oppretter en økt (uten id-er som serveren genererer). */
export const createWorkoutInput = workoutSchema
  .omit({ id: true, entries: true })
  .extend({
    entries: z
      .array(workoutEntrySchema.omit({ id: true }))
      .refine(
        (entries) =>
          new Set(entries.map((e) => e.position)).size === entries.length,
        "Each entry needs its own position"
      ),
  });
export type CreateWorkoutInput = z.infer<typeof createWorkoutInput>;

// ---------- Restitusjon ----------

export const recoverySourceName = z.enum(["manual", "fit_import"]);

export const recoveryDaySchema = z.object({
  date: isoDate,
  hrv: z.number().positive().max(9999.9).optional(), // ms, samme metode hver dag (hold deg til Garmin-tallet)
  restingHr: z.number().int().positive().max(maxInt).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  feeling: z.number().int().min(1).max(5).optional(), // din egen følelse, 1 til 5
  source: recoverySourceName,
});
export type RecoveryDay = z.infer<typeof recoveryDaySchema>;

/**
 * Input for logging a recovery day by hand. The server sets the source.
 * A day with no values is rejected: it carries no information, and missing
 * data must never look like a logged day.
 */
export const createRecoveryDayInput = recoveryDaySchema
  .omit({ source: true })
  .refine(
    (day) =>
      day.hrv !== undefined ||
      day.restingHr !== undefined ||
      day.sleepHours !== undefined ||
      day.feeling !== undefined,
    "Provide at least one value"
  );
export type CreateRecoveryDayInput = z.infer<typeof createRecoveryDayInput>;

// ---------- Restitusjonskilder (adapter-mønster) ----------

/**
 * Alle kilder til restitusjonsdata implementerer dette.
 * Resten av appen vet ikke om dataene kom fra manuell innskriving eller filimport.
 */
export interface RecoverySource {
  readonly name: z.infer<typeof recoverySourceName>;
  /** Hent én dag, eller null hvis kilden ikke har data for den datoen. */
  getDay(date: string): Promise<RecoveryDay | null>;
  /** Hent et datointervall (inkludert begge ender). */
  getRange(from: string, to: string): Promise<RecoveryDay[]>;
}
