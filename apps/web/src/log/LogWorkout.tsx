import type { Exercise, Workout } from "@readiness/shared";
import { useState } from "react";
import { createWorkout } from "../api.js";
import { EntryRow } from "./EntryRow.js";
import { ExercisePicker } from "./ExercisePicker.js";
import { useDraft } from "./use-draft.js";
import { useExercises } from "./use-exercises.js";
import {
  type DraftEntry,
  type WorkoutDraft,
  copyEntry,
  newEntry,
  toWorkoutInput,
} from "./workout-draft.js";

const workoutTypes: { value: Workout["type"]; label: string }[] = [
  { value: "heavy_strength", label: "Heavy strength" },
  { value: "metcon", label: "Metcon" },
  { value: "skill", label: "Skill" },
  { value: "endurance", label: "Endurance" },
  { value: "mixed", label: "Mixed" },
  { value: "rest", label: "Rest" },
];

const rpeValues = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

export function LogWorkout() {
  const { draft, setDraft, resetDraft } = useDraft();
  const { state: exercises, retry } = useExercises();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // Any edit clears old messages, which no longer describe the current form.
  function update(change: Partial<WorkoutDraft>) {
    setDraft((current) => ({ ...current, ...change }));
    setErrors([]);
    setSaved(false);
  }

  function addExercise(exercise: Exercise) {
    update({ entries: [...draft.entries, newEntry(exercise)] });
    setPickerOpen(false);
  }

  function changeEntry(changed: DraftEntry) {
    update({
      entries: draft.entries.map((entry) =>
        entry.key === changed.key ? changed : entry
      ),
    });
  }

  function copyAfter(index: number) {
    const entries = [...draft.entries];
    entries.splice(index + 1, 0, copyEntry(entries[index]));
    update({ entries });
  }

  function removeEntry(key: string) {
    update({ entries: draft.entries.filter((entry) => entry.key !== key) });
  }

  async function save() {
    const result = toWorkoutInput(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setSaving(true);
    setErrors([]);
    try {
      await createWorkout(result.input);
      // Cleared only now, so a failed save cannot lose the workout.
      resetDraft();
      setSaved(true);
    } catch (error) {
      setErrors([(error as Error).message]);
    } finally {
      setSaving(false);
    }
  }

  if (pickerOpen && exercises.status === "ready") {
    return (
      <ExercisePicker
        exercises={exercises.exercises}
        onPick={addExercise}
        onClose={() => setPickerOpen(false)}
      />
    );
  }

  return (
    <main className="log">
      <label className="field">
        Date
        <input
          type="date"
          value={draft.date}
          onChange={(event) => update({ date: event.target.value })}
        />
      </label>

      <fieldset>
        <legend>Type</legend>
        <div className="choices">
          {workoutTypes.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className="choice"
              aria-pressed={draft.type === value}
              onClick={() => update({ type: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {draft.entries.map((entry, index) => (
        <EntryRow
          key={entry.key}
          entry={entry}
          onChange={changeEntry}
          onCopy={() => copyAfter(index)}
          onRemove={() => removeEntry(entry.key)}
        />
      ))}

      {exercises.status === "error" ? (
        <div role="alert">
          <p className="message">{exercises.message}</p>
          <button type="button" className="secondary wide" onClick={retry}>
            Try loading exercises again
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="secondary wide"
          disabled={exercises.status === "loading"}
          onClick={() => setPickerOpen(true)}
        >
          {exercises.status === "loading"
            ? "Loading exercises"
            : "Add exercise"}
        </button>
      )}

      <fieldset>
        <legend>RPE</legend>
        <div className="choices rpe">
          {rpeValues.map((value) => (
            <button
              key={value}
              type="button"
              className="choice"
              aria-label={`RPE ${value}`}
              aria-pressed={draft.rpe === value}
              // Pressing the selected value again clears it, since RPE is optional.
              onClick={() => update({ rpe: draft.rpe === value ? "" : value })}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        Duration (min)
        <input
          className="number"
          inputMode="numeric"
          autoComplete="off"
          value={draft.durationMin}
          onChange={(event) => update({ durationMin: event.target.value })}
        />
      </label>

      <label className="field">
        Note
        <textarea
          rows={2}
          value={draft.note}
          onChange={(event) => update({ note: event.target.value })}
        />
      </label>

      <div className="save-bar">
        {errors.length > 0 && (
          <ul className="message" role="alert">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        {saved && (
          // biome-ignore lint/a11y/useSemanticElements: output is for calculation results, not status messages.
          <p className="message" role="status">
            Workout saved.
          </p>
        )}
        <button
          type="button"
          className="primary wide"
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving" : "Save workout"}
        </button>
      </div>
    </main>
  );
}
