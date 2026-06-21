-- =============================================================
-- ASTROVERSE (Supabase build) — Migration 011
-- Arc Quests (Phase 4)
--
-- GDD §20.1 launch content: "all twelve zodiac worlds with full Arc
-- Quests." Each world has an authored, ordered quest chain (its Arc); the
-- chain itself is CODE (src/lib/gameLogic/arcQuests.ts), and this table
-- records only how far each player has progressed in each world's Arc —
-- the same code-defines-content / table-records-progress split used by
-- base_layer_worlds and constellations_drawn.
--
-- One row per (player, world). steps_completed only increases, advanced
-- one step at a time by a guarded update (src/lib/arcQuests.ts) so a
-- step's reward is granted exactly once even under a race. An Arc is
-- complete when steps_completed reaches its chain length (a pure check in
-- arcQuests.ts), so nothing about how long an Arc is lives in the schema.
-- =============================================================

create table public.arc_progress (
  user_id          uuid not null references auth.users(id) on delete cascade,
  zodiac_sign      text not null,
  steps_completed  integer not null default 0 check (steps_completed >= 0),
  updated_at       timestamptz not null default now(),

  primary key (user_id, zodiac_sign)
);

alter table public.arc_progress enable row level security;

create policy "arc_progress_select_own" on public.arc_progress
  for select using (auth.uid() = user_id);
create policy "arc_progress_insert_own" on public.arc_progress
  for insert with check (auth.uid() = user_id);
create policy "arc_progress_update_own" on public.arc_progress
  for update using (auth.uid() = user_id);
-- No DELETE: Arc progress, once made, is permanent.

create trigger arc_progress_set_updated_at
  before update on public.arc_progress
  for each row execute function public.set_updated_at();
