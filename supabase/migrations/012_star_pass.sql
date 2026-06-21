-- =============================================================
-- ASTROVERSE (Supabase build) — Migration 012
-- Star Pass (Phase 4)
--
-- GDD §20.1 launch content: "the first Star Pass." A seasonal, tiered
-- reward track that everything the player does feeds: completing Daily
-- Alignment quests and Arc steps grants Star Pass XP, and each tier
-- reached unlocks a claimable reward.
--
-- FREE TRACK ONLY. The GDD commits to never gating narrative behind
-- purchases and never shipping pay-to-win, and this build has no payment
-- system at all — so every tier is free. A premium track, if ever added,
-- is an additive column/table, not a change to this one.
--
-- Two tables, mirroring patterns already in this schema:
--   * star_pass_progress — one row per (player, season); xp only rises
--     (the same upsert-counter shape as astro_bond / zodiac_mastery).
--   * star_pass_claims    — one row per (player, season, tier) claimed;
--     insert-once, no update/delete, so the reward (credited through the
--     append-only currency_ledger) can never be double-claimed — the same
--     guarantee constellations_drawn relies on.
-- The season catalogue and tier thresholds are CODE
-- (src/lib/gameLogic/starPass.ts), not rows here.
-- =============================================================

create table public.star_pass_progress (
  user_id     uuid not null references auth.users(id) on delete cascade,
  season_id   text not null,
  xp          integer not null default 0 check (xp >= 0),
  updated_at  timestamptz not null default now(),

  primary key (user_id, season_id)
);

alter table public.star_pass_progress enable row level security;

create policy "star_pass_progress_select_own" on public.star_pass_progress
  for select using (auth.uid() = user_id);
create policy "star_pass_progress_insert_own" on public.star_pass_progress
  for insert with check (auth.uid() = user_id);
create policy "star_pass_progress_update_own" on public.star_pass_progress
  for update using (auth.uid() = user_id);

create trigger star_pass_progress_set_updated_at
  before update on public.star_pass_progress
  for each row execute function public.set_updated_at();

create table public.star_pass_claims (
  user_id     uuid not null references auth.users(id) on delete cascade,
  season_id   text not null,
  tier        integer not null check (tier >= 1),
  claimed_at  timestamptz not null default now(),

  primary key (user_id, season_id, tier)
);

alter table public.star_pass_claims enable row level security;

create policy "star_pass_claims_select_own" on public.star_pass_claims
  for select using (auth.uid() = user_id);
create policy "star_pass_claims_insert_own" on public.star_pass_claims
  for insert with check (auth.uid() = user_id);
-- No UPDATE or DELETE: a claim is permanent (its reward is credited
-- through the append-only ledger; re-claiming would be a double-credit).
