-- =============================================================
-- ASTROVERSE (Supabase build) — Migration 008
-- Zodiac Mastery (Phase 4)
--
-- GDD §20.1 launch content: "ten-tier Zodiac Mastery per world." The
-- first Phase 4 progression system — a per-world mastery track the player
-- climbs by returning to and engaging with each of the twelve worlds over
-- time.
--
-- One row per (player, world). `xp` only ever increases; the tier (1–10)
-- is a PURE function of xp (src/lib/gameLogic/zodiacMastery.ts), never
-- stored, for the same reason the currency balance is derived from the
-- ledger rather than stored — there is exactly one source of truth (xp),
-- and the tier can never drift out of sync with it.
--
-- This is intentionally an UPSERT-style table (like `momentum`), not an
-- append-only ledger: unlike currency, mastery xp has no spend/debit
-- semantics to audit, so a single incrementing counter per (player,
-- world) is the right shape. The earn path is rate-limited to once per
-- local day per world via `last_xp_date` (see grantDailyWorldVisitXp in
-- src/lib/zodiacMastery.ts), so re-entering a world repeatedly in one day
-- cannot farm mastery.
-- =============================================================

create table public.zodiac_mastery (
  user_id       uuid not null references auth.users(id) on delete cascade,
  zodiac_sign   text not null,
  xp            integer not null default 0 check (xp >= 0),
  -- Local date of the most recent daily world-visit XP grant. The earn
  -- path only credits XP when this is not already today, which is what
  -- makes the daily visit reward idempotent per (player, world, day).
  last_xp_date  date,
  updated_at    timestamptz not null default now(),

  primary key (user_id, zodiac_sign)
);

alter table public.zodiac_mastery enable row level security;

create policy "zodiac_mastery_select_own" on public.zodiac_mastery
  for select using (auth.uid() = user_id);
create policy "zodiac_mastery_insert_own" on public.zodiac_mastery
  for insert with check (auth.uid() = user_id);
create policy "zodiac_mastery_update_own" on public.zodiac_mastery
  for update using (auth.uid() = user_id);
-- No DELETE policy: mastery, once earned, is permanent.

create trigger zodiac_mastery_set_updated_at
  before update on public.zodiac_mastery
  for each row execute function public.set_updated_at();
