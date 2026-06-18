-- =============================================================
-- ASTROVERSE (Supabase build) — Migration 004
-- Save System
--
-- One row per (user, world) holding the player's last position and
-- progress markers inside that world — what lets "close the app, come
-- back later" resume exactly where the player left off, rather than
-- respawning at a fixed entry point every time. Distinct from
-- base_layer_worlds (which stores the WORLD's generated content, never
-- changing after first generation) — this table stores the PLAYER'S
-- state within that already-generated world, which changes constantly.
-- =============================================================

create table public.world_saves (
  user_id           uuid not null references auth.users(id) on delete cascade,
  zodiac_sign       text not null,

  position_x        real not null default 0,
  position_y        real not null default 0,
  position_z        real not null default 0,

  -- Free-form per-world progress markers (e.g. "which landmarks
  -- visited", "which collectibles found"). JSONB rather than a fixed
  -- column set because Phase 4's eleven additional worlds will each
  -- have their own progress shape, and this table should not need a
  -- migration per world added.
  progress_json     jsonb not null default '{}',

  last_saved_at     timestamptz not null default now(),

  primary key (user_id, zodiac_sign)
);

alter table public.world_saves enable row level security;

create policy "world_saves_select_own" on public.world_saves
  for select using (auth.uid() = user_id);
create policy "world_saves_insert_own" on public.world_saves
  for insert with check (auth.uid() = user_id);
create policy "world_saves_update_own" on public.world_saves
  for update using (auth.uid() = user_id);

create or replace function public.set_last_saved_at()
returns trigger as $$
begin
  new.last_saved_at = now();
  return new;
end;
$$ language plpgsql;

create trigger world_saves_set_last_saved_at
  before update on public.world_saves
  for each row execute function public.set_last_saved_at();
