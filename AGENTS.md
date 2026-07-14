# AGENTS.md — Zun Fitness

Zun Fitness is a full-stack SvelteKit 2 / Svelte 5 app deployed to Cloudflare Workers.

## Stack

- Package manager: Bun only
- Runtime: Cloudflare Workers via `@sveltejs/adapter-cloudflare`
- Database: Cloudflare D1 + Drizzle ORM
- Authentication: Better Auth, created per request in `src/lib/server/auth.ts`
- UI: Tailwind CSS v4 + Lily Svelte copy-owned components
- Icons: Lucide and Lily's registry-provided Iconify icons
- Fonts: IBM Plex Sans Variable

## Commands

```bash
bun run dev
bun run check
bun run build
bun run db:generate
bun run db:migrate:local
bun run db:migrate:remote
```

There is no test suite or linter. Do not add one unless requested.

## Architecture

- `src/hooks.server.ts` attaches auth, user, and Drizzle DB to request locals.
- `src/lib/server/db/schema.ts` is the canonical schema.
- `drizzle/` contains D1 migrations and the normalized workout seed.
- `src/lib/server/workouts.ts` assembles normalized rows into client workout models.
- `src/routes/api/progress/` persists completed workout days.
- `src/routes/api/exercises/` persists per-user exercise speed.
- `src/lib/components/ui/` contains Lily Svelte components installed through the CLI.
- `components.json` is the Lily registry configuration.
- The main page preserves the original clock → calendar → workout modal composition.
- `src/lib/components/MusicPlayer.svelte` and `WorkoutSession.svelte` own music, cues, countdowns, and exercise voice playback.

## Data rules

- Exercises are canonical rows identified by a unique slug. Never duplicate exercise details inside a workout.
- Ordered workout steps belong in `workout_exercise` and reference an `exercise`.
- Repeated movements in one workout are repeated join rows, not repeated exercise rows.
- User progress stores the exact calendar date and is unique by `(user_id, completed_date)`; `workout_id` references the workout assigned to that day number.
- Canonical exercises have type `reps` or `timed`; a workout step references that type through its exercise.
- User speed applies only to `reps` exercises, is unique by `(user_id, exercise_id)`, and is constrained to 25–200.

## Conventions

- Prefer Svelte 5 runes in new components.
- Use inline `interface Props` before `$props()`.
- Use Lily components for controls and surfaces; do not hand-roll buttons, inputs, dialogs, calendars, cards, sliders, menus, or progress bars.
- Install Lily components with `bunx lily-svelte@latest add <component>` rather than writing registry components manually.
- Use Lily's `--bg`, `--bg-elevated`, and `--text` tokens through Tailwind utility classes.
- Keep server-only modules under `src/lib/server/`.
- Use `try/catch` with `console.error` for async service failures.
- Never commit `.dev.vars`, secrets, or real Cloudflare credentials.
