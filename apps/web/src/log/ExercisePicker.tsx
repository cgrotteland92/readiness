import type { Exercise } from "@readiness/shared";
import { useState } from "react";

type Props = {
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
};

// Every typed word must match, so "kb swing" style searches need no exact order.
function matches(exercise: Exercise, words: string[]) {
  const name = exercise.name.toLowerCase();
  return words.every((word) => name.includes(word));
}

function formatEquipment(exercise: Exercise) {
  return exercise.equipment.join(", ").replaceAll("_", " ");
}

export function ExercisePicker({ exercises, onPick, onClose }: Props) {
  const [search, setSearch] = useState("");
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const results = exercises.filter((exercise) => matches(exercise, words));

  return (
    <div className="picker">
      <div className="picker-header">
        <input
          aria-label="Search exercises"
          placeholder="Search exercises"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="button" className="quiet" onClick={onClose}>
          Close
        </button>
      </div>

      {results.length === 0 && <p className="muted">No exercises found.</p>}
      <ul className="picker-list">
        {results.map((exercise) => (
          <li key={exercise.id}>
            <button type="button" onClick={() => onPick(exercise)}>
              <span>{exercise.name}</span>
              <span className="muted">{formatEquipment(exercise)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
