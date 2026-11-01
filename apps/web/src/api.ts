import type { CreateWorkoutInput, Exercise, Workout } from "@readiness/shared";

// A message that is safe to show as it is.
export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, init);
  } catch {
    throw new ApiError("Could not reach the server. Your data is still here.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new ApiError(body?.error ?? `Something went wrong (${res.status}).`);
  }
  return res.json();
}

export function fetchExercises() {
  return request<Exercise[]>("/exercises");
}

export function createWorkout(input: CreateWorkoutInput) {
  return request<Workout>("/workouts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
