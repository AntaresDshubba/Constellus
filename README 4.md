# Astroverse: Constellation Nexus — Supabase/R3F Build

First playable build. **Phase 0 + Phase 1 only**, on a different stack
than the original `astroverse-foundation` (Fastify/Postgres/raw
Three.js): **React + TypeScript + Vite + React Three Fiber + Three.js +
Zustand + Supabase**. This is a separate, parallel project — it does not
replace or share code with `astroverse-foundation`.

## What's implemented

**Phase 0**
- Authentication: passwordless email OTP via Supabase Auth (no custom
  token issuance anywhere in this codebase).
- User profiles: `public.profiles`, bootstrapped automatically by a
  Postgres trigger the moment `auth.users` gets a new row.
- Consent flow: a four-tier, append-only consent ledger
  (essential/precise_location/life_concerns/goals), each tier recorded
  *before* the data it gates is collected.
- Persistence layer + database schema: every table has Row Level
  Security enabled with explicit per-table policies — RLS, not
  application code, is the actual security boundary in this build.

**Phase 1**
- Natal chart engine: a ported, license-documented, bug-verified VSOP87
  ephemeris (`ephemeris/`), computing real planetary positions, houses
  (Placidus approximation + solar fallback), and major aspects.
- Birth data onboarding: a consent-gated, step-by-step flow ending in a
  Birth Moment reveal.
- Sun sign determination: real, not hardcoded — derived from actual
  ecliptic longitude at the resolved birth moment.
- One playable zodiac world: **Scorpio (Abyssia)** — four biomes
  (abyssal trench, bioluminescent cavern, obsidian spire, tidal ruins),
  four authored landmarks with lore.
- 3D star map: all twelve signs rendered, with Scorpio the only
  enterable one and the player's own Sun sign highlighted.
- Base Layer world generation: deterministic, seeded, generated once per
  player and never regenerated.
- Transit Overlay framework: a real global-snapshot cache plus a working
  (if intentionally small) set of compositing operations — ambient tint,
  landmark pulse, calm-day marker — layered on top of the Base Layer
  without ever mutating it.
- Mobile controls: a virtual joystick (movement) and a drag-to-orbit
  touch zone (camera), both touch-first, both feeding a per-frame
  `useFrame` player controller.
- Save system: position + progress persisted per (player, world),
  autosaved on an interval and on page hide/unmount.

**Phase 2 — The Loop**
- Daily Minimum loop: Astro greeting (via the Dialogue Router), full
  Daily Alignment generation (cosmic weather, focus planet, opportunity
  zone, quest objective, challenge rating, lucky element, astro
  insight), quest completion, reward claim — all surfaced in a rebuilt
  Nexus screen.
- Global ephemeris cache + personal-transit lazy comparison: the SAME
  `transit_snapshots` cache Phase 1's Transit Overlay uses (one fetch
  path, not two), compared against each player's natal chart on read
  via a new `computeCrossAspects` ephemeris primitive — never
  precomputed per player, never recomputed per request.
- Momentum (`supabase/migrations/006`): rises on engagement, decays
  gradually (not to zero) on missed days, with an earnable bank of
  protected days that absorb short gaps with no decay at all — built
  from the start instead of any streak mechanic, including a real
  `consecutive_engaged_days` column so the "earn protected days back"
  logic is actually persisted, not reconstructed as a placeholder on
  every load.
- Astro's procedural + authored dialogue tiers and the Dialogue Router
  (`src/lib/astro/`): authored lines for recognized situations (first
  Alignment, first world entry, etc.), a procedural fallback built from
  small recombinable parts for every ordinary day. No live LLM
  integration point exists anywhere in this tier — that is a deliberate
  Phase 2 boundary, not an oversight.
- Acquisition + engagement analytics funnel (`supabase/migrations/007`):
  `onboarding_started` (fires before authentication, from the age-gate
  step, so the funnel's true top is captured), `onboarding_completed`,
  `birth_moment_revealed`, `session_started` (fired once per app load
  via a store-backed flag, not a component ref, since `AuthGate`
  remounts on every route navigation), `daily_alignment_generated`,
  `daily_alignment_quest_completed`, `world_entered`.

**Phase 3 — MVP Validation Gate**

Phase 3, per the Architecture Audit, is a **closed playtest against real
users on a real device pool, ending in a go/no-go decision** — not a
coding phase. That activity cannot happen in this environment: there is
no real tester pool here, no iOS Safari device lab, and no real D1/D7
retention or onboarding-completion data to report. Fabricating those
numbers or a go/no-go verdict would defeat the entire purpose of a gate
that exists specifically to avoid building Phase 4's eleven additional
worlds on top of an unvalidated core loop.

What this build adds is the **instrumentation** the gate's exit criteria
actually depend on — the two pieces that were genuinely missing after
Phase 2:

- **Daily Minimum session length.** `session_started` already existed;
  there was no `session_ended` and no real duration measurement. Added:
  a `session_ended` event carrying actual elapsed foreground time,
  delivered via `navigator.sendBeacon` rather than a normal Supabase
  client call, since a page-teardown-time `fetch` is not reliable
  (particularly on iOS Safari) and a dropped duration event would
  silently bias the very number this criterion needs. One real
  constraint surfaced and had to be resolved here: PostgREST authorizes
  strictly off the `Authorization` header, and `sendBeacon` cannot set
  custom headers at all — so a beacon request necessarily arrives
  unauthenticated. The fix is RLS-correct, not a workaround: a
  beacon-originated `session_ended` row is inserted with `user_id: null`
  (the same shape `onboarding_started` already used for its own
  pre-auth case), with the real player id carried only as an
  informational property in the JSON payload, never relied on for
  access control.
- **WebGL context-loss-and-recovery, logged.** The recovery UI already
  worked (Phase 1); it just never reported to analytics, so "at least
  one logged context-loss-and-recovery cycle" had no way to be
  confirmed from data, only from someone watching it happen live.
  `webgl_context_lost` and `webgl_context_restored` (with a computed
  `recoveryMs`) now fire from the same hook that already drives the
  reconnecting-overlay state.

A mistake worth recording here too: the first draft of the loosened RLS
policy for the beacon case read `user_id is null or auth.uid() = user_id
or user_id is not null` — that third clause makes the whole check
trivially always-true (`X or not X`), which would have removed RLS's
auth check from this table entirely, not just accommodated the beacon
case. Caught and fixed before being treated as final: the beacon case
actually only ever needs (and only ever gets) the `user_id is null`
branch, since an unauthenticated `sendBeacon` request can never satisfy
`auth.uid() = user_id` for any non-null value regardless of how loose
that check is — loosening it further wouldn't have even solved the
stated problem, just opened an unrelated hole.

**Still genuinely missing for a real Phase 3 attempt**, regardless of
any further code: real testers, an actual iOS Safari device pool,
observed onboarding completion and D1/D7 numbers, and the go/no-go
decision itself on whether the personalization hypothesis (chart-seeded
worlds feel personal) and the loop hypothesis (daily return) show real
signal. No future code change in this project can substitute for that.

## A note on "Abyssia"

Nothing in the source documents this build is based on names the
Scorpio world "Abyssia" or specifies its biomes. That naming and theming
is art direction introduced during this build, grounded in Scorpio's
conventional fixed-water/depth-and-transformation associations, not
pulled from an existing GDD passage.

## Project layout

| Path | What it is |
|---|---|
| `ephemeris/` | Self-contained astrology math: positions, houses, aspects (including cross-set comparison), natal chart assembly. Zero dependency on `src/`. |
| `supabase/migrations/` | Seven SQL migrations: profiles+consent, cosmic profiles, Base Layer+Transit, world saves, Daily Alignment, ledger+Momentum, analytics events. |
| `src/types/` | Domain types mirroring the schema and re-exporting ephemeris's zodiac vocabulary. |
| `src/lib/` | Supabase client, auth, profile/consent/cosmic-profile data access, world generation, save system, Daily Alignment orchestration, ledger, Momentum, analytics (including a sendBeacon path for unload-safe events). |
| `src/lib/gameLogic/` | Pure derivation functions: personal-transit comparison, Daily Alignment content, Momentum decay/rise math. No I/O in this directory at all. |
| `src/lib/astro/` | Astro's authored + procedural dialogue tiers and the Dialogue Router. No live LLM integration point. |
| `src/state/` | Zustand stores: auth, cosmic profile, world. |
| `src/hooks/` | React-facing wrappers tying state + lib together for screens. |
| `src/nexus-render/` | The renderer-agnostic contract + its R3F implementation, including context-loss recovery and mobile controls. |
| `src/screens/` | Onboarding, Star Map, World, Nexus (now the Daily Minimum loop's home). |
| `src/app/` | Root, router, AuthGate. |

## A real bug found and fixed during this build

Wiring `src/lib/database.types.ts` to the real, installed
`@supabase/supabase-js` (v2.108.2) caused every `.insert()`/`.update()`
call across the app to fail type-checking with `Argument of type '{...}'
is not assignable to parameter of type 'never[]'`. Root-caused via an
isolated minimal repro: **a named `interface X {...}` used as a table's
`Row`/`Insert`/`Update` type breaks supabase-js's generic inference,
even though a structurally identical `type X = {...}` alias works
correctly.** Every row type in `src/types/` is declared with `type`, not
`interface`, for this reason — see the comment in `src/types/world.ts`
and `src/lib/database.types.ts` for the full explanation. This is a
real, narrow quirk of this library version's type machinery, not a
style preference; reverting any of those declarations back to
`interface` will silently reintroduce the bug.

## Known simplifications (Phase 1 scope, not bugs)

- **House system**: a simplified Placidus-family approximation (equal
  30° cusps from a correctly-derived Ascendant), not iterative true
  Placidus. Sufficient for every gameplay decision in this codebase,
  which only ever needs a house *bucket*, never an exact cusp degree.
- **Transit Overlay operation set**: three operation types
  (tint_ambient, pulse_landmark, spawn_marker) cover this phase's scope.
  The `OverlayOperation` shape is general; adding more operation types
  later doesn't require changing it.
- **World generator coverage**: `getOrGenerateBaseLayerWorld` only
  handles `'scorpio'` and throws a clear error for any other sign — by
  design, since Abyssia is the one world this build implements.
- **Nexus screen**: now the Daily Minimum loop's home (Phase 2), but
  still has no world-select beyond a Star Map link, no social/guild
  features, and no storefront — all explicitly out of scope for Phase
  0+1+2.
- **Daily Alignment content rules**: the tense/harmonious scoring and
  text-selection rules in `src/lib/gameLogic/dailyAlignment.ts` are a
  small, legible, explicit rule set — not a claim of astrological
  authority, and not LLM-generated. Richer or more varied content is
  additive on top of the same `DailyAlignmentContent` shape.
- **Astro's authored situations**: only five hand-written situations
  exist (`src/lib/astro/authoredDialogue.ts`). The Nexus screen can only
  trigger `first_daily_alignment` from data already on hand; recognizing
  other situations (e.g. true "first ever login," distinct from "first
  Alignment") would need a dedicated flag this phase's schema doesn't
  carry yet.
- **Analytics aggregation**: `analytics_events` only has RLS policies
  for a player reading their OWN events. Computing real funnel/retention
  numbers across all players is an operator/dashboard concern requiring
  elevated (service-role) database access outside the anon-key RLS model
  entirely — intentionally not built here.

## Running this

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run verify:ephemeris     # confirms the ephemeris engine against a published reference
npm run dev                  # local dev server
npm run build                # production build (includes a full typecheck)
```

Database setup: apply `supabase/migrations/*.sql` in order against a
real Supabase project (via the SQL editor, or the Supabase CLI's
`supabase db push` if linked to a project).
