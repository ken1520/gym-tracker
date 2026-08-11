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

## Databases

The app reads one variable, `MONGODB_URI`, and never decides for itself which database to use — the environment does. There is no toggle in the code, and no tunnel or proxy: Atlas is a public TLS endpoint that the app dials directly.

| Where | Source of `MONGODB_URI` | Command |
|---|---|---|
| Local (default) | `.env.local` → Docker container | `npm run dev` |
| Local, against Atlas | `.env.atlas.local` | `npm run dev:atlas` |
| Production (Render) | Render dashboard env var | — |

`dev:atlas` works because a real environment variable outranks any `.env` file in Next's [load order](https://nextjs.org/docs/app/guides/environment-variables), so the pre-loaded value wins over `.env.local` without either file knowing about the other. The script fails loudly if `.env.atlas.local` is missing, rather than quietly falling back to Docker.

Create `.env.atlas.local` (gitignored) from Atlas > Connect > Drivers:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=gym_tracker
```

`MONGODB_DB` is passed as `dbName` and wins over any database in the URI path, so the same database name is used everywhere.

### Deploying to Render

[`render.yaml`](./render.yaml) is a Blueprint for the whole service. Import it, or set the same values by hand: build `npm ci && npm run build`, start `npm run start`, Node 22, and `MONGODB_URI` set to the Atlas SRV string. The build needs no database — every DB-backed route is request-time rendered.

Two things bite on the first deploy:

- **Atlas Network Access.** Render's free and starter instances have no static outbound IP, so an IP allowlist cannot be scoped to them. Either allow `0.0.0.0/0` and rely on TLS plus SCRAM auth for the database user, or move to a Render instance type with static outbound IPs and allowlist those.
- **The database user needs `readWrite` on `gym_tracker`**, not just Atlas project access.

Seed Atlas once, if you want the starter exercise library:

```bash
npx tsx --env-file=.env.atlas.local scripts/seed.ts --force
```

`--force` is required for any non-local URI. Seeding deletes every exercise and workout first, so the guard exists to stop a stray `npm run seed` from wiping real history.

## Features

- **Log workouts** with multiple exercises, per-set weight/reps/RPE, and warmup flags
- **History** as a month calendar, where logged days are shaded by training volume; pick a day to see its sessions
- **Exercise library** with muscle group and equipment, unique by name
- **Dashboard** showing total volume plus a personal best and estimated 1RM per exercise, grouped into collapsible muscle groups

Warmup sets are excluded from volume, set counts, and personal bests.

All weights and volumes are shown in kilograms.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server, against the Docker database |
| `npm run dev:atlas` | Dev server, against the Atlas URI in `.env.atlas.local` |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Unit tests |
| `npm run test:coverage` | Tests with coverage thresholds |
| `npm run typecheck` | Route typegen + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run seed` | Reseed the database (destructive; refuses a non-local URI without `--force`) |
| `npm run db:up` / `npm run db:down` | Start/stop MongoDB |

## API

A REST API mirrors the UI's Server Actions, sharing the same validation schemas.

| Method | Route | |
|---|---|---|
| `GET` | `/api/workouts` | List workouts, newest first |
| `POST` | `/api/workouts` | Create a workout |
| `GET` | `/api/workouts/:id` | Fetch one workout |
| `PUT` | `/api/workouts/:id` | Replace a workout |
| `DELETE` | `/api/workouts/:id` | Delete a workout |
| `GET` | `/api/exercises` | List the exercise library |
| `POST` | `/api/exercises` | Add an exercise |
| `PUT` | `/api/exercises/:id` | Replace an exercise |

Responses use a consistent envelope:

```json
{ "success": true, "data": { }, "error": null }
```

Validation failures return `422` with a `fieldErrors` map; duplicate exercise names return `409`.

## Architecture

See [CLAUDE.md](./CLAUDE.md) for the layer boundaries and the non-obvious constraints worth knowing before changing data flow.
