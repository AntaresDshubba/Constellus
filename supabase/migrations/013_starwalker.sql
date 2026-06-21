-- =============================================================
-- ASTROVERSE (Supabase build) — Astral Ascension (post-launch)
-- Migration 013
--
-- GDD §"Astral Ascension": the prestige system. The player climbs a
-- Starwalker Level; on reaching the cap they may Ascend, which resets the
-- Level to 1 but RETAINS all other progress (Zodiac Mastery, Astro Bond,
-- constellations, Star Pass) and applies a permanent modifier to their
-- galaxy. The GDD's exact gate ("complete the Convergence + Level 100")
-- isn't reachable in this build (the full Convergence and a Level 100 cap
-- don't exist yet), so Ascension is gated at the build's Starwalker Level
-- cap — the same adapt-to-what-exists approach used for Astro Bond's
-- launch cap.
--
-- One row per player. level_xp is the ONLY thing an Ascension resets (set
-- back to 0); ascension_tier only ever increases. The Level itself is a
-- PURE function of level_xp (src/lib/gameLogic/ascension.ts), never
-- stored — the same derived-from-one-source pattern as Zodiac Mastery and
-- the currency balance. Every other progression table is untouched by an
-- Ascension, which is what makes "reset Level, keep everything else"
-- structurally true rather than something application code must remember.
-- =============================================================

create table public.starwalker (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  level_xp        integer not null default 0 check (level_xp >= 0),
  ascension_tier  integer not null default 0 check (ascension_tier >= 0),
  updated_at      timestamptz not null default now()
);

alter table public.starwalker enable row level security;

create policy "starwalker_select_own" on public.starwalker
  for select using (auth.uid() = user_id);
create policy "starwalker_insert_own" on public.starwalker
  for insert with check (auth.uid() = user_id);
create policy "starwalker_update_own" on public.starwalker
  for update using (auth.uid() = user_id);

create trigger starwalker_set_updated_at
  before update on public.starwalker
  for each row execute function public.set_updated_at();
