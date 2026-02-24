# AGENTS.md — Zun Fitness

Guidance for agentic coding assistants operating in this repository.

---

## Project Overview

**Zun Fitness** (`package name: pull-push-done`) is a 30-day fitness app built with SvelteKit 2 + Svelte 5, deployed as a fully static, client-side-only SPA. There is no backend. All workout data is static JSON.

- **Package manager**: Bun (enforced). Never use npm, yarn, or pnpm — the `.npmrc` has `engine-strict=true` and will refuse other managers.
- **Framework**: SvelteKit 2 with `@sveltejs/adapter-static`, `ssr: false`, `prerender: true`.
- **CSS**: Tailwind CSS v4 (configured entirely via the Vite plugin — there is no `tailwind.config.js`) + CSS custom properties + scoped `<style>` blocks.
- **Fonts**: Google Fonts — Orbitron, Rajdhani, Oxanium (loaded in `app.html`).

---

## Commands

### Development
```bash
bun run dev          # start Vite dev server
bun run preview      # preview the production build locally
```

### Build
```bash
bun run build        # production build via Vite
```

### Type-checking (the only "lint" that exists)
```bash
bun run check        # svelte-check + svelte-kit sync (one-shot)
bun run check:watch  # same, in watch mode
```

### Testing
**There is no test suite.** No Vitest, Jest, Playwright, or any other test framework is installed. There are no `*.test.*` or `*.spec.*` files. Do not add a test runner unless explicitly requested.

There is a standalone data validation utility:
```bash
python validate_workouts.py   # validates workouts JSON files; not part of any CI
```

---

## Repository Structure

```
src/
├── app.html                   HTML shell — Google Fonts, SvelteKit placeholders
├── app.css                    Minimal global CSS (Tailwind import + scrollbar)
├── app.d.ts                   SvelteKit App namespace (mostly empty)
├── lib/
│   ├── index.ts               Empty placeholder
│   ├── assets/favicon.ico
│   ├── components/            All Svelte UI components
│   │   ├── Calendar.svelte    Monthly calendar with completion tracking
│   │   ├── Clock.svelte       Live clock with eating-window indicator
│   │   ├── SessionControlButton.svelte
│   │   ├── WorkoutModal.svelte
│   │   └── WorkoutSession.svelte   Primary workout timer UI (~1000 lines)
│   ├── data/
│   │   ├── workouts.json      Array of 30 workout day metadata
│   │   ├── sentences.json     TTS voice sentences
│   │   └── workouts/          Per-day JSON: day01.json … day30.json
│   └── services/
│       └── audio.ts           AudioService singleton (Web Audio API)
└── routes/
    ├── +layout.js             Sets ssr=false, prerender=true
    ├── +layout.svelte         Root layout — imports layout.css
    ├── +page.svelte           Single main page
    └── layout.css             Primary global stylesheet — CSS variables, utilities
static/
    activities/                Exercise images (.webp)
    workouts/                  Workout preview images (.jpg)
    audio/                     Sound effects (.m4a) + voice audio
```

---

## Code Style

### TypeScript
- `strict: true` is enabled in `tsconfig.json`. Prefer typed code, but the existing codebase uses `any` liberally (e.g., `let workoutData: any`). Avoid introducing new `any` types unless genuinely necessary.
- `resolveJsonModule: true` — JSON files can be imported directly as typed modules.
- `moduleResolution: "bundler"` — no file extension needed on relative TypeScript imports.
- Types and interfaces are defined **inline in component scripts**, not in separate `.d.ts` or `.types.ts` files.
- Use `interface Props { ... }` for Svelte 5 component prop types, placed before the `$props()` call.

### Imports
No linter enforces import order, but follow this convention (observed throughout):
1. Svelte built-ins (`svelte`, `svelte/transition`, `svelte/easing`)
2. Local components (relative paths: `"./WorkoutSession.svelte"`)
3. Services (relative paths: `"../services/audio"`)
4. Data / JSON (prefer `$lib` alias: `"$lib/data/workouts.json"`)

Use `$lib` for imports from `src/lib/` when in route files (`+page.svelte`, `+layout.svelte`). Use relative paths inside `src/lib/` itself.

### Naming Conventions
| Entity | Convention | Example |
|---|---|---|
| Svelte components | `PascalCase.svelte` | `WorkoutSession.svelte` |
| TS/JS service files | `camelCase.ts` | `audio.ts` |
| Functions / variables | `camelCase` | `loadWorkoutData`, `currentIndex` |
| Event handlers | `handle` prefix | `handleDayClick`, `handleKeydown` |
| Boolean state | `is`/`has` prefix | `isPaused`, `isResting`, `hasBoundListener` |
| Constants (grouped) | `SCREAMING_SNAKE_CASE` object | `const SOUNDS = { tick: "...", start: "..." }` |
| Classes | `PascalCase` | `AudioService` |
| Exported singletons | `camelCase` | `export const audioService = AudioService.getInstance()` |
| Route files | SvelteKit convention | `+page.svelte`, `+layout.js` |
| Data files | `camelCase.json` / `dayNN.json` | `workouts.json`, `day01.json` |

### Svelte Version — Mixed API (Important)
This codebase **mixes Svelte 4 and Svelte 5 syntax** across components. When editing an existing component, match its current API style. When creating a new component, prefer Svelte 5 runes.

**Svelte 5 runes style** (used in `Calendar.svelte`, `+layout.svelte`):
```svelte
<script lang="ts">
  interface Props {
    completedDays?: string[];
    ondayclick: (detail: { day: number; dateKey: string }) => void;
  }
  let { completedDays = [], ondayclick }: Props = $props();
  let currentMonth = $state(today.getMonth());
  let daysInMonth = $derived(new Date(year, currentMonth + 1, 0).getDate());
</script>

<button onclick={() => ondayclick({ day, dateKey })}>...</button>
```

**Svelte 4 legacy style** (used in `WorkoutSession.svelte`, `WorkoutModal.svelte`, `Clock.svelte`):
```svelte
<script lang="ts">
  export let workoutData: any;
  $: currentActivity = workoutData.activities[currentActivityIndex];
</script>

<button on:click={handleStart}>...</button>
```

### CSS and Styling
- Use **Tailwind utility classes** for layout, spacing, and typography.
- Use **CSS custom properties** (`var(--color-primary)`, `var(--color-bg)`, etc.) for all theme values, including inside Tailwind arbitrary value syntax: `text-[var(--color-primary)]`.
- Use **component `<style>` blocks** for complex animations, keyframes, and anything not expressible cleanly in Tailwind.
- Global utility classes (`.mech-btn`, `.mech-border`, `.glitch-title`, `.text-glow`, etc.) are defined in `src/routes/layout.css`. Add new global utilities there.
- The design language is a **sci-fi / cyberpunk HUD aesthetic**: neon cyan (`#00f7ff`) primary, red-orange (`#ff4b2b`) secondary, dark backgrounds, glitch animations, scanlines, and perspective grid effects.
- Tailwind v4 is configured **only via the Vite plugin** (`@tailwindcss/vite`). Do not create `tailwind.config.js`.

### Error Handling
- Use `try/catch` with `console.error(...)`. No custom error classes exist.
- In the service layer (`audio.ts`), re-throw errors after logging so callers can handle them.
- In components, errors from audio/async operations are typically swallowed after logging (no user-visible error states).
- Use `.catch()` chaining for fire-and-forget promises:
  ```ts
  audioService.play(WELCOME_SOUND).catch((e) => console.error("Welcome sound failed:", e));
  ```

### Dynamic Imports for Workout Data
Per-day workout JSON is loaded via dynamic import to enable code splitting:
```ts
const mod = await import(`../data/workouts/day${paddedDay}.json`);
workoutData = mod.default;
```
Do not statically import all 30 day files — keep them lazy.

### Services
- The `AudioService` in `src/lib/services/audio.ts` is a **singleton** (`private constructor` + `static getInstance()`). Always access it via the exported `audioService` constant — never instantiate it directly.
- The service handles browser autoplay restrictions by checking `context.state === 'suspended'` and calling `context.resume()` on user interaction.

---

## Key Constraints

- **No ESLint or Prettier** are configured. Do not add them without being asked. Do not add formatting-only commits.
- **No test framework** is present. Do not add one without being asked.
- **Bun only** — all install/run commands must use `bun`, not npm/yarn/pnpm.
- **Static SPA** — there is no server-side rendering and no API routes. Do not add server-side code (`+server.ts`, `+page.server.ts`, etc.) without being asked.
- **No state management library** — all state is local component state. Do not introduce Svelte stores, Zustand, etc. without being asked.
