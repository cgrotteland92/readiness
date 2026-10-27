CREATE TYPE "public"."equipment" AS ENUM('barbell', 'dumbbell', 'kettlebell', 'bodyweight', 'pullup_bar', 'rings', 'rower', 'bike', 'box', 'jump_rope', 'other');--> statement-breakpoint
CREATE TYPE "public"."exercise_category" AS ENUM('strength', 'gymnastics', 'conditioning', 'olympic', 'mobility');--> statement-breakpoint
CREATE TYPE "public"."movement_pattern" AS ENUM('squat', 'hinge', 'push', 'pull', 'carry', 'core', 'olympic', 'gymnastics', 'cardio');--> statement-breakpoint
CREATE TYPE "public"."recovery_source" AS ENUM('manual', 'fit_import');--> statement-breakpoint
CREATE TYPE "public"."workout_type" AS ENUM('heavy_strength', 'metcon', 'skill', 'endurance', 'mixed', 'rest');--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"pattern" "movement_pattern" NOT NULL,
	"equipment" "equipment"[] DEFAULT '{}' NOT NULL,
	"category" "exercise_category" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "recovery_days" (
	"date" date NOT NULL,
	"source" "recovery_source" NOT NULL,
	"hrv" numeric(5, 1),
	"resting_hr" integer,
	"sleep_hours" numeric(4, 2),
	"feeling" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recovery_days_date_source_pk" PRIMARY KEY("date","source"),
	CONSTRAINT "recovery_days_feeling_range" CHECK ("recovery_days"."feeling" between 1 and 5),
	CONSTRAINT "recovery_days_sleep_range" CHECK ("recovery_days"."sleep_hours" between 0 and 24)
);
--> statement-breakpoint
CREATE TABLE "workout_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"sets" integer,
	"reps" integer,
	"weight_kg" numeric(6, 2),
	"duration_sec" integer,
	"distance_m" numeric(8, 1),
	"note" text,
	CONSTRAINT "workout_entries_position" UNIQUE("workout_id","position")
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"type" "workout_type" NOT NULL,
	"duration_min" integer,
	"rpe" smallint,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workouts_rpe_range" CHECK ("workouts"."rpe" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "workout_entries" ADD CONSTRAINT "workout_entries_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_entries" ADD CONSTRAINT "workout_entries_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;