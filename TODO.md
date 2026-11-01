# Readiness — todo

## Layer 1: Log and exercise library

- [x] Monorepo setup (pnpm, TypeScript, Biome)
- [x] Shared schemas (`packages/shared`)
- [x] Database setup (Postgres, migrations)
- [x] API routes: exercises (create, list, get)
- [x] API routes: workouts (create, list, get)
- [x] API routes: workouts (edit, delete)
- [x] API routes: recovery days (create, list, get)
- [x] API routes: recovery days (edit, delete)
- [x] Seed ~200 exercises with tags
- [x] React UI: log a workout
- [ ] React UI: design changes to the log screen (Christian to decide what)
- [ ] React UI: hide sets, reps and kg by default on cardio rows
- [ ] React UI: say which row an error means when an exercise appears twice
- [ ] React UI: discard workout button
- [ ] Test the log screen on a real phone
- [ ] React UI: view workout history
- [ ] React UI: log a recovery day
- [ ] Decide on hosting and login, so the app can be used at the gym
- [ ] Use the app myself for a couple of weeks before Layer 2

## Layer 2: HRV import

- [ ] Parser for Garmin `.fit` export (`_HRV_STATUS.fit`)
- [ ] `FitImportSource` adapter
- [ ] HRV trend vs. training load view

## Layer 3: AI

> Switch to Opus 4.7 before starting this layer.

- [ ] Recovery categorisation (green / yellow / red) — deterministic code
- [ ] Evals: 15–20 test scenarios with acceptance criteria
- [ ] Orchestrator + roles (recovery explainer, exercise search, training type, session designer, critic)
- [ ] Structured output (Zod schemas) for all agent I/O
- [ ] Critic rules in code (no heavy session on red day, no repeated movement pattern, etc.)

## Layer 4: PWA

- [ ] Service worker + manifest
- [ ] Installable on iOS / Android
- [ ] Offline-friendly for gym use
