import {
  type CreateWorkoutInput,
  type Exercise,
  type Workout,
  createWorkoutInput,
} from "@readiness/shared";

// The form holds what was typed, as strings, so a half-typed "100," is not lost.
// toWorkoutInput turns it into validated numbers when saving.
export type DraftEntry = {
  // Identifies the row in React. Not sent to the API.
  key: string;
  exerciseId: string;
  exerciseName: string;
  pattern: Exercise["pattern"];
  sets: string;
  reps: string;
  weightKg: string;
  minutes: string;
  seconds: string;
  distanceM: string;
  note: string;
};

export type WorkoutDraft = {
  date: string;
  type: Workout["type"] | "";
  durationMin: string;
  rpe: string;
  note: string;
  entries: DraftEntry[];
};

/** Today on this device. toISOString would give yesterday just after midnight. */
export function localDate(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function emptyDraft(date: string): WorkoutDraft {
  return { date, type: "", durationMin: "", rpe: "", note: "", entries: [] };
}

// crypto.randomUUID only exists on HTTPS, and a phone on Wi-Fi uses plain HTTP.
function newKey() {
  return `${Date.now()}-${Math.random()}`;
}

export function newEntry(exercise: Exercise): DraftEntry {
  return {
    key: newKey(),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    pattern: exercise.pattern,
    sets: "",
    reps: "",
    weightKg: "",
    minutes: "",
    seconds: "",
    distanceM: "",
    note: "",
  };
}

export function copyEntry(entry: DraftEntry): DraftEntry {
  return { ...entry, key: newKey() };
}

// Blank means not entered. Anything unreadable becomes NaN, which validation rejects.
function toNumber(value: string) {
  const trimmed = value.trim();
  // Norwegian phone keypads often type a comma as the decimal separator.
  return trimmed === "" ? undefined : Number(trimmed.replace(",", "."));
}

function toText(value: string) {
  return value.trim() || undefined;
}

function toSeconds(minutes: string, seconds: string) {
  const min = toNumber(minutes);
  const sec = toNumber(seconds);
  if (min === undefined && sec === undefined) {
    return undefined;
  }
  return (min ?? 0) * 60 + (sec ?? 0);
}

const labels: Record<string, string> = {
  date: "Date",
  durationMin: "Duration",
  rpe: "RPE",
  sets: "Sets",
  reps: "Reps",
  weightKg: "Kg",
  durationSec: "Time",
  distanceM: "Distance",
};

export type DraftResult =
  | { ok: true; input: CreateWorkoutInput }
  | { ok: false; errors: string[] };

export function toWorkoutInput(draft: WorkoutDraft): DraftResult {
  if (draft.type === "") {
    return { ok: false, errors: ["Choose a workout type."] };
  }
  if (draft.entries.length === 0 && draft.type !== "rest") {
    return { ok: false, errors: ["Add at least one exercise."] };
  }

  const parsed = createWorkoutInput.safeParse({
    date: draft.date,
    type: draft.type,
    durationMin: toNumber(draft.durationMin),
    rpe: toNumber(draft.rpe),
    note: toText(draft.note),
    entries: draft.entries.map((entry, position) => ({
      exerciseId: entry.exerciseId,
      position,
      sets: toNumber(entry.sets),
      reps: toNumber(entry.reps),
      weightKg: toNumber(entry.weightKg),
      durationSec: toSeconds(entry.minutes, entry.seconds),
      distanceM: toNumber(entry.distanceM),
      note: toText(entry.note),
    })),
  });
  if (parsed.success) {
    return { ok: true, input: parsed.data };
  }

  return {
    ok: false,
    errors: parsed.error.issues.map((issue) => {
      const field = String(issue.path.at(-1));
      const label = labels[field] ?? field;
      const message =
        issue.code === "invalid_type" ? "Enter a number" : issue.message;
      if (issue.path[0] === "entries") {
        const entry = draft.entries[Number(issue.path[1])];
        return `${entry.exerciseName}, ${label}: ${message}.`;
      }
      return `${label}: ${message}.`;
    }),
  };
}
