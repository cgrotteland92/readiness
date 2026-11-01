# Readiness

A CrossFit training log that will adjust the day's session based on recovery (HRV). I'm building it to use myself, with a Garmin watch, and as a portfolio project.

Readiness is a training tool. It does not give medical or health advice, and its recovery categories are experimental training indicators, not medical assessments.

## Status

The project is built in layers, and each one has to work on its own before the next starts.

| Layer | What it adds | Status |
| --- | --- | --- |
| 1. Log and exercise library | Database, API, seeded exercises, React UI for logging | API, seed data and workout logging built; history and recovery screens not started |
| 2. HRV import | Garmin export parser, HRV trend against training load | Planned |
| 3. AI | Session proposals checked against fixed rules in code | Planned |
| 4. PWA | Installable and good on a phone | Planned |

See [TODO.md](TODO.md) for the detailed task list.

## Stack

- **TypeScript** across a pnpm monorepo
- **Hono** on Node for the API
- **Postgres** in Docker, with **Drizzle** for queries and migrations
- **Zod** schemas shared between the API and the frontend
- **React** and **Vite** for the frontend
- **Vitest** for tests and **Biome** for linting and formatting

## Project structure

```text
apps/api          API routes, database schema, migrations and seed data
apps/web          React frontend
packages/shared   Zod schemas and types used by both
```

## Getting started

You need Node 22.18 or newer, pnpm and Docker.

```sh
pnpm install
cp .env.example .env    # then change the password
pnpm --filter @readiness/shared build
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm --filter @readiness/api dev    # http://localhost:3001
```

Run the checks with:

```sh
pnpm test
pnpm typecheck
pnpm lint
```

Tests use a separate `<database>_test` database, which they create and migrate automatically. They need Postgres running, but never touch your own data.

## API

| Method and path | Purpose |
| --- | --- |
| `POST /exercises` | Create an exercise |
| `GET /exercises` | List exercises by name |
| `GET /exercises/:id` | Get one exercise |
| `POST /workouts` | Log a workout with its entries |
| `GET /workouts` | List workouts, newest first |
| `GET /workouts/:id` | Get one workout |
| `PUT /workouts/:id` | Replace a workout and its entries |
| `DELETE /workouts/:id` | Delete a workout |
| `POST /recovery-days` | Log a recovery day |
| `GET /recovery-days?from=&to=` | List recovery days in a date range |
| `GET /recovery-days/:date` | Get one recovery day |
| `PUT /recovery-days/:date` | Correct a logged day |
| `DELETE /recovery-days/:date` | Delete a logged day |

Invalid input returns `400`, a missing record `404`, a duplicate `409`, and unexpected failures a generic `500` with the details kept in the server log.

## Design decisions

- **Shared Zod schemas:** the API and frontend validate against the same definitions, and the database enums are built from them, so there is one list to maintain.
- **Dates as `YYYY-MM-DD` strings:** daily data has no time of day, so this avoids time zone bugs.
- **Transactions for workouts:** a workout and its entries are saved together, so a failure cannot leave half a workout or lose the entries of one being edited.
- **Recovery sources as adapters:** everything reads through a `RecoverySource` interface, so the app doesn't depend on whether data was typed in or imported. Sources are kept apart because HRV methods aren't comparable across devices.
- **Missing data stays missing:** absent recovery values are never filled in or treated as good recovery.
- **Own exercise list:** I evaluated the open [wger](https://wger.de) dataset and wrote a list instead. wger's tags are based on body parts rather than movement patterns, it lacks many CrossFit movements, and most of its entries carry share-alike licence terms.

## Planned AI layer

One orchestrator calls a set of roles with typed input and output, using the Claude API directly. HRV categories and safety rules live in plain code, so the model explains the numbers and proposes sessions but cannot calculate or override them. A proposal that fails validation is rejected, and I review any session before it becomes the plan. A set of test scenarios (evals) will make it possible to change prompts without guessing.
