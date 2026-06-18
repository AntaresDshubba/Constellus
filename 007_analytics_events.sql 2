-- =============================================================
-- ASTROVERSE (Supabase build) — Migration 007
-- Analytics Event Taxonomy (Acquisition + Engagement, plus a narrow
-- Phase 3 stability exception)
--
-- Architecture Audit Phase 2: "Instrument the core analytics funnel
-- (acquisition + engagement rows) before any external playtesting, so
-- MVP exit criteria are measurable from day one of testing." Scoped
-- deliberately to ONLY those two rows — progression/monetization/
-- AI-cost/health rows are not instrumented here, since the systems
-- they'd measure (a store, a live LLM, the full eleven-world set)
-- don't exist yet in this build. Adding event types for systems that
-- don't exist would just be dead schema.
--
-- session_ended / webgl_context_lost / webgl_context_restored were
-- added in Phase 3, after this migration originally shipped, because
-- Phase 3's exit criteria explicitly require "Daily Minimum session
-- length against the 3-5 minute target" and "at least one logged
-- context-loss-and-recovery cycle" — neither was measurable without
-- these three events. This is the one Health-row exception; the rest
-- of that row (frame-time percentiles, generation latency, general
-- crash-free %) remains deliberately out of scope.
--
-- A single generic events table with a typed event_name column is used
-- rather than one table per KPI row, since the event taxonomy will grow
-- much faster than the table structure should.
-- =============================================================

create type analytics_event_name as enum (
  -- Acquisition
  'onboarding_started',
  'onboarding_completed',
  'birth_moment_revealed',
  -- Engagement
  'session_started',
  'session_ended',
  'daily_alignment_generated',
  'daily_alignment_quest_completed',
  'world_entered',
  -- Health (Phase 3 exception, see header comment)
  'webgl_context_lost',
  'webgl_context_restored'
);

create table public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade, -- nullable: onboarding_started can fire before a user row exists yet (age-gate step, pre-auth)
  event_name  analytics_event_name not null,
  properties  jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

-- A player may insert their OWN events, and read their OWN events (so
-- the client can, if ever needed, show "your activity" back to you) —
-- but never another player's. There is deliberately no aggregate-level
-- read policy here (e.g. "any authenticated user can read funnel
-- totals"); computing real funnel/retention numbers across ALL users is
-- an operator/dashboard concern that runs with elevated (service-role)
-- database access outside this RLS model entirely, not something the
-- client-side anon key should ever be able to query directly.
--
-- session_ended is sent via navigator.sendBeacon for delivery
-- reliability during page teardown/backgrounding (see
-- src/hooks/useSessionTracking.ts). sendBeacon cannot attach a custom
-- Authorization header, so a beacon-originated request reaches
-- PostgREST as the UNAUTHENTICATED anon role — auth.uid() is null on
-- that request no matter what value the client puts in the user_id
-- column. That means "auth.uid() = user_id" can never be satisfied by
-- a beacon request, so loosening this check to let a non-null,
-- non-matching user_id through would not actually serve the beacon
-- case — it would just be a wide-open hole. The real, correctly-scoped
-- accommodation is: beacon-originated session_ended rows are inserted
-- with user_id set to NULL (the same "anonymous-shaped" row
-- onboarding_started already uses), and the actual user association is
-- carried instead as a plain property in the JSONB payload, which is
-- informational only and intentionally not relied on for anything
-- access-control-relevant. See src/hooks/useSessionTracking.ts and
-- src/lib/analytics.ts for the client-side half of this.
create policy "analytics_events_select_own" on public.analytics_events
  for select using (auth.uid() = user_id);
create policy "analytics_events_insert_own_or_anonymous" on public.analytics_events
  for insert with check (user_id is null or auth.uid() = user_id);

create index analytics_events_user_idx on public.analytics_events (user_id, created_at desc);
create index analytics_events_name_idx on public.analytics_events (event_name, created_at desc);
