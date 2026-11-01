import { useEffect, useState } from "react";
import { type WorkoutDraft, emptyDraft, localDate } from "./workout-draft.js";

const storageKey = "readiness.workout-draft";

function loadDraft(): WorkoutDraft {
  try {
    const stored = localStorage.getItem(storageKey);
    const parsed = stored ? JSON.parse(stored) : undefined;
    // A draft with exercises keeps its date: that is the day you trained.
    // An empty one would otherwise open tomorrow still showing today's date.
    if (Array.isArray(parsed?.entries) && parsed.entries.length > 0) {
      return parsed;
    }
  } catch {
    // Unreadable storage is the same as having no draft.
  }
  return emptyDraft(localDate());
}

/** The workout being logged, kept on the device so a locked phone cannot lose it. */
export function useDraft() {
  const [draft, setDraft] = useState(loadDraft);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // Storage can be full or blocked. The form still works without it.
    }
  }, [draft]);

  function resetDraft() {
    setDraft(emptyDraft(localDate()));
  }

  return { draft, setDraft, resetDraft };
}
