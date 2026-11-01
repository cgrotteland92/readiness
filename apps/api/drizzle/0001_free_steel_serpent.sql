CREATE TYPE "public"."muscle_group" AS ENUM('quads', 'hamstrings', 'glutes', 'back', 'chest', 'shoulders', 'arms', 'core');--> statement-breakpoint
ALTER TYPE "public"."equipment" ADD VALUE 'medicine_ball' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."equipment" ADD VALUE 'rope' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."equipment" ADD VALUE 'sled' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."equipment" ADD VALUE 'sandbag' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."equipment" ADD VALUE 'ski_erg' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."equipment" ADD VALUE 'parallettes' BEFORE 'other';--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "muscle_groups" "muscle_group"[] DEFAULT '{}' NOT NULL;