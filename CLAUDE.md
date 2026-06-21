# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**Astroverse: Constellation Nexus** — a first-playable build of an astrology-driven 3D exploration game. Stack: **React + TypeScript + Vite + React Three Fiber + Three.js + Zustand + Supabase**. It is a separate, parallel project from the older `astroverse-foundation` (Fastify/Postgres/raw Three.js) and shares no code with it. Scope implemented: Phase 0 (auth, profiles, consent, persistence), Phase 1 (natal engine, one world — Scorpio/Abyssia, star map, base layer + transit overlay, mobile controls, saves), Phase 2 (the Daily Minimum loop), and Phase 3 instrumentation only.

`README.md` is the authoritative narrative of what's built and why, including deliberate scope boundaries. Read it before making non-trivial changes.

## CRITICAL: the committed tree is a flattened upload, not the real layout

The git history is a series of "Add files via upload" commits. Every file lives in the **repository root**, and the original nested project (`src/...`, `ephemeris/src/...`, `supabase/migrations/...`) was flattened. Two consequences you must account for:

1. **Duplicate copies exist.** Files appear as `App.tsx`, `App.tsx 2`, `App.tsx 3`, etc. The numbered copies are byte-identical duplicates of the same source.
2. **Cross-directory name collisions are suffixed, not deduplicated.** When the same base name existed in more than one source directory, the flattening kept them as distinct numbered files. Example: `analytics.ts` (1382 B, the event-*types* file from `src/types/`) and `analytics 2.ts` (4370 B, the *tracking lib* from `src/lib/`) are genuinely different files that happen to share a base name. Likewise `dailyAlignment.ts` (907 B types) vs the 6210 B and 7723 B variants (lib vs gameLogic). Check file size/content, not just the name, to know which one you're looking at.

**Because of this, the build/dev/test commands below will not run against the tree as committed** — `tsconfig.json` and `vite.config.ts` reference `src/` and `ephemeris/src/` directories that do not exist in the flat layout. Before anything compiles, the files must be restored into the structure the configs and `README.md` describe (see "Intended structure" below). If asked to build/run, surface this first; do not assume `npm run build` works as-is.

## Commands (defined in package.json — valid once the structure is restored)

```bash
npm install
cp .env.example .env.local      # Supabase project URL + anon key (no .env.example is committed yet)
npm run dev                     # Vite dev server on :5173
npm run build                   # tsc -p tsconfig.json (full typecheck) then vite build
npm run typecheck               # tsc --noEmit
npm run preview                 # preview the production build
npm run verify:ephemeris        # runs the ephemeris reference check against a published table
```

There is no unit-test runner or linter configured. The two correctness gates are **`npm run typecheck`** (strict mode, `noUnusedLocals`/`noUnusedParameters` on) and **`npm run verify:ephemeris`**. Re-run `verify:ephemeris` after any change to the ephemeris math, especially `positions.ts`.

Database: apply the `00X_*.sql` migrations in numeric order against a real Supabase project (SQL editor or `supabase db push`). `config.toml` is a minimal Supabase CLI config (db on :54322, api on :54321).

Path aliases (in both `tsconfig.json` and `vite.config.ts`): `@/*` → `src/*`, `@ephemeris/*` → `ephemeris/src/*`.

## Architecture (the big picture)

The codebase is built around a few hard boundaries that are deliberate, not incidental:

- **The ephemeris is a sealed module.** All astronomy math lives in `ephemeris/` and has **zero dependency on `src/`**. Everything above it calls only the functions exported from `ephemeris/src/index.ts` (`computeNatalChart` is the single deterministic entry point); nothing in `src/` calls `eclipticLongitude`, `computeHouses`, or `computeAspects` directly. It implements **VSOP87** as an **original clean-room implementation of the published formulae** — it must never vendor, wrap, or link Swiss Ephemeris (AGPL/commercial; would force open-sourcing the whole app). See `README 3.md` (the ephemeris licensing decision) for the full rationale and the npm "ephemeris" naming trap.

- **RLS is the security boundary, not application code.** Every table has Row Level Security with explicit per-table policies. Auth is passwordless email OTP via Supabase Auth — there is **no custom token issuance anywhere** (unlike the old Fastify foundation). When touching the seven migrations, the access model is the policies, not anything in `src/`.

- **Consent gates data collection.** A four-tier append-only consent ledger (essential / precise_location / life_concerns / goals); each tier is recorded *before* the data it gates is collected. The onboarding flow is consent-gated step by step.

- **Pure derivation is isolated from I/O.** `src/lib/gameLogic/` holds pure functions only (personal-transit comparison, Daily Alignment content, Momentum decay/rise math) — **no I/O in that directory at all**. `src/lib/` is where data access, the Supabase client, orchestration, and analytics live.

- **One ephemeris cache, two readers.** Phase 1's Transit Overlay and Phase 2's personal transits read the **same** `transit_snapshots` global cache (one fetch path, not two). Personal transits are computed lazily on read via `computeCrossAspects` against each player's natal chart — never precomputed per player, never recomputed per request.

- **The Base Layer is generated once and never mutated.** `getOrGenerateBaseLayerWorld` is deterministic and seeded, runs once per player, and only handles `'scorpio'` (throws for any other sign by design). The Transit Overlay composites on top of it (tint_ambient / pulse_landmark / spawn_marker) without ever mutating the Base Layer.

- **Astro's dialogue has no live LLM.** `src/lib/astro/` has an authored tier (a handful of hand-written situations) and a procedural fallback recombined from small parts, behind a Dialogue Router. The absence of any LLM integration point here is a deliberate Phase 2 boundary, not an oversight.

- **The renderer is behind a contract.** `src/nexus-render/` defines a renderer-agnostic contract plus its R3F implementation, including WebGL context-loss recovery and the mobile controls (virtual joystick for movement, drag-to-orbit touch zone for camera, both feeding a per-frame `useFrame` player controller).

## Conventions that will bite you if ignored

- **DB row types must be `type`, never `interface`.** With `@supabase/supabase-js` v2.x, declaring a table's `Row`/`Insert`/`Update` as a named `interface` breaks the library's generic inference and makes every `.insert()`/`.update()` fail typechecking (`... not assignable to 'never[]'`). A structurally identical `type` alias works. Every row type in `src/types/` uses `type` for this reason — reverting any to `interface` silently reintroduces the bug. See the comments in `src/types/world.ts` and `src/lib/database.types.ts`.

- **Ephemeris time units are Julian centuries everywhere.** An earlier bug mixed Julian-millennia time with centuries-based coefficients, producing Sun positions ~180° off. Keep every body function on Julian centuries; honor the warning at the top of `positions.ts` and re-run `verify:ephemeris` after edits.

- **Unload-time analytics go through `navigator.sendBeacon`, not the Supabase client.** A page-teardown `fetch` is unreliable (notably iOS Safari). Because `sendBeacon` cannot set headers, the request arrives unauthenticated, so `session_ended` beacon rows are inserted with `user_id: null` (real id carried only as an informational payload property, never for access control) — and the RLS policy accommodates exactly the `user_id is null` branch and nothing looser. Do not "fix" that policy into an always-true check.

- **Mind the documented Phase scope.** Several limitations are intentional, not bugs: simplified Placidus house approximation (only a house *bucket* is ever needed), three transit-overlay operation types, scorpio-only world generation, a small explicit (non-LLM, non-authoritative) Daily Alignment rule set, five authored Astro situations, and analytics RLS that only lets a player read their own events (cross-player funnel/retention is a service-role/dashboard concern, intentionally not built). See `README.md` "Known simplifications" before "fixing" any of these.

## Reference docs in the repo

- `README.md` — full feature/scope narrative and the bug/decision log (authoritative).
- `README 3.md` — ephemeris licensing decision (VSOP87 vs Swiss Ephemeris).
- `Astroverse_GDD.docx`, `Astroverse_TechnicalBible_v2.docx` — design and technical source documents referenced throughout the code (e.g. GDD §18.1 download-size target drives the Vite `three` manualChunk).
