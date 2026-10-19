# Readiness — todo

## Layer 1: Log and exercise library

- [x] Monorepo setup (pnpm, TypeScript, Biome)
- [x] Shared schemas (`packages/shared`)
- [ ] Database setup (Postgres, migrations)
- [ ] API routes: exercises (create, list, get)
- [ ] API routes: workouts (create, list, get)
- [ ] API routes: recovery days (create, list, get)
- [ ] Seed ~200 exercises with tags
- [ ] React UI: log a workout
- [ ] React UI: view workout history
- [ ] React UI: log a recovery day

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
