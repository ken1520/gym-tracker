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
- **`src/app/`**, **`src/components/`** — routes and UI. Pages are Server Components that call repositories directly; only `workout-form.tsx` and `exercise-form.tsx` are `"use client"`.

`src/models/` holds Mongoose schemas, imported only by repositories and the seed script.

### Mutations happen twice, deliberately

The UI uses **Server Actions** (`src/server/actions/`), and `src/app/api/` exposes a parallel **REST API** for non-UI clients. Both paths validate with the same Zod schemas from `src/domain/schemas.ts` and share `isDuplicateKeyError`. Changing validation rules means changing one schema, but verify both paths still behave — they report errors differently (action returns `ActionState`, route returns the `apiSuccess`/`apiError` envelope).

### Non-obvious constraints

These caused real bugs during the initial build. Preserve them.

**Database reads must call `await connection()` first.** Every read in `src/server/repositories/` starts with `connection()` from `next/server`. Without it Next prerenders those pages as static at build time, freezing whatever the database returned during the build (or the error state, since there is no database in CI). After changing a page's data flow, run `npm run build` and confirm the route table marks DB-backed routes `ƒ` (Dynamic), not `○` (Static).

**`"use server"` files may only export async functions.** `ActionState` and `initialActionState` live in `src/server/actions/state.ts` rather than alongside the actions for exactly this reason. Do not move them back.

**The workout form has a field-name contract.** `workout-form.tsx` posts flat indexed names (`entries.0.sets.2.reps`) because set counts are dynamic; `src/server/forms/workout-form.ts` parses them back into nested objects with regexes. Renaming a field in the component silently drops data unless the regexes change too. `workout-form.test.ts` pins this contract, including sparse indices left by client-side row removal.

**Warmup sets are excluded from every metric.** Volume, set counts, best set, and PRs all filter on `isWarmup`. New metrics must do the same.

**`exerciseName` is denormalized onto workout entries** so history stays readable after an exercise is renamed or deleted. Do not replace it with a populate.

**Both the connection and the models are cached on `globalThis`.** `src/lib/mongoose.ts` caches the connection across hot reloads, and each model does `mongoose.models.X ?? mongoose.model(...)`. Without both, dev reloads throw `OverwriteModelError` and leak connection pools.

**Exercise names are unique case-insensitively** via a collation index. Duplicates surface as Mongo error 11000 → 409 from the API, inline field error from the action.

### Next.js 16 specifics

Read `node_modules/next/dist/docs/` before using an unfamiliar API — this version differs from older App Router conventions.

- `params` is a `Promise` and must be awaited.
- `LayoutProps<"/">` / `PageProps<"/workouts/[id]">` are generated globals, not imports. They only exist after typegen, so **adding a route breaks typecheck until `next typegen` runs** — that is why `npm run typecheck` chains it.
- `fetch` is not cached by default.

## Conventions

**Kilograms are the only unit, for both storage and display.** Weights are stored as `weightKg`, and `formatWeight` / `formatVolume` in `src/domain/format.ts` always render `kg` — large totals get grouped thousands (`48,250 kg`), never a tonne abbreviation. There is no unit conversion layer, and no display unit should be introduced without changing this line. Both formatters pin the locale to `en-GB` so server and client render identically and hydration stays clean.

Estimated 1RM uses the Epley formula in `src/domain/metrics.ts`. Numeric limits (max weight, max reps, RPE range) are centralized in `src/domain/constants.ts` and enforced in both the Zod schemas and the Mongoose schemas.
