import { useState } from "react";
import type { DraftEntry } from "./workout-draft.js";

type Props = {
  entry: DraftEntry;
  onChange: (entry: DraftEntry) => void;
  onCopy: () => void;
  onRemove: () => void;
};

type NumberField = {
  field: keyof DraftEntry;
  label: string;
  inputMode: "numeric" | "decimal";
};

const mainFields: NumberField[] = [
  { field: "sets", label: "Sets", inputMode: "numeric" },
  { field: "reps", label: "Reps", inputMode: "numeric" },
  { field: "weightKg", label: "Kg", inputMode: "decimal" },
];

const extraFields: NumberField[] = [
  { field: "minutes", label: "Min", inputMode: "numeric" },
  { field: "seconds", label: "Sec", inputMode: "numeric" },
  { field: "distanceM", label: "Metres", inputMode: "decimal" },
];

export function EntryRow({ entry, onChange, onCopy, onRemove }: Props) {
  // Time and distance are what you log for these, so they start open.
  const [startOpen] = useState(
    entry.pattern === "cardio" ||
      entry.pattern === "carry" ||
      entry.minutes !== "" ||
      entry.seconds !== "" ||
      entry.distanceM !== "" ||
      entry.note !== ""
  );

  function numberInput({ field, label, inputMode }: NumberField) {
    return (
      <label key={field} className="field">
        {label}
        <input
          className="number"
          inputMode={inputMode}
          autoComplete="off"
          value={entry[field]}
          onChange={(event) =>
            onChange({ ...entry, [field]: event.target.value })
          }
        />
      </label>
    );
  }

  return (
    <section className="entry" aria-label={entry.exerciseName}>
      <h2>{entry.exerciseName}</h2>
      <div className="fields">{mainFields.map(numberInput)}</div>

      <details open={startOpen}>
        <summary>Time, distance, note</summary>
        <div className="fields">{extraFields.map(numberInput)}</div>
        <label className="field">
          Note
          <input
            value={entry.note}
            onChange={(event) =>
              onChange({ ...entry, note: event.target.value })
            }
          />
        </label>
      </details>

      <div className="entry-actions">
        <button type="button" className="secondary" onClick={onCopy}>
          Same again
        </button>
        <button type="button" className="quiet" onClick={onRemove}>
          Remove
        </button>
      </div>
    </section>
  );
}
