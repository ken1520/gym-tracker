# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

A gym workout tracker: Next.js 16 (App Router) + MongoDB via Mongoose, TypeScript, Tailwind v4.

## Setup

Node 22 is required — `nvm use 22` before any npm command. Node 18/20 are installed on this machine and will not run the toolchain.

```bash
docker compose up -d      # MongoDB 8 on :27017 (npm run db:up)
cp .env.example .env.local
npm run seed              # starter exercise library + one sample workout, wipes both collections first
npm run dev
```

Without a reachable database every page renders a `ConnectionError` banner instead of crashing — that banner means Mongo is down, not that the page is broken. Port 3000 is often taken on this machine; check the dev server output for the real port.

## Commands

| Command | Notes |
|---|---|
| `npm run dev` | Turbopack dev server |
| `npm run build` | Production build, also runs `tsc` |
| `npm run typecheck` | `next typegen && tsc --noEmit` — typegen must run first (see below) |
| `npm run lint` | ESLint |
| `npm test` | Vitest, all unit tests |
| `npm run test:coverage` | Enforces 80% thresholds on `src/domain`, `src/server/forms`, `src/server/api` |
| `npm run seed` | Reseeds the database (destructive) |
| `npm run db:sync-indexes` | Rebuilds indexes and drops superseded ones; run after any index change |

Run a single test file or case:

```bash
npx vitest run src/domain/metrics.test.ts
npx vitest run -t "excludes warmup sets"
```

Vitest config lives in `vitest.config.mts` — the `.mts` extension is deliberate, `.ts` triggers a Vite config-loader warning in this setup.

## Architecture

Three layers, strictly one-directional (`app` → `server` → `domain`):

- **`src/domain/`** — pure, dependency-free. Types, Zod schemas, metric math, formatting. No database or React imports, which is why it carries essentially all the test coverage.
- **`src/server/`** — everything touching the database or the request. Repositories, Server Actions, form parsing, the API envelope. Every repository imports `server-only`.
- **`src/app/`**, **`src/components/`** — routes and UI. Pages are Server Components that call repositories directly; `workout-form.tsx`, `exercise-form.tsx` and `exercise-row.tsx` are the `"use client"` entry points. `exercise-fields.tsx` is shared by the create form and the row editor and deliberately carries no directive — it joins its importers' bundle, which is what lets it take a plain `onCancel` callback instead of only serializable props.

`src/models/` holds Mongoose schemas, imported only by repositories and the seed script.

### Mutations happen twice, deliberately

The UI uses **Server Actions** (`src/server/actions/`), and `src/app/api/` exposes a parallel **REST API** for non-UI clients. Both paths validate with the same Zod schemas from `src/domain/schemas.ts` and share `isDuplicateKeyError`. Changing validation rules means changing one schema, but verify both paths still behave — they report errors differently (action returns `ActionState`, route returns the `apiSuccess`/`apiError` envelope).

### Non-obvious constraints

These caused real bugs during the initial build. Preserve them.

**Database reads must call `await connection()` first.** Every read in `src/server/repositories/` starts with `connection()` from `next/server`. Without it Next prerenders those pages as static at build time, freezing whatever the database returned during the build (or the error state, since there is no database in CI). After changing a page's data flow, run `npm run build` and confirm the route table marks DB-backed routes `ƒ` (Dynamic), not `○` (Static).

**`"use server"` files may only export async functions.** `ActionState` and `initialActionState` live in `src/server/actions/state.ts` rather than alongside the actions for exactly this reason. Do not move them back.

**Actions return a destination instead of calling `redirect()`.** Every mutation ends in a toast (`src/components/toast.tsx`, provider mounted in the root layout), and `useActionToast` raises it from the `"success"` state the action returns. A server-side `redirect()` never produces that state — it unmounts the form before anything lands — so `createWorkoutAction` and `updateWorkoutAction` return `redirectTo` and `workout-form.tsx` navigates with `router.push`. Re-adding `redirect()` silently removes the toast. The toast survives the navigation only because the provider sits above `children` in the layout and is never remounted.

Deletes have no form to render an error into, so their action returns an `ActionState` too and `DeleteButton` toasts it. A new mutation needs the same treatment or it will succeed with no feedback at all.

**The workout form has a field-name contract.** `workout-form.tsx` posts flat indexed names (`entries.0.sets.2.reps`) because set counts are dynamic; `src/server/forms/workout-form.ts` parses them back into nested objects with regexes. Renaming a field in the component silently drops data unless the regexes change too. `workout-form.test.ts` pins this contract, including sparse indices left by client-side row removal.

**Calendar dates are computed in UTC, end to end.** `performedAt` is a UTC instant and form submissions land on UTC midnight, so `src/domain/calendar.ts` does all its date math with `Date.UTC` and `getUTC*`, and `formatDate` pins `timeZone: "UTC"`. Mixing in local time puts a workout in a different cell than the date printed beside it for anyone not on UTC. `format.test.ts` is timezone-sensitive — run it under `TZ=America/Los_Angeles` as well as the default when touching date code.

**`/workouts` state lives in the URL** (`?month=YYYY-MM&day=YYYY-MM-DD`), which keeps the page a Server Component with no client JS and makes months linkable. `resolveMonthKey` falls back to the current month for absent or malformed values, so params are never trusted. The page loads only the selected month via `listWorkoutsInMonth`, not the whole history.

**Edits replace the whole record, and clearing a field needs `$unset`.** Updates reuse the same Zod schemas as creates, so a save carries every field and the REST verb is `PUT`, not `PATCH`. Mongo leaves a key alone when the update document omits it, so `toUpdateDoc` in `src/server/repositories/update-doc.ts` sorts fields into `$set` and `$unset` — without it, switching an exercise off `machine` would keep its old brand. Any new optional field must be added to that call's clearable list, or it will be impossible to clear.

Because entries are replaced wholesale, anything the form does not post is lost on save. That is why `workout-form.tsx` keeps a hidden input for each set's `rpe` (no UI collects it) and `exercise-fields.tsx` does the same for exercise `notes`. Adding a stored field that the form does not render means adding another such carrier.

**Editing a workout must survive a deleted exercise.** `buildOptions` in `workout-form.tsx` merges the library with any `exerciseId` the workout references but the library no longer has, so the entry stays selectable. The option's `label` carries the `(removed)` marker and its `name` stays clean — the form posts `name`, so collapsing the two would write the marker into `exerciseName`.

**Warmup sets are excluded from every metric.** Volume, set counts, best set, and PRs all filter on `isWarmup`. New metrics must do the same.

**`exerciseName` is denormalized onto workout entries** so history stays readable after an exercise is renamed or deleted. Do not replace it with a populate.

**Both the connection and the models are cached on `globalThis`.** `src/lib/mongoose.ts` caches the connection across hot reloads, and each model does `mongoose.models.X ?? mongoose.model(...)`. Without both, dev reloads throw `OverwriteModelError` and leak connection pools.

The cost of that cache: **adding a field to a Mongoose schema requires restarting `npm run dev`.** Hot reload re-runs the module, but `mongoose.models.X ??` short-circuits to the model compiled at boot, which has no path for the new field, so Mongoose silently strips it — validation passes, the API returns 201, and the field is simply absent from the document. If a newly added field is missing from reads and writes with no error anywhere, restart the dev server before debugging anything else.

**There is no environment toggle in the code.** `readEnv()` reads `MONGODB_URI` and nothing else decides the target: `.env.local` holds the Docker URI, `.env.atlas.local` holds the Atlas SRV string, Render sets the variable in its dashboard. `npm run dev:atlas` pre-loads `.env.atlas.local` and relies on Next's load order, where a real environment variable outranks `.env.local`. It goes through `scripts/with-env.mjs` rather than `node --env-file=… next dev`, because `next dev` re-spawns itself with the parent's flags in `NODE_OPTIONS` and Node rejects `--env-file` there — the server boots and then dies. The wrapper calls `process.loadEnvFile` and spawns a plain child instead. `tsx --env-file` is unaffected, which is why the seed script still uses it. Do not add a `MONGODB_TARGET`-style switch — it would require every environment to hold both URIs, which is how a local `npm run seed` ends up pointed at production. `isLocalMongoUri` in `src/lib/env.ts` parses the URI with `URL` rather than matching a pattern, because `mongodb://localhost:pass@remote.example.com` puts a local-looking name in the credentials; `scripts/seed.ts` uses it to refuse a remote target without `--force`.

**Exercise names are unique per `(name, equipment, machineBrand)`**, case-insensitively, via a collation index. A name may repeat across equipment or brands — a barbell, a dumbbell and two machine "Chest Press" entries are four different lifts — but the same combination twice is rejected. Mongo indexes a missing `machineBrand` as null, so two unbranded barbell entries still collide. Duplicates surface as Mongo error 11000 → 409 from the API, inline field error from the action.

Because a name alone no longer identifies an exercise, anywhere one is shown next to its siblings has to disambiguate it. `src/domain/exercise-label.ts` owns that rule: `exerciseLabel` qualifies a repeated name for pickers (the workout form's dropdown), and `qualifierFor` returns the muted suffix for lists that always show a brand (the personal-bests table, the workout detail page). A unique name renders exactly as before. The qualifier is display only — `exerciseName` posted by the form stays clean, for the same reason the `(removed)` marker does.

**Changing an index needs `npm run db:sync-indexes`.** Mongoose's `autoIndex` only ever adds indexes, so the superseded one keeps enforcing its old rule — after the unique index moved off `name` alone, the stale `name_1` went on rejecting the duplicates the new index allows. `scripts/sync-indexes.ts` calls `syncIndexes()` on both models, which drops what the schemas no longer declare. It touches no documents, so unlike `npm run seed` it is safe to point at Atlas.

### Next.js 16 specifics

Read `node_modules/next/dist/docs/` before using an unfamiliar API — this version differs from older App Router conventions.

- `params` is a `Promise` and must be awaited.
- `LayoutProps<"/">` / `PageProps<"/workouts/[id]">` are generated globals, not imports. They only exist after typegen, so **adding a route breaks typecheck until `next typegen` runs** — that is why `npm run typecheck` chains it.
- `fetch` is not cached by default.

## Conventions

**Kilograms are the only unit, for both storage and display.** Weights are stored as `weightKg`, and `formatWeight` / `formatVolume` in `src/domain/format.ts` always render `kg` — large totals get grouped thousands (`48,250 kg`), never a tonne abbreviation. There is no unit conversion layer, and no display unit should be introduced without changing this line. Both formatters pin the locale to `en-GB` so server and client render identically and hydration stays clean.

Estimated 1RM uses the Epley formula in `src/domain/metrics.ts`. Numeric limits (max weight, max reps, RPE range) are centralized in `src/domain/constants.ts` and enforced in both the Zod schemas and the Mongoose schemas.
