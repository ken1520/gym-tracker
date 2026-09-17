<div align="center">

# 🏋️ Gym Tracker

**Log your sessions, track training volume, and watch estimated 1RMs go up.**

<br/>

[![View the Demo](https://img.shields.io/badge/🏋️_View_the_Demo-1F2937?style=for-the-badge&logoColor=white)](https://gym-tracker-t1e7.onrender.com/)

<br/>

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![MongoDB](https://img.shields.io/badge/Mongoose-9-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Node](https://img.shields.io/badge/Node-22-339933?style=flat-square&logo=nodedotjs&logoColor=white)

</div>

---

Server Components do the rendering, so most of the app ships **no client JavaScript** — the
history page keeps its state in the URL and the personal-bests groups collapse with plain
`<details>`. Only the two forms and the exercise row are interactive.

> [!IMPORTANT]
> The demo runs on Render's free tier against MongoDB Atlas — the instance sleeps when idle,
> so the first load after a quiet period can take ~50s to cold-start.

## 🚀 Getting started

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

> [!NOTE]
> Port 3000 is often already taken — read the port off the dev server's own output rather
> than assuming it. Node 22 is required; the toolchain does not run on 18 or 20.

## 🗄️ Databases

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

### ☁️ Deploying to Render

Live at **[gym-tracker-t1e7.onrender.com](https://gym-tracker-t1e7.onrender.com/)**.

[`render.yaml`](./render.yaml) is a Blueprint for the whole service. Import it, or set the same values by hand: build `npm ci && npm run build`, start `npm run start`, Node 22, and `MONGODB_URI` set to the Atlas SRV string. The build needs no database — every DB-backed route is request-time rendered.

Two things bite on the first deploy:

- **Atlas Network Access.** Render's free and starter instances have no static outbound IP, so an IP allowlist cannot be scoped to them. Either allow `0.0.0.0/0` and rely on TLS plus SCRAM auth for the database user, or move to a Render instance type with static outbound IPs and allowlist those.
- **The database user needs `readWrite` on `gym_tracker`**, not just Atlas project access.

Seed Atlas once, if you want the starter exercise library:

```bash
npx tsx --env-file=.env.atlas.local scripts/seed.ts --force
```

`--force` is required for any non-local URI. Seeding deletes every exercise and workout first, so the guard exists to stop a stray `npm run seed` from wiping real history.

## ✨ Features

Three tabs in the top nav — Dashboard, History, Exercises.

### 📊 Dashboard — training at a glance

|     |                                                                                                      |
| :-: | :--------------------------------------------------------------------------------------------------- |
| 📈  | Workouts, volume and distinct exercises **this week**, each with the % change against last week        |
| 🕘  | The five most recent sessions, with exercise count and volume                                          |
| 🏆  | A personal best per exercise — the heaviest set ever logged, and the estimated 1RM behind it            |
| 💪  | Bests collapse into muscle groups; exercises deleted from the library keep their history in their own group |

### 📅 History — a month at a time

|     |                                                                                                    |
| :-: | :-------------------------------------------------------------------------------------------------- |
| 🟩  | Calendar grid where each logged day is shaded in three tiers by that day's volume                    |
| 👆  | Tap a day to list its sessions; tap a session for the full set-by-set breakdown                      |
| ◀️  | Step through months — the month and day live in the URL (`?month=2026-08&day=2026-08-13`), so any view is linkable |
| 🧮  | Header totals the month's sessions and volume; only the selected month is ever loaded                |
| ✏️  | Edit or delete a session straight from the day list                                                  |

### 📝 Logging a workout

|     |                                                                                                    |
| :-: | :-------------------------------------------------------------------------------------------------- |
| ➕  | Any number of exercises, each with any number of sets — add and remove rows as you go                |
| ⚖️  | Per set: weight in kg, reps, and a warmup checkbox                                                   |
| 🔥  | **Warmup sets are excluded from every metric** — volume, set counts, best set and PRs                 |
| 🥇  | Each exercise shows its best set of the session plus an Epley estimated 1RM                          |
| 🗒️  | A title, a date, and free-text session notes                                                          |
| 👻  | Editing an old workout still works after its exercise was deleted — the entry stays selectable, marked `(removed)` |

### 🗂️ Exercise library

|     |                                                                                          |
| :-: | :----------------------------------------------------------------------------------------- |
| 🏷️  | Every exercise has a muscle group (chest, back, shoulders, biceps, triceps, legs, glutes, core, full-body) |
| 🔧  | …and equipment: barbell, dumbbell, machine, cable, bodyweight, kettlebell or other          |
| 🏭  | Machines can also carry a brand (Life Fitness, Technogym, Hammer Strength, Gym80, …)         |
| ✍️  | Add, rename, retype and delete inline, without leaving the page                              |
| 🚫  | Unique per name + equipment + brand, case-insensitively — one barbell `Bench Press`, but a dumbbell one is a separate lift |
| 🌱  | `npm run seed` drops in a starter library and one sample workout                             |

### 🧾 Everywhere

|     |                                                                                                |
| :-: | :---------------------------------------------------------------------------------------------- |
| ⚖️  | **Kilograms only**, for storage and display — no unit conversion layer, no per-user preference    |
| 🌗  | Light and dark, following the system theme                                                       |
| 🌍  | Dates are computed in UTC end to end, so a session never lands on a different day than it reads   |
| 🔌  | With the database down, every page renders a connection banner instead of crashing                |
| 📜  | Exercise names are denormalized onto workouts, so history stays readable after a rename or delete |

## 🧰 Scripts

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

## 🔌 API

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

Validation failures return `422` with a `fieldErrors` map; an exercise repeating an existing name *and* equipment returns `409`.

## 🏗️ Architecture

Three layers, strictly one-directional:

```
📁 src
├── 📁 app          Routes and pages — Server Components that call repositories directly
├── 📁 components   UI; only the two forms and the exercise row are "use client"
├── 📁 server       Repositories, Server Actions, form parsing, the API envelope
├── 📁 domain       Pure and dependency-free: types, Zod schemas, metric maths, formatting
└── 📁 models       Mongoose schemas
```

Mutations run down two paths on purpose — the UI posts to **Server Actions**, `src/app/api/`
exposes the same operations as **REST** for non-UI clients, and both validate with the same
Zod schemas from `src/domain/schemas.ts`.

See [CLAUDE.md](./CLAUDE.md) for the layer boundaries and the non-obvious constraints worth knowing before changing data flow.
