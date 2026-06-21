-- =============================================================
-- ASTROVERSE (Supabase build) — Migration 003
-- Base Layer Worlds & Transit Overlay framework
--
-- Technical Bible B.8.2's two-layer world model: a Base Layer (computed
-- once from the player's natal chart, deterministic, stable) composited
-- with a Transit Overlay (today's planetary weather, changes daily,
-- never mutates the Base Layer's stored data). This phase implements
-- exactly ONE Base Layer world — Scorpio/Abyssia — but the schema is the
-- general one Phase 4 will reuse for the other eleven, not a
-- Scorpio-specific table.
-- =============================================================

create table public.base_layer_worlds (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  zodiac_sign     text not null,

  -- The deterministic generation seed and resulting world descriptor.
  -- Stored once, on first generation, and never regenerated for the
  -- same (user, sign) pair — regenerating would change a player's world
  -- out from under them, which the Base Layer's whole purpose (a STABLE
  -- personal world) exists to prevent.
  seed            text not null,
  world_json      jsonb not null,

  generated_at    timestamptz not null default now(),

  unique (user_id, zodiac_sign)
);

alter table public.base_layer_worlds enable row level security;

create policy "base_layer_worlds_select_own" on public.base_layer_worlds
  for select using (auth.uid() = user_id);
create policy "base_layer_worlds_insert_own" on public.base_layer_worlds
  for insert with check (auth.uid() = user_id);

create index base_layer_worlds_user_idx on public.base_layer_worlds (user_id, zodiac_sign);

-- ── Transit Overlay ───────────────────────────────────────────
-- One row per UTC calendar date — identical for every player on that
-- date (Technical Bible B.8.4: planetary positions are a shared fact,
-- computed once, never per-user).
create table public.transit_snapshots (
  snapshot_date         date primary key,
  positions_json        jsonb not null,
  retrograde_bodies     text[] not null default '{}',
  lunar_phase_fraction  numeric(5,4) not null check (lunar_phase_fraction between 0 and 1),
  computed_at           timestamptz not null default now()
);

alter table public.transit_snapshots enable row level security;

-- Readable by ANY authenticated user (it's the same shared fact for
-- everyone), but only insertable, never updatable, since a given date's
-- positions never change once computed.
create policy "transit_snapshots_select_any_authenticated" on public.transit_snapshots
  for select using (auth.role() = 'authenticated');
create policy "transit_snapshots_insert_any_authenticated" on public.transit_snapshots
  for insert with check (auth.role() = 'authenticated');
