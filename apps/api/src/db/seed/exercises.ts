import {
  type CreateExerciseInput,
  createExerciseInput,
} from "@readiness/shared";
import { db } from "../client.ts";
import { exercises } from "../schema.ts";

type Row = [
  name: string,
  pattern: CreateExerciseInput["pattern"],
  category: CreateExerciseInput["category"],
  equipment: CreateExerciseInput["equipment"],
  muscleGroups: CreateExerciseInput["muscleGroups"],
];

// Common muscle combinations, to keep each row short.
const legs: CreateExerciseInput["muscleGroups"] = ["quads", "glutes"];
const posterior: CreateExerciseInput["muscleGroups"] = [
  "hamstrings",
  "glutes",
  "back",
];
const press: CreateExerciseInput["muscleGroups"] = ["shoulders", "arms"];
const chestPress: CreateExerciseInput["muscleGroups"] = [
  "chest",
  "shoulders",
  "arms",
];
const pull: CreateExerciseInput["muscleGroups"] = ["back", "arms"];
const fullBody: CreateExerciseInput["muscleGroups"] = [
  "quads",
  "hamstrings",
  "glutes",
  "back",
  "shoulders",
];
const carry: CreateExerciseInput["muscleGroups"] = ["core", "back", "arms"];

// Pattern describes how the movement loads the body, so the AI layer's rules can
// compare sessions: a pull-up is "pull" and a pistol is "squat", even when the
// category is gymnastics. The "gymnastics" pattern is for skills without one
// clear load, and "cardio" for monostructural work and burpees.
// biome-ignore format: one row per exercise is easier to review.
const rows: Row[] = [
  // ---------- Squat ----------
  ["Back Squat", "squat", "strength", ["barbell"], legs],
  ["Front Squat", "squat", "strength", ["barbell"], legs],
  ["Overhead Squat", "squat", "strength", ["barbell"], ["quads", "glutes", "shoulders", "core"]],
  ["Box Squat", "squat", "strength", ["barbell", "box"], legs],
  ["Pause Back Squat", "squat", "strength", ["barbell"], legs],
  ["Pause Front Squat", "squat", "strength", ["barbell"], legs],
  ["Zercher Squat", "squat", "strength", ["barbell"], ["quads", "glutes", "core"]],
  ["Goblet Squat", "squat", "strength", ["kettlebell", "dumbbell"], legs],
  ["Dumbbell Front Squat", "squat", "strength", ["dumbbell"], legs],
  ["Double Kettlebell Front Squat", "squat", "strength", ["kettlebell"], legs],
  ["Sandbag Squat", "squat", "strength", ["sandbag"], legs],
  ["Bulgarian Split Squat", "squat", "strength", ["dumbbell", "box"], legs],
  ["Barbell Split Squat", "squat", "strength", ["barbell"], legs],
  ["Air Squat", "squat", "conditioning", ["bodyweight"], legs],
  ["Jump Squat", "squat", "conditioning", ["bodyweight"], legs],
  ["Pistol Squat", "squat", "gymnastics", ["bodyweight"], ["quads", "glutes", "core"]],
  ["Wall Sit", "squat", "conditioning", ["bodyweight"], ["quads"]],
  ["Walking Lunge", "squat", "conditioning", ["bodyweight"], legs],
  ["Reverse Lunge", "squat", "strength", ["bodyweight"], legs],
  ["Jumping Lunge", "squat", "conditioning", ["bodyweight"], legs],
  ["Barbell Front Rack Lunge", "squat", "strength", ["barbell"], legs],
  ["Barbell Back Rack Lunge", "squat", "strength", ["barbell"], legs],
  ["Barbell Overhead Lunge", "squat", "strength", ["barbell"], ["quads", "glutes", "shoulders", "core"]],
  ["Dumbbell Walking Lunge", "squat", "strength", ["dumbbell"], legs],
  ["Dumbbell Overhead Lunge", "squat", "strength", ["dumbbell"], ["quads", "glutes", "shoulders", "core"]],
  ["Kettlebell Front Rack Lunge", "squat", "strength", ["kettlebell"], legs],
  ["Sandbag Lunge", "squat", "conditioning", ["sandbag"], legs],
  ["Step-Up", "squat", "conditioning", ["box"], legs],
  ["Dumbbell Step-Up", "squat", "strength", ["dumbbell", "box"], legs],
  ["Box Step-Over", "squat", "conditioning", ["box"], legs],
  ["Dumbbell Box Step-Over", "squat", "conditioning", ["dumbbell", "box"], legs],
  ["Box Jump", "squat", "conditioning", ["box"], legs],
  ["Box Jump Over", "squat", "conditioning", ["box"], legs],
  ["Wall Ball", "squat", "conditioning", ["medicine_ball"], ["quads", "glutes", "shoulders"]],
  ["Thruster", "squat", "conditioning", ["barbell"], ["quads", "glutes", "shoulders", "arms"]],
  ["Dumbbell Thruster", "squat", "conditioning", ["dumbbell"], ["quads", "glutes", "shoulders", "arms"]],
  ["Kettlebell Thruster", "squat", "conditioning", ["kettlebell"], ["quads", "glutes", "shoulders", "arms"]],

  // ---------- Hinge ----------
  ["Deadlift", "hinge", "strength", ["barbell"], posterior],
  ["Sumo Deadlift", "hinge", "strength", ["barbell"], ["quads", "hamstrings", "glutes", "back"]],
  ["Romanian Deadlift", "hinge", "strength", ["barbell"], posterior],
  ["Stiff-Leg Deadlift", "hinge", "strength", ["barbell"], posterior],
  ["Deficit Deadlift", "hinge", "strength", ["barbell"], posterior],
  ["Rack Pull", "hinge", "strength", ["barbell"], ["glutes", "back"]],
  ["Good Morning", "hinge", "strength", ["barbell"], posterior],
  ["Hip Thrust", "hinge", "strength", ["barbell"], ["glutes", "hamstrings"]],
  ["Glute Bridge", "hinge", "strength", ["bodyweight"], ["glutes", "hamstrings"]],
  ["Dumbbell Deadlift", "hinge", "strength", ["dumbbell"], posterior],
  ["Dumbbell Romanian Deadlift", "hinge", "strength", ["dumbbell"], posterior],
  ["Single-Leg Romanian Deadlift", "hinge", "strength", ["dumbbell", "kettlebell"], ["hamstrings", "glutes", "core"]],
  ["Kettlebell Deadlift", "hinge", "strength", ["kettlebell"], posterior],
  ["Kettlebell Swing", "hinge", "conditioning", ["kettlebell"], ["hamstrings", "glutes", "back", "shoulders"]],
  ["American Kettlebell Swing", "hinge", "conditioning", ["kettlebell"], ["hamstrings", "glutes", "back", "shoulders"]],
  ["Single-Arm Kettlebell Swing", "hinge", "conditioning", ["kettlebell"], ["hamstrings", "glutes", "back", "core"]],
  ["Sumo Deadlift High Pull", "hinge", "conditioning", ["barbell"], ["hamstrings", "glutes", "back", "shoulders"]],
  ["Kettlebell Sumo Deadlift High Pull", "hinge", "conditioning", ["kettlebell"], ["hamstrings", "glutes", "back", "shoulders"]],
  ["GHD Hip Extension", "hinge", "strength", ["other"], ["hamstrings", "glutes", "back"]],
  ["Back Extension", "hinge", "strength", ["other"], ["back", "glutes"]],
  ["Nordic Curl", "hinge", "strength", ["bodyweight"], ["hamstrings"]],
  ["Devil Press", "hinge", "conditioning", ["dumbbell"], ["hamstrings", "glutes", "back", "shoulders", "chest"]],

  // ---------- Push ----------
  ["Bench Press", "push", "strength", ["barbell"], chestPress],
  ["Close-Grip Bench Press", "push", "strength", ["barbell"], ["arms", "chest", "shoulders"]],
  ["Incline Bench Press", "push", "strength", ["barbell"], chestPress],
  ["Floor Press", "push", "strength", ["barbell"], chestPress],
  ["Dumbbell Bench Press", "push", "strength", ["dumbbell"], chestPress],
  ["Incline Dumbbell Bench Press", "push", "strength", ["dumbbell"], chestPress],
  ["Strict Press", "push", "strength", ["barbell"], press],
  ["Push Press", "push", "strength", ["barbell"], ["shoulders", "arms", "quads"]],
  ["Behind-the-Neck Press", "push", "strength", ["barbell"], press],
  ["Z Press", "push", "strength", ["barbell"], ["shoulders", "arms", "core"]],
  ["Dumbbell Shoulder Press", "push", "strength", ["dumbbell"], press],
  ["Seated Dumbbell Press", "push", "strength", ["dumbbell"], press],
  ["Single-Arm Dumbbell Press", "push", "strength", ["dumbbell"], ["shoulders", "arms", "core"]],
  ["Dumbbell Push Press", "push", "strength", ["dumbbell"], ["shoulders", "arms", "quads"]],
  ["Kettlebell Press", "push", "strength", ["kettlebell"], press],
  ["Kettlebell Push Press", "push", "strength", ["kettlebell"], ["shoulders", "arms", "quads"]],
  ["Push-Up", "push", "gymnastics", ["bodyweight"], chestPress],
  ["Hand-Release Push-Up", "push", "gymnastics", ["bodyweight"], chestPress],
  ["Deficit Push-Up", "push", "gymnastics", ["parallettes"], chestPress],
  ["Ring Push-Up", "push", "gymnastics", ["rings"], ["chest", "shoulders", "arms", "core"]],
  ["Bar Dip", "push", "gymnastics", ["other"], ["chest", "arms", "shoulders"]],
  ["Ring Dip", "push", "gymnastics", ["rings"], ["chest", "arms", "shoulders"]],
  ["Weighted Dip", "push", "strength", ["other"], ["chest", "arms", "shoulders"]],
  ["Strict Handstand Push-Up", "push", "gymnastics", ["bodyweight"], press],
  ["Kipping Handstand Push-Up", "push", "gymnastics", ["bodyweight"], ["shoulders", "arms", "core"]],
  ["Deficit Handstand Push-Up", "push", "gymnastics", ["parallettes"], press],
  ["Pike Push-Up", "push", "gymnastics", ["bodyweight"], press],
  ["Wall Walk", "push", "gymnastics", ["bodyweight"], ["shoulders", "arms", "core"]],
  ["Lateral Raise", "push", "strength", ["dumbbell"], ["shoulders"]],
  ["Skull Crusher", "push", "strength", ["barbell", "dumbbell"], ["arms"]],
  ["Sled Push", "push", "conditioning", ["sled"], ["quads", "glutes", "core"]],

  // ---------- Pull ----------
  ["Strict Pull-Up", "pull", "gymnastics", ["pullup_bar"], pull],
  ["Kipping Pull-Up", "pull", "gymnastics", ["pullup_bar"], ["back", "arms", "core"]],
  ["Butterfly Pull-Up", "pull", "gymnastics", ["pullup_bar"], ["back", "arms", "core"]],
  ["Chest-to-Bar Pull-Up", "pull", "gymnastics", ["pullup_bar"], ["back", "arms", "core"]],
  ["Weighted Pull-Up", "pull", "strength", ["pullup_bar"], pull],
  ["Chin-Up", "pull", "gymnastics", ["pullup_bar"], pull],
  ["Jumping Pull-Up", "pull", "conditioning", ["pullup_bar"], pull],
  ["Banded Pull-Up", "pull", "gymnastics", ["pullup_bar", "other"], pull],
  ["Ring Pull-Up", "pull", "gymnastics", ["rings"], pull],
  ["Ring Row", "pull", "gymnastics", ["rings"], pull],
  ["Rope Climb", "pull", "gymnastics", ["rope"], ["back", "arms", "core"]],
  ["Legless Rope Climb", "pull", "gymnastics", ["rope"], ["back", "arms", "core"]],
  ["Rope Pull-Up", "pull", "gymnastics", ["rope"], pull],
  ["Bent-Over Barbell Row", "pull", "strength", ["barbell"], pull],
  ["Pendlay Row", "pull", "strength", ["barbell"], pull],
  ["Dumbbell Row", "pull", "strength", ["dumbbell"], pull],
  ["Kettlebell Row", "pull", "strength", ["kettlebell"], pull],
  ["Renegade Row", "pull", "strength", ["dumbbell"], ["back", "arms", "core"]],
  ["Upright Row", "pull", "strength", ["barbell"], ["shoulders", "arms"]],
  ["Kettlebell High Pull", "pull", "conditioning", ["kettlebell"], ["back", "shoulders", "arms"]],
  ["Barbell Curl", "pull", "strength", ["barbell"], ["arms"]],
  ["Dumbbell Curl", "pull", "strength", ["dumbbell"], ["arms"]],
  ["Hammer Curl", "pull", "strength", ["dumbbell"], ["arms"]],
  ["Sled Pull", "pull", "conditioning", ["sled"], ["back", "hamstrings", "glutes"]],

  // ---------- Carry ----------
  ["Dumbbell Farmers Carry", "carry", "conditioning", ["dumbbell"], carry],
  ["Kettlebell Farmers Carry", "carry", "conditioning", ["kettlebell"], carry],
  ["Suitcase Carry", "carry", "conditioning", ["kettlebell", "dumbbell"], ["core", "arms"]],
  ["Front Rack Carry", "carry", "conditioning", ["kettlebell", "dumbbell"], ["core", "shoulders", "back"]],
  ["Overhead Carry", "carry", "conditioning", ["kettlebell", "dumbbell"], ["core", "shoulders"]],
  ["Barbell Overhead Carry", "carry", "conditioning", ["barbell"], ["core", "shoulders"]],
  ["Waiter Walk", "carry", "conditioning", ["kettlebell"], ["core", "shoulders"]],
  ["Sandbag Carry", "carry", "conditioning", ["sandbag"], ["core", "back", "arms"]],
  ["Sandbag Bear Hug Carry", "carry", "conditioning", ["sandbag"], ["core", "back", "arms"]],
  ["Yoke Carry", "carry", "conditioning", ["other"], ["core", "back", "quads"]],

  // ---------- Core ----------
  ["Sit-Up", "core", "conditioning", ["bodyweight"], ["core"]],
  ["GHD Sit-Up", "core", "gymnastics", ["other"], ["core", "quads"]],
  ["V-Up", "core", "conditioning", ["bodyweight"], ["core"]],
  ["Hollow Hold", "core", "gymnastics", ["bodyweight"], ["core"]],
  ["Hollow Rock", "core", "gymnastics", ["bodyweight"], ["core"]],
  ["Arch Hold", "core", "gymnastics", ["bodyweight"], ["back", "glutes"]],
  ["Plank", "core", "strength", ["bodyweight"], ["core"]],
  ["Side Plank", "core", "strength", ["bodyweight"], ["core"]],
  ["Russian Twist", "core", "conditioning", ["medicine_ball"], ["core"]],
  ["Medicine Ball Slam", "core", "conditioning", ["medicine_ball"], ["core", "shoulders", "back"]],
  ["Toes-to-Bar", "core", "gymnastics", ["pullup_bar"], ["core", "back"]],
  ["Knees-to-Elbows", "core", "gymnastics", ["pullup_bar"], ["core", "back"]],
  ["Hanging Knee Raise", "core", "gymnastics", ["pullup_bar"], ["core"]],
  ["Hanging Leg Raise", "core", "gymnastics", ["pullup_bar"], ["core"]],
  ["Windshield Wiper", "core", "gymnastics", ["pullup_bar"], ["core"]],
  ["L-Sit", "core", "gymnastics", ["parallettes"], ["core", "arms"]],
  ["Ring L-Sit", "core", "gymnastics", ["rings"], ["core", "arms"]],
  ["Hanging L-Sit", "core", "gymnastics", ["pullup_bar"], ["core"]],
  ["Dragon Flag", "core", "gymnastics", ["bodyweight"], ["core"]],
  ["Ab Wheel Rollout", "core", "strength", ["other"], ["core"]],
  ["Barbell Rollout", "core", "strength", ["barbell"], ["core"]],
  ["Dead Bug", "core", "strength", ["bodyweight"], ["core"]],
  ["Bird Dog", "core", "strength", ["bodyweight"], ["core", "back"]],
  ["Pallof Press", "core", "strength", ["other"], ["core"]],
  ["Turkish Get-Up", "core", "strength", ["kettlebell"], ["core", "shoulders", "glutes"]],

  // ---------- Olympic ----------
  ["Snatch", "olympic", "olympic", ["barbell"], fullBody],
  ["Power Snatch", "olympic", "olympic", ["barbell"], fullBody],
  ["Hang Snatch", "olympic", "olympic", ["barbell"], fullBody],
  ["Hang Power Snatch", "olympic", "olympic", ["barbell"], fullBody],
  ["Muscle Snatch", "olympic", "olympic", ["barbell"], ["back", "shoulders", "arms"]],
  ["Snatch Balance", "olympic", "olympic", ["barbell"], ["quads", "glutes", "shoulders", "core"]],
  ["Snatch Pull", "olympic", "olympic", ["barbell"], posterior],
  ["Snatch Deadlift", "olympic", "olympic", ["barbell"], posterior],
  ["Clean", "olympic", "olympic", ["barbell"], fullBody],
  ["Power Clean", "olympic", "olympic", ["barbell"], fullBody],
  ["Hang Clean", "olympic", "olympic", ["barbell"], fullBody],
  ["Hang Power Clean", "olympic", "olympic", ["barbell"], fullBody],
  ["Clean Pull", "olympic", "olympic", ["barbell"], posterior],
  ["Clean Deadlift", "olympic", "olympic", ["barbell"], posterior],
  ["Clean and Jerk", "olympic", "olympic", ["barbell"], fullBody],
  ["Power Clean and Push Jerk", "olympic", "olympic", ["barbell"], fullBody],
  ["Push Jerk", "olympic", "olympic", ["barbell"], ["shoulders", "arms", "quads"]],
  ["Split Jerk", "olympic", "olympic", ["barbell"], ["shoulders", "arms", "quads", "glutes"]],
  ["Squat Jerk", "olympic", "olympic", ["barbell"], ["shoulders", "arms", "quads", "glutes"]],
  ["Dumbbell Snatch", "olympic", "conditioning", ["dumbbell"], fullBody],
  ["Dumbbell Clean", "olympic", "conditioning", ["dumbbell"], fullBody],
  ["Dumbbell Hang Clean", "olympic", "conditioning", ["dumbbell"], fullBody],
  ["Dumbbell Clean and Jerk", "olympic", "conditioning", ["dumbbell"], fullBody],
  ["Kettlebell Snatch", "olympic", "conditioning", ["kettlebell"], fullBody],
  ["Kettlebell Clean", "olympic", "conditioning", ["kettlebell"], fullBody],
  ["Kettlebell Clean and Jerk", "olympic", "conditioning", ["kettlebell"], fullBody],
  ["Sandbag Clean", "olympic", "conditioning", ["sandbag"], fullBody],
  ["Medicine Ball Clean", "olympic", "conditioning", ["medicine_ball"], fullBody],

  // ---------- Gymnastics skills ----------
  ["Bar Muscle-Up", "gymnastics", "gymnastics", ["pullup_bar"], ["back", "chest", "arms", "core"]],
  ["Ring Muscle-Up", "gymnastics", "gymnastics", ["rings"], ["back", "chest", "arms", "core"]],
  ["Strict Ring Muscle-Up", "gymnastics", "gymnastics", ["rings"], ["back", "chest", "arms", "core"]],
  ["Kip Swing", "gymnastics", "gymnastics", ["pullup_bar"], ["back", "core", "shoulders"]],
  ["Ring Support Hold", "gymnastics", "gymnastics", ["rings"], ["chest", "shoulders", "arms", "core"]],
  ["Skin the Cat", "gymnastics", "gymnastics", ["rings"], ["back", "shoulders", "core"]],
  ["Front Lever", "gymnastics", "gymnastics", ["rings", "pullup_bar"], ["back", "core"]],
  ["Back Lever", "gymnastics", "gymnastics", ["rings", "pullup_bar"], ["back", "shoulders", "core"]],
  ["Handstand Hold", "gymnastics", "gymnastics", ["bodyweight"], ["shoulders", "arms", "core"]],
  ["Wall-Facing Handstand Hold", "gymnastics", "gymnastics", ["bodyweight"], ["shoulders", "arms", "core"]],
  ["Parallette Handstand Hold", "gymnastics", "gymnastics", ["parallettes"], ["shoulders", "arms", "core"]],
  ["Handstand Walk", "gymnastics", "gymnastics", ["bodyweight"], ["shoulders", "arms", "core"]],
  ["Tuck Planche", "gymnastics", "gymnastics", ["parallettes"], ["shoulders", "arms", "core"]],

  // ---------- Cardio ----------
  ["Run", "cardio", "conditioning", ["bodyweight"], ["quads", "hamstrings", "glutes"]],
  ["Sprint", "cardio", "conditioning", ["bodyweight"], ["quads", "hamstrings", "glutes"]],
  ["Shuttle Run", "cardio", "conditioning", ["bodyweight"], ["quads", "hamstrings", "glutes"]],
  ["Row", "cardio", "conditioning", ["rower"], ["back", "quads", "hamstrings", "arms"]],
  ["Assault Bike", "cardio", "conditioning", ["bike"], ["quads", "glutes", "arms"]],
  ["Bike Erg", "cardio", "conditioning", ["bike"], ["quads", "glutes"]],
  ["Ski Erg", "cardio", "conditioning", ["ski_erg"], ["back", "arms", "core"]],
  ["Swim", "cardio", "conditioning", ["other"], ["back", "shoulders", "core"]],
  ["Single-Under", "cardio", "conditioning", ["jump_rope"], ["quads", "shoulders"]],
  ["Double-Under", "cardio", "conditioning", ["jump_rope"], ["quads", "shoulders"]],
  ["Crossover Single-Under", "cardio", "conditioning", ["jump_rope"], ["quads", "shoulders"]],
  ["Burpee", "cardio", "conditioning", ["bodyweight"], ["quads", "chest", "shoulders", "core"]],
  ["Lateral Burpee", "cardio", "conditioning", ["bodyweight"], ["quads", "chest", "shoulders", "core"]],
  ["Bar-Facing Burpee", "cardio", "conditioning", ["barbell"], ["quads", "chest", "shoulders", "core"]],
  ["Burpee Box Jump Over", "cardio", "conditioning", ["box"], ["quads", "glutes", "chest", "shoulders"]],
  ["Burpee Pull-Up", "cardio", "conditioning", ["pullup_bar"], ["back", "chest", "arms", "quads"]],
  ["Mountain Climber", "cardio", "conditioning", ["bodyweight"], ["core", "shoulders", "quads"]],
  ["Jumping Jack", "cardio", "conditioning", ["bodyweight"], ["quads", "shoulders"]],

  // ---------- Mobility: the pattern is the closest match, since every exercise needs one ----------
  ["Deep Squat Hold", "squat", "mobility", ["bodyweight"], legs],
  ["Cossack Squat", "squat", "mobility", ["bodyweight"], ["quads", "glutes", "hamstrings"]],
  ["Couch Stretch", "squat", "mobility", ["bodyweight"], ["quads"]],
  ["World's Greatest Stretch", "squat", "mobility", ["bodyweight"], ["quads", "hamstrings", "glutes", "back"]],
  ["Pigeon Stretch", "hinge", "mobility", ["bodyweight"], ["glutes"]],
  ["Hamstring Stretch", "hinge", "mobility", ["bodyweight"], ["hamstrings"]],
  ["Downward Dog", "hinge", "mobility", ["bodyweight"], ["hamstrings", "shoulders", "back"]],
  ["Shoulder Pass-Through", "push", "mobility", ["other"], ["shoulders", "chest"]],
  ["Thoracic Rotation", "core", "mobility", ["bodyweight"], ["back"]],
  ["Cat-Cow", "core", "mobility", ["bodyweight"], ["back", "core"]],
];

// Parsed here so a typo or an invalid row stops the seed instead of reaching the database.
export const exerciseSeed = rows.map(
  ([name, pattern, category, equipment, muscleGroups]) =>
    createExerciseInput.parse({
      name,
      pattern,
      category,
      equipment,
      muscleGroups,
    })
);

/** Adds missing exercises and returns how many were added. Existing rows are left untouched. */
export async function seedExercises() {
  const added = await db
    .insert(exercises)
    .values(exerciseSeed)
    .onConflictDoNothing({ target: exercises.name })
    .returning({ id: exercises.id });

  return added.length;
}
