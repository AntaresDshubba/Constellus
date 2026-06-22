-- =============================================================
-- ASTROVERSE (Supabase build) — Migration 010
-- Astro Bond progression (Phase 4)
--
-- GDD §10.4: the player–Astro relationship evolves through five phases
-- (Stranger → Companion → Confidant → Partner → Nexus), each warming
-- Astro's tone and unlocking content. The GDD's triggers reference Arc
-- Quests and the Convergence storyline, which this build does not yet
-- implement, so progress here is driven by the engagement the build DOES
-- have (the Daily Alignment loop). Earnable progress is capped at Phase 3
-- — the launch scope (§20.1: "Astro companion at Bond Phases 1–3"); the
-- pure logic (src/lib/gameLogic/astroBond.ts) gates Phases 4–5 behind the
-- story content that will unlock them later.
--
-- One row per player; bond_points only increases. The phase is a PURE
-- function of the points (never stored), the same derived-from-one-source
-- pattern as zodiac_mastery and the currency balance.
-- =============================================================

create table public.astro_bond (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  bond_points  integer not null default 0 check (bond_points >= 0),
  updated_at   timestamptz not null default now()
);

alter table public.astro_bond enable row level security;

create policy "astro_bond_select_own" on public.astro_bond
  for select using (auth.uid() = user_id);
create policy "astro_bond_insert_own" on public.astro_bond
  for insert with check (auth.uid() = user_id);
create policy "astro_bond_update_own" on public.astro_bond
  for update using (auth.uid() = user_id);

create trigger astro_bond_set_updated_at
  before update on public.astro_bond
  for each row execute function public.set_updated_at();
