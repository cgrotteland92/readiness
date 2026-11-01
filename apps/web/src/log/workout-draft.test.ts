import type { Exercise } from "@readiness/shared";
import { describe, expect, it } from "vitest";
import {
  type DraftEntry,
  type WorkoutDraft,
  copyEntry,
  emptyDraft,
  localDate,
  newEntry,
  toWorkoutInput,
} from "./workout-draft.js";

const backSquat: Exercise = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Back Squat",
  pattern: "squat",
  equipment: ["barbell"],
  category: "strength",
  muscleGroups: ["quads", "glutes"],
};

function entry(values: Partial<DraftEntry> = {}): DraftEntry {
  return { ...newEntry(backSquat), ...values };
}

function draft(values: Partial<WorkoutDraft> = {}): WorkoutDraft {
  return {
    ...emptyDraft("2026-11-01"),
    type: "metcon",
    entries: [entry()],
    ...values,
  };
}

function errorsFor(values: Partial<WorkoutDraft>) {
  const result = toWorkoutInput(draft(values));
  return result.ok ? [] : result.errors;
}

describe("localDate", () => {
  it("uses the local day, even just after midnight", () => {
    expect(localDate(new Date(2026, 10, 1, 0, 5))).toBe("2026-11-01");
  });

  it("pads month and day", () => {
    expect(localDate(new Date(2026, 0, 2))).toBe("2026-01-02");
  });
});

describe("copyEntry", () => {
  it("keeps the values with a new key", () => {
    const original = entry({ reps: "5" });
    const copy = copyEntry(original);

    expect(copy.reps).toBe("5");
    expect(copy.key).not.toBe(original.key);
  });
});

describe("toWorkoutInput", () => {
  it("converts typed strings to numbers", () => {
    const result = toWorkoutInput(
      draft({
        rpe: "8",
        durationMin: "45",
        entries: [entry({ sets: "5", reps: "3", weightKg: "100.5" })],
      })
    );

    expect(result).toEqual({
      ok: true,
      input: {
        date: "2026-11-01",
        type: "metcon",
        rpe: 8,
        durationMin: 45,
        entries: [
          {
            exerciseId: backSquat.id,
            position: 0,
            sets: 5,
            reps: 3,
            weightKg: 100.5,
          },
        ],
      },
    });
  });

  it("accepts a comma as the decimal separator", () => {
    const result = toWorkoutInput(
      draft({ entries: [entry({ weightKg: "100,5" })] })
    );

    expect(result.ok && result.input.entries[0].weightKg).toBe(100.5);
  });

  it("leaves blank fields out instead of sending zero", () => {
    const result = toWorkoutInput(
      draft({ note: "   ", entries: [entry({ sets: " ", note: " " })] })
    );

    expect(result.ok && result.input.note).toBeUndefined();
    expect(result.ok && result.input.entries[0]).toEqual({
      exerciseId: backSquat.id,
      position: 0,
    });
  });

  it("keeps a typed zero", () => {
    const result = toWorkoutInput(
      draft({ entries: [entry({ weightKg: "0" })] })
    );

    expect(result.ok && result.input.entries[0].weightKg).toBe(0);
  });

  it("combines minutes and seconds", () => {
    const result = toWorkoutInput(
      draft({
        entries: [
          entry({ minutes: "5", seconds: "30" }),
          entry({ minutes: "2" }),
          entry({ seconds: "45" }),
        ],
      })
    );

    expect(result.ok && result.input.entries.map((e) => e.durationSec)).toEqual(
      [330, 120, 45]
    );
  });

  it("numbers positions in list order", () => {
    const result = toWorkoutInput(draft({ entries: [entry(), entry()] }));

    expect(result.ok && result.input.entries.map((e) => e.position)).toEqual([
      0, 1,
    ]);
  });

  it("requires a workout type", () => {
    expect(errorsFor({ type: "" })).toEqual(["Choose a workout type."]);
  });

  it("requires an exercise, unless it is a rest day", () => {
    expect(errorsFor({ entries: [] })).toEqual(["Add at least one exercise."]);
    expect(errorsFor({ type: "rest", entries: [] })).toEqual([]);
  });

  it("names the exercise and field in an error", () => {
    expect(errorsFor({ entries: [entry({ reps: "abc" })] })).toEqual([
      "Back Squat, Reps: Enter a number.",
    ]);
  });

  it.each([
    ["fractional reps", { reps: "2.5" }],
    ["negative weight", { weightKg: "-1" }],
    ["two commas", { weightKg: "1,5,5" }],
    ["unreadable minutes", { minutes: "x" }],
    ["a weight too large for the database", { weightKg: "10000" }],
  ])("rejects %s", (_label, values) => {
    expect(errorsFor({ entries: [entry(values)] })).toHaveLength(1);
  });

  it("rejects a date that does not exist", () => {
    expect(errorsFor({ date: "2026-02-30" })).toEqual([
      "Date: Not a real calendar date.",
    ]);
  });

  it("rejects an empty date", () => {
    expect(errorsFor({ date: "" }).length).toBeGreaterThan(0);
  });
});
