-- =============================================================
-- ASTROVERSE (Supabase build) — Migration 009
-- Constellation Drawing (Phase 4)
--
-- GDD Appendix: "Constellation Drawing — connecting explored stars to
-- form constellations for passive bonuses." The player draws a
-- constellation once they have explored (entered) every world in it; the
-- set of constellations is the real astrological groupings — the four
-- elemental triplicities, the three modal quadruplicities, and the full
-- zodiac wheel (see src/lib/gameLogic/constellations.ts).
--
-- One row per (player, constellation), written once when drawn and never
-- changed. The catalogue of constellations themselves is CODE, not data
-- in this table — this table records only WHICH a given player has drawn,
-- the same way base_layer_worlds records which worlds a player has
-- generated rather than redefining what a world is.
-- =============================================================

create table public.constellations_drawn (
  user_id           uuid not null references auth.users(id) on delete cascade,
  constellation_id  text not null,
  drawn_at          timestamptz not null default now(),

  primary key (user_id, constellation_id)
);

alter table public.constellations_drawn enable row level security;

create policy "constellations_drawn_select_own" on public.constellations_drawn
  for select using (auth.uid() = user_id);
create policy "constellations_drawn_insert_own" on public.constellations_drawn
  for insert with check (auth.uid() = user_id);
-- No UPDATE or DELETE: a drawn constellation is permanent (its one-time
-- reward is credited through the append-only currency_ledger, so allowing
-- a redraw would be a double-credit vector).
