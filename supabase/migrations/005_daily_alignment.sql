-- =============================================================
-- ASTROVERSE (Supabase build) — Migration 005
-- Daily Alignment (Phase 2: The Loop)
--
-- One row per (player, local calendar date). Generated idempotently —
-- the unique constraint below is what makes "generate today's Alignment
-- if it doesn't exist yet" safe to call from multiple paths (an
-- explicit player visit, a batch precompute job) without ever producing
-- two different Alignments for the same player on the same day.
--
-- local_date is the PLAYER's local calendar date, not a UTC date — the
-- Daily Minimum loop is meant to feel tied to the player's own day, not
-- a server's. The transit data this Alignment derives from still comes
-- from the global, UTC-keyed transit_snapshots table (migration 003);
-- src/lib/dailyAlignment.ts is responsible for resolving which UTC
-- snapshot a given local date should read, not this schema.
-- =============================================================

create table public.daily_alignments (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  local_date             date not null,

  cosmic_weather_summary text not null,
  focus_planet           text not null,
  opportunity_zone       text not null,
  quest_objective        text not null,
  quest_reward_amount    integer not null check (quest_reward_amount > 0),
  challenge_rating       text not null check (challenge_rating in ('very_harmonious', 'harmonious', 'balanced', 'tense', 'very_tense')),
  lucky_element          text not null,
  astro_insight          text not null,

  generated_at           timestamptz not null default now(),
  quest_completed_at     timestamptz,

  unique (user_id, local_date)
);

alter table public.daily_alignments enable row level security;

create policy "daily_alignments_select_own" on public.daily_alignments
  for select using (auth.uid() = user_id);
create policy "daily_alignments_insert_own" on public.daily_alignments
  for insert with check (auth.uid() = user_id);
-- UPDATE is allowed (unlike cosmic_profiles) but ONLY for marking the
-- quest complete — there is no column here a player should be able to
-- rewrite arbitrarily. Postgres RLS can't restrict which COLUMNS an
-- update touches, only which ROWS, so the actual restriction (only
-- quest_completed_at may be set, and only from null to a real
-- timestamp) is enforced in src/lib/dailyAlignment.ts's
-- completeQuest function, not at the database layer. This mirrors the
-- same model the rest of this schema uses: RLS is the row-level
-- boundary, application code is responsible for column-level intent
-- within a row a player is otherwise allowed to touch.
create policy "daily_alignments_update_own" on public.daily_alignments
  for update using (auth.uid() = user_id);

create index daily_alignments_user_date_idx on public.daily_alignments (user_id, local_date desc);
