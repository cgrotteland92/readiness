import type { Exercise } from "@readiness/shared";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogWorkout } from "./LogWorkout.js";
import { localDate } from "./workout-draft.js";

const exercises: Exercise[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Back Squat",
    pattern: "squat",
    equipment: ["barbell"],
    category: "strength",
    muscleGroups: ["quads", "glutes"],
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Row",
    pattern: "cardio",
    equipment: ["rower"],
    category: "conditioning",
    muscleGroups: ["back"],
  },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

const fetchMock = vi.fn<typeof fetch>();
let saveResponse: () => Response | Promise<Response>;

function postedBody() {
  const call = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
  return call ? JSON.parse(call[1]?.body as string) : undefined;
}

async function renderReady() {
  const user = userEvent.setup();
  const view = render(<LogWorkout />);
  await screen.findByRole("button", { name: "Add exercise" });
  return { user, ...view };
}

async function addExercise(
  user: ReturnType<typeof userEvent.setup>,
  name: string
) {
  await user.click(screen.getByRole("button", { name: "Add exercise" }));
  await user.click(screen.getByRole("button", { name: new RegExp(name) }));
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  saveResponse = () => json({ id: "saved" }, 201);
  fetchMock.mockImplementation(async (_url, init) =>
    init?.method === "POST" ? saveResponse() : json(exercises)
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("logging a workout", () => {
  it("starts on today's date", async () => {
    await renderReady();

    expect(screen.getByLabelText("Date")).toHaveProperty("value", localDate());
  });

  it("saves what was entered and clears the form", async () => {
    const { user } = await renderReady();

    await user.click(screen.getByRole("button", { name: "Heavy strength" }));
    await addExercise(user, "Back Squat");
    const entry = within(screen.getByRole("region", { name: "Back Squat" }));
    await user.type(entry.getByLabelText("Sets"), "5");
    await user.type(entry.getByLabelText("Reps"), "3");
    await user.type(entry.getByLabelText("Kg"), "100,5");
    await user.click(screen.getByRole("button", { name: "RPE 8" }));
    await user.click(screen.getByRole("button", { name: "Save workout" }));

    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      "Workout saved."
    );
    expect(postedBody()).toEqual({
      date: localDate(),
      type: "heavy_strength",
      rpe: 8,
      entries: [
        {
          exerciseId: exercises[0].id,
          position: 0,
          sets: 5,
          reps: 3,
          weightKg: 100.5,
        },
      ],
    });
    expect(screen.queryByRole("region", { name: "Back Squat" })).toBeNull();
  });

  it("copies an entry with Same again", async () => {
    const { user } = await renderReady();
    await addExercise(user, "Back Squat");
    await user.type(screen.getByLabelText("Reps"), "5");

    await user.click(screen.getByRole("button", { name: "Same again" }));

    const entries = screen.getAllByRole("region", { name: "Back Squat" });
    expect(entries).toHaveLength(2);
    expect(within(entries[1]).getByLabelText("Reps")).toHaveProperty(
      "value",
      "5"
    );
  });

  it("removes an entry", async () => {
    const { user } = await renderReady();
    await addExercise(user, "Back Squat");

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.queryByRole("region", { name: "Back Squat" })).toBeNull();
  });

  it("clears RPE when the selected value is pressed again", async () => {
    const { user } = await renderReady();
    const rpe = screen.getByRole("button", { name: "RPE 8" });

    await user.click(rpe);
    expect(rpe.getAttribute("aria-pressed")).toBe("true");
    await user.click(rpe);

    expect(rpe.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("the exercise picker", () => {
  it("filters by every typed word", async () => {
    const { user } = await renderReady();
    await user.click(screen.getByRole("button", { name: "Add exercise" }));

    await user.type(screen.getByLabelText("Search exercises"), "squat back");

    expect(screen.getByRole("button", { name: /Back Squat/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Row/ })).toBeNull();
  });

  it("says so when nothing matches", async () => {
    const { user } = await renderReady();
    await user.click(screen.getByRole("button", { name: "Add exercise" }));

    await user.type(screen.getByLabelText("Search exercises"), "zzz");

    expect(screen.getByText("No exercises found.")).toBeTruthy();
  });

  it("closes without adding anything", async () => {
    const { user } = await renderReady();
    await user.click(screen.getByRole("button", { name: "Add exercise" }));

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.getByRole("button", { name: "Add exercise" })).toBeTruthy();
    expect(screen.queryByRole("region")).toBeNull();
  });
});

describe("when something is wrong", () => {
  it("shows invalid input and does not call the API", async () => {
    const { user } = await renderReady();

    await user.click(screen.getByRole("button", { name: "Save workout" }));

    expect(screen.getByRole("alert").textContent).toBe(
      "Choose a workout type."
    );
    expect(postedBody()).toBeUndefined();
  });

  it.each([
    [
      "an API error",
      () => json({ error: "Invalid input" }, 400),
      "Invalid input",
    ],
    [
      "a server error without details",
      () => new Response("", { status: 500 }),
      "Something went wrong (500).",
    ],
    [
      "a network failure",
      () => Promise.reject(new TypeError("Failed to fetch")),
      "Could not reach the server. Your data is still here.",
    ],
  ])("keeps the workout after %s", async (_label, response, message) => {
    saveResponse = response;
    const { user } = await renderReady();
    await user.click(screen.getByRole("button", { name: "Metcon" }));
    await addExercise(user, "Back Squat");
    await user.type(screen.getByLabelText("Reps"), "5");

    await user.click(screen.getByRole("button", { name: "Save workout" }));

    expect((await screen.findByRole("alert")).textContent).toBe(message);
    expect(screen.getByLabelText("Reps")).toHaveProperty("value", "5");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("blocks a second save while the first is running", async () => {
    let finish = (_response: Response) => {};
    saveResponse = () =>
      new Promise((resolve) => {
        finish = resolve;
      });
    const { user } = await renderReady();
    await user.click(screen.getByRole("button", { name: "Metcon" }));
    await addExercise(user, "Back Squat");

    await user.click(screen.getByRole("button", { name: "Save workout" }));
    const button = screen.getByRole("button", { name: "Saving" });
    await user.click(button);

    expect(button).toHaveProperty("disabled", true);
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")
    ).toHaveLength(1);

    finish(json({ id: "saved" }, 201));
    await screen.findByRole("status");
  });

  it("offers a retry when exercises fail to load", async () => {
    fetchMock.mockImplementationOnce(
      async () => new Response("", { status: 500 })
    );
    const user = userEvent.setup();
    render(<LogWorkout />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Something went wrong (500)."
    );
    await user.click(
      screen.getByRole("button", { name: "Try loading exercises again" })
    );

    expect(
      await screen.findByRole("button", { name: "Add exercise" })
    ).toBeTruthy();
  });
});

describe("the saved draft", () => {
  it("survives a reload", async () => {
    const { user, unmount } = await renderReady();
    await user.click(screen.getByRole("button", { name: "Metcon" }));
    await addExercise(user, "Back Squat");
    await user.type(screen.getByLabelText("Reps"), "5");

    unmount();
    await renderReady();

    expect(screen.getByLabelText("Reps")).toHaveProperty("value", "5");
    expect(
      screen
        .getByRole("button", { name: "Metcon" })
        .getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("is gone after a successful save", async () => {
    const { user, unmount } = await renderReady();
    await user.click(screen.getByRole("button", { name: "Metcon" }));
    await addExercise(user, "Back Squat");
    await user.click(screen.getByRole("button", { name: "Save workout" }));
    await screen.findByRole("status");

    unmount();
    await renderReady();

    expect(screen.queryByRole("region", { name: "Back Squat" })).toBeNull();
  });

  it("keeps its date when it has exercises", async () => {
    const { user, unmount } = await renderReady();
    await addExercise(user, "Back Squat");
    const stored = JSON.parse(
      localStorage.getItem("readiness.workout-draft") ?? "{}"
    );
    unmount();
    localStorage.setItem(
      "readiness.workout-draft",
      JSON.stringify({ ...stored, date: "2020-01-01" })
    );

    await renderReady();

    expect(screen.getByLabelText("Date")).toHaveProperty("value", "2020-01-01");
  });

  it("uses today instead of an empty draft's old date", async () => {
    localStorage.setItem(
      "readiness.workout-draft",
      JSON.stringify({ date: "2020-01-01", type: "", entries: [] })
    );

    await renderReady();

    expect(screen.getByLabelText("Date")).toHaveProperty("value", localDate());
  });

  it("ignores unreadable storage", async () => {
    localStorage.setItem("readiness.workout-draft", "{not json");

    await renderReady();

    expect(screen.getByLabelText("Date")).toHaveProperty("value", localDate());
  });
});
