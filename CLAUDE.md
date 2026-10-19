# Training app: project notes for Claude Code

This is a handoff note from a longer planning conversation. Read all of it before you start. What is decided is under "Decided". What is only suggested is under "Suggestions", and there you are welcome to push back.

## About me and how I want to work

- My name is Christian. I am moving from 14 years in construction into software development. I studied React and TypeScript (Noroff) and working on Microsoft certifications in C#, .NET, SQL and Azure.
- This is an evening project and a portfolio piece. There is no rush. I need to be able to explain every choice in an interview, so say why when you choose something, and do not build things I do not understand.
- All code, comments, commit messages and docs are in English. In chat, reply in the language I write in (I may write Norwegian or English). Keep answers short and direct, no filler.
- Ask before big decisions. Make small decisions yourself and tell me what you chose.

## Development rules

- Before changing code, inspect the relevant existing files and understand the current implementation.
- Work incrementally. Make the smallest change that solves the current task.
- Explain important technical decisions and their trade-offs in plain language.
- Do not introduce abstractions, dependencies or frameworks without a clear reason.
- After each implementation step, run the relevant type checks, linting and tests. Report what passed, what failed, and what could not be verified.
- Do not proceed to the next planned step until I have reviewed the result and approved continuing.
- Never claim a feature is complete without verifying it against its acceptance criteria.
- Never overwrite working code or rewrite entire files unnecessarily.
- Keep secrets in environment variables. Never commit API keys, credentials or personal training data.
- Update project documentation when important architectural decisions or implementation details change.

## Definition of done

Each layer must have clear acceptance criteria before implementation begins.

A layer is complete only when:

- The required functionality works end to end.
- Inputs are validated and errors are handled.
- Relevant automated tests pass.
- Type checking and linting pass.
- I understand the implementation well enough to explain its main design decisions.

## Recovery and AI safeguards

- HRV categories are experimental training indicators, not medical assessments.
- Never interpret missing data as evidence of good recovery.
- Explain which data and rules influenced a training recommendation.
- Keep safety and validation rules in deterministic code, outside the LLM.
- Reject invalid AI output and never silently bypass validation.
- Allow the user to review and adjust a proposed session before treating it as the planned workout.

## What we are building

A CrossFit training log that adjusts the day's session based on recovery (HRV). Later it gets a layer of AI agents that propose sessions. I will use the app myself (Garmin watch, CrossFit).

The idea is inspired by ExorLive (a Norwegian SaaS for exercise programs and rehabilitation), which I am considering as an employer. We are not building a clone. Do not use ExorLive's name, design or content.

## Decided

- TypeScript all the way, in one repo.
- The training app is the project. An alternative spec for AI food logging with photos was considered and set aside. It may become a later layer, but not now.
- HRV comes from Garmin. The first version uses manual entry.
- The app is a training tool. It does not give medical or health advice.

## Suggestions (not decided)

- Monorepo: `apps/web` (React + Vite), `apps/api` (Node, for example Fastify or Hono), `packages/shared` (Zod schemas and types).
- Postgres with Drizzle or SQL?. Prisma is fine if you have good reasons.
- Next.js instead of Vite + Node is also an option. Tell me what you recommend and why.
- Auth is postponed. Simple login is enough until the app needs more users.

## Schemas

I have a first draft in `schemas.ts` (Zod): exercises, workouts, workout entries, recovery days and the `RecoverySource` interface. Put it in `packages/shared/src/`. The movement patterns and equipment list are guesses and can be adjusted.

Deliberate choices in the schemas:

- Dates are `"YYYY-MM-DD"` strings, not Date objects, to avoid time zone problems with daily data.
- `rpe` (1 to 10) on the workout and `feeling` (1 to 5) on the recovery day are my own subjective numbers. They are for checking whether HRV matches how I actually feel.
- `recovery_day` exists from day one, even though it is filled in manually, so I have data when the recovery layer arrives.

## Recovery data from Garmin: what we know

- The Garmin Health API is not self-serve. It requires a business application to the partner program, and according to one source the form for new access was temporarily unavailable. Do not build on it.
- Unofficial libraries such as python-garminconnect fetch data through the login session. They can stop working and are in a gray area against Garmin's terms. Do not use them in the app itself.
- Garmin does not write HRV to Apple Health (steps, workouts, heart rate and sleep do go through). A web app/PWA also cannot read HealthKit directly. Apple Health via an app such as Health Auto Export may become an adapter later, but only for sleep and resting heart rate.
- The Garmin Connect export contains HRV, but the format is messy. Daily exports should have files ending in `_HRV_STATUS.fit`. Sources disagree about what the full data export contains, so take an export and look at what is actually in it before building an importer.
- HRV methods are not comparable across devices (Apple Health uses SDNN, Garmin uses its own method). The baseline must be computed from one source, not mixed.

## Architecture for recovery sources

Adapter pattern. All sources implement `RecoverySource` (see `schemas.ts`). The rest of the app does not know whether the data came from manual entry or a file import.

1. `ManualSource` in layer 1.
2. `FitImportSource` in layer 2.
3. Possibly an Apple Health adapter at the end.

## The layers (build one at a time, each must work on its own)

1. **Log and exercise library.** Schemas in `shared`, database with migrations, API for exercises, workouts and recovery with validation, a simple React UI to log a workout and see history. Mobile friendly from the start, since I use it at the gym. Seed a couple of hundred exercises with tags. Check the license if you use an open database (for example wger). I use the app myself for a couple of weeks before we build further.
2. **HRV import.** A parser for the Garmin export, and a trend against training load.
3. **AI layer.** See below.
4. **PWA.** Installable and good on a phone.

## AI layer: plan

Start with one orchestrator that calls roles, not five agents passing text to each other. Split into separate agents only when the prompt and tools have actually grown apart, or when running in parallel gives something real.

Roles:

- **Recovery:** plain code, not an LLM. HRV baseline (for example 7-day average against 30-day) gives a category: green, yellow, red. The LLM explains the numbers, it does not calculate them.
- **Exercises:** search the exercise library using tags (movement pattern, equipment, muscle group, type). RAG fits here.
- **Training type:** picks the session type from the goal and the last few days of training (heavy strength, metcon, skill and so on). Rules plus LLM.
- **Session designer:** assembles the actual session within the limits from the others. Output is JSON against a fixed Zod schema.
- **Critic:** checks the proposal against fixed rules in code, for example no two heavy sessions on the same movement pattern on consecutive days, and no max effort on a red day. The rules must live in code so the LLM cannot talk its way around them.

Requirements:

- **Evals from the start:** 15 to 20 test scenarios (for example "red HRV, heavy leg session yesterday, 30 minutes, kettlebell only") with what counts as an acceptable answer. This is how I can change prompts without guessing.
- **Structured output everywhere.** Agents talk to each other with typed objects, not free text.
- Go directly against the Claude API with tool use first, before considering a framework, so I understand what a framework does for me.
- Check current model names and API usage in docs.claude.com. Do not use model strings from memory.

## First tasks

1. Set up the monorepo with workspaces, TypeScript, linting and formatting. Suggest tools and say why.
2. Put `schemas.ts` in `packages/shared` and get it building.
3. Database tables that match the schemas, with migrations.
4. API routes to create and fetch workouts and recovery days, validated with Zod.
5. A minimal React page to log a workout.

Stop after each step and show me what came out, so we take the next step together.
