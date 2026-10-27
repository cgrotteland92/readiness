// Database tables. Mirrors the Zod schemas in @readiness/shared.
// Enum values come from the Zod enums, so there is one list to maintain.
import {
  equipment,
  exerciseCategory,
  movementPattern,
  recoverySourceName,
  workoutType,
} from "@readiness/shared";
import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------

export const movementPatternEnum = pgEnum(
  "movement_pattern",
  movementPattern.options
);
export const equipmentEnum = pgEnum("equipment", equipment.options);
export const exerciseCategoryEnum = pgEnum(
  "exercise_category",
  exerciseCategory.options
);
export const workoutTypeEnum = pgEnum("workout_type", workoutType.options);
export const recoverySourceEnum = pgEnum(
  "recovery_source",
  recoverySourceName.options
);

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---------- Exercises ----------

export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  pattern: movementPatternEnum("pattern").notNull(),
  equipment: equipmentEnum("equipment").array().notNull().default(sql`'{}'`),
  category: exerciseCategoryEnum("category").notNull(),
  createdAt: createdAt(),
});

// ---------- Workouts ----------

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // mode "string" keeps "YYYY-MM-DD" as a string, no Date/time zone conversion.
    date: date("date", { mode: "string" }).notNull(),
    type: workoutTypeEnum("type").notNull(),
    durationMin: integer("duration_min"),
    rpe: smallint("rpe"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [check("workouts_rpe_range", sql`${t.rpe} between 1 and 10`)]
);

export const workoutEntries = pgTable(
  "workout_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    sets: integer("sets"),
    reps: integer("reps"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2, mode: "number" }),
    durationSec: integer("duration_sec"),
    distanceM: numeric("distance_m", {
      precision: 8,
      scale: 1,
      mode: "number",
    }),
    note: text("note"),
  },
  (t) => [unique("workout_entries_position").on(t.workoutId, t.position)]
);

// ---------- Recovery ----------

// One row per date per source. Baselines must not mix sources,
// so each RecoverySource adapter reads only its own rows.
export const recoveryDays = pgTable(
  "recovery_days",
  {
    date: date("date", { mode: "string" }).notNull(),
    source: recoverySourceEnum("source").notNull(),
    hrv: numeric("hrv", { precision: 5, scale: 1, mode: "number" }),
    restingHr: integer("resting_hr"),
    sleepHours: numeric("sleep_hours", {
      precision: 4,
      scale: 2,
      mode: "number",
    }),
    feeling: smallint("feeling"),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.date, t.source] }),
    check("recovery_days_feeling_range", sql`${t.feeling} between 1 and 5`),
    check("recovery_days_sleep_range", sql`${t.sleepHours} between 0 and 24`),
  ]
);
