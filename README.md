# Zun Fitness

A full-stack 30-day fitness app built with SvelteKit 2, Svelte 5, Cloudflare Workers, D1, Drizzle ORM, and Better Auth.

## Features

- Email/password accounts and authenticated profiles
- Database-backed progress for all 30 workout days
- A normalized workout model: one program, 30 workouts, 107 unique exercises, and 191 ordered exercise references
- Two canonical exercise types: rep-based exercises with 50–150% cadence, and fixed-duration timed intervals
- The original clock, monthly calendar, workout modal, and music-player composition
- Exercise announcements, countdown voices, ticks, beeps, and completion sounds
- Responsive light/dark UI composed exclusively from CLI-installed Lily Svelte components

## Local development

Bun is required.

```bash
cp .dev.vars.example .dev.vars
# Replace BETTER_AUTH_SECRET in .dev.vars.
bun install
bun run dev
```

`bun run dev` applies pending local migrations and starts the app at `http://localhost:3000`. D1 runs through Wrangler's embedded local runtime rather than as a separate database process; its files are stored under `.wrangler/`. Create an account from `/sign-up` after startup.

## Lily Svelte

The Lily registry is configured in `components.json`. Add or refresh UI components through the CLI:

```bash
bunx lily-svelte@latest add <component>
```

Application controls and surfaces should compose the generated components under `src/lib/components/ui/` rather than introducing hand-written UI primitives.

## Database model

`drizzle/0000_normalized-workout-program.sql` creates and seeds:

- `program` → `workout` → `workout_exercise`
- `exercise` as the canonical, non-duplicated catalog with `reps` or `timed` type
- `user_workout_progress` for exact `YYYY-MM-DD` calendar completions and their workout references
- `user_exercise_preference` for rep-only per-user cadence
- Better Auth's `user`, `session`, `account`, and `verification` tables

The former per-day workout JSON files have been replaced by this migration.

## Commands

```bash
bun run dev                 # migrate local D1, then start on port 3000
bun run check               # generated bindings + Svelte/TypeScript checks
bun run build               # Cloudflare Worker production build
bun run db:generate         # generate a Drizzle migration
bun run db:migrate:local    # apply migrations to local D1
bun run db:migrate:remote   # apply migrations to production D1
bun run deploy              # build and deploy with Wrangler
```

## Cloudflare setup

Before remote migration or deployment:

1. Create a D1 database: `bunx wrangler d1 create zun-fitness-db`.
2. Replace the placeholder `database_id` in `wrangler.jsonc` with the returned ID.
3. Set `BETTER_AUTH_SECRET` with `bunx wrangler secret put BETTER_AUTH_SECRET`.
4. Optionally set `APP_URL`/`BETTER_AUTH_URL`; otherwise authentication uses the request origin.
5. Run `bun run db:migrate:remote`, then deploy.
