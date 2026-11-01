import type { Exercise } from "@readiness/shared";
import { useEffect, useState } from "react";
import { fetchExercises } from "../api.js";

type ExercisesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; exercises: Exercise[] };

export function useExercises() {
  const [state, setState] = useState<ExercisesState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is what triggers a retry.
  useEffect(() => {
    let ignore = false;
    setState({ status: "loading" });
    fetchExercises().then(
      (exercises) => {
        if (!ignore) setState({ status: "ready", exercises });
      },
      (error: Error) => {
        if (!ignore) setState({ status: "error", message: error.message });
      }
    );
    return () => {
      ignore = true;
    };
  }, [attempt]);

  return { state, retry: () => setAttempt((n) => n + 1) };
}
