-- =============================================================
-- ASTROVERSE (Supabase build) — Migration 002
-- Cosmic Profiles (Natal Charts)
--
-- One row per user, holding the birth data they provided AND the fully
-- computed chart derived from it (GDD §2.2: "a persistent data object
-- that governs every procedural decision in the game"). The chart itself
-- is computed CLIENT-SIDE by ephemeris/src/natal.ts (a pure, deterministic
-- function — see that module's header) and stored here as the result,
-- not recomputed by the database. Storing the computed chart, not just
-- the raw birth inputs, means every later read (world generation, the
-- star map, Daily Alignment derivation) is a cheap select, never a
-- recomputation.
-- =============================================================

create table public.cosmic_profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,

  -- Raw birth inputs, exactly as the player provided them at onboarding.
  birth_date           date not null,
  birth_time           time,                    -- null => unknown birth time (solar fallback, Bible B.2.2)
  birth_timezone       text not null,
  birth_lat            numeric(8,5),             -- null unless precise_location consent was granted
  birth_lng            numeric(8,5),

  -- The fully computed chart (ephemeris/src/natal.ts's NatalChart shape),
  -- stored as JSONB so the exact computed structure travels intact
  -- without a column per planet/aspect. Indexed below on the two fields
  -- (sun_sign, moon_sign) every other system actually filters/joins on.
  chart_json           jsonb not null,
  sun_sign             text not null,
  moon_sign            text not null,
  rising_sign          text,
  house_resolution_state text not null check (house_resolution_state in ('fully_resolved', 'provisional_solar')),

  -- Player-stated tags (Technical Bible B.2.1's life_concerns/goals
  -- tiers) — null/empty when that consent tier was declined, never
  -- backfilled from any other source.
  personality_tags     text[] not null default '{}',
  concern_tags          text[] not null default '{}',
  goal_tags             text[] not null default '{}',

  created_at            timestamptz not null default now()
);

alter table public.cosmic_profiles enable row level security;

create policy "cosmic_profiles_select_own" on public.cosmic_profiles
  for select using (auth.uid() = user_id);
create policy "cosmic_profiles_insert_own" on public.cosmic_profiles
  for insert with check (auth.uid() = user_id);
-- Deliberately NO update policy: a natal chart is a fact about when and
-- where someone was born, which does not change. "Editing" a chart (e.g.
-- correcting a typo'd birth time) is modeled as the player going through
-- onboarding again, which is out of scope for this foundation's single
-- insert-only flow; if a real edit flow is added later, it should
-- consider whether downstream world-gen state needs to be invalidated
-- too, which a bare UPDATE policy would silently skip.

create index cosmic_profiles_sun_sign_idx on public.cosmic_profiles (sun_sign);
