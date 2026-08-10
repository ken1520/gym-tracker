# Gym Tracker

Log workouts, track training volume, and watch estimated 1RMs go up.

Next.js 16 (App Router) · MongoDB via Mongoose · TypeScript · Tailwind v4

## Getting started

Requires Node 22 and Docker.

```bash
nvm use 22
npm install
npm run db:up             # MongoDB on :27017
cp .env.example .env.local
npm run seed              # starter exercises + a sample workout
npm run dev
```

Open the URL printed by the dev server.

## Features

- **Log workouts** with multiple exercises, per-set weight/reps/RPE, and warmup flags
- **History** with per-session volume and set counts
- **Exercise library** with muscle group and equipment, unique by name
- **Dashboard** showing total volume and estimated 1RM per exercise

Warmup sets are excluded from volume, set counts, and personal bests.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Unit tests |
| `npm run test:coverage` | Tests with coverage thresholds |
| `npm run typecheck` | Route typegen + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run seed` | Reseed the database (destructive) |
| `npm run db:up` / `npm run db:down` | Start/stop MongoDB |

## API

A REST API mirrors the UI's Server Actions, sharing the same validation schemas.

| Method | Route | |
|---|---|---|
| `GET` | `/api/workouts` | List workouts, newest first |
| `POST` | `/api/workouts` | Create a workout |
| `GET` | `/api/workouts/:id` | Fetch one workout |
| `DELETE` | `/api/workouts/:id` | Delete a workout |
| `GET` | `/api/exercises` | List the exercise library |
| `POST` | `/api/exercises` | Add an exercise |

Responses use a consistent envelope:

```json
{ "success": true, "data": { }, "error": null }
```

Validation failures return `422` with a `fieldErrors` map; duplicate exercise names return `409`.

## Architecture

See [CLAUDE.md](./CLAUDE.md) for the layer boundaries and the non-obvious constraints worth knowing before changing data flow.
