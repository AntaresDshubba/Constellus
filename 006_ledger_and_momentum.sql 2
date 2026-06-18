-- =============================================================
-- ASTROVERSE (Supabase build) — Migration 006
-- Currency Ledger & Momentum
--
-- Two systems Phase 2's Daily Minimum loop depends on:
--
-- 1. An append-only currency ledger (stardust), so "reward claim" has
--    something real to credit. Append-only for the same reason
--    consent_records is: a wallet BALANCE is a derived value (sum of
--    ledger rows), never stored and mutated directly, which makes
--    double-spends and silent balance corruption structurally harder —
--    every credit is its own permanent row with a reason, not an
--    in-place increment nobody can audit later.
--
-- 2. Momentum: deliberately built INSTEAD OF a streak mechanic, not as
--    a streak with a friendlier name. A punitive streak (lose
--    everything for missing one day) is explicitly the kind of
--    mechanic this product should never ship, even temporarily — see
--    the comment on the decay logic below for how this differs in
--    actual behavior, not just framing.
-- =============================================================

create table public.currency_ledger (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  amount          integer not null,                 -- positive = credit, negative = debit; never zero
  reason          text not null,                     -- e.g. 'daily_alignment_quest', 'world_first_visit'
  ref_id          uuid,                              -- optional pointer to the row that caused this (e.g. a daily_alignments.id)
  created_at      timestamptz not null default now(),

  constraint currency_ledger_amount_not_zero check (amount <> 0)
);

alter table public.currency_ledger enable row level security;

create policy "currency_ledger_select_own" on public.currency_ledger
  for select using (auth.uid() = user_id);
create policy "currency_ledger_insert_own" on public.currency_ledger
  for insert with check (auth.uid() = user_id);
-- No UPDATE or DELETE policy at all: a ledger entry, once written, is
-- permanent. Correcting a mistaken credit means inserting a
-- compensating debit row, never editing or removing the original.

create index currency_ledger_user_idx on public.currency_ledger (user_id, created_at desc);

-- Convenience view: current balance per user, computed from the ledger
-- rather than stored — see header comment for why.
create view public.currency_balances as
  select user_id, coalesce(sum(amount), 0) as balance
  from public.currency_ledger
  group by user_id;

-- ── Momentum ──────────────────────────────────────────────────
-- One row per player. Momentum RISES on each day the Daily Minimum loop
-- is engaged with, and DECAYS gradually (not resets to zero) on missed
-- days, with a small bank of "protected" days that absorb a short gap
-- with no decay at all — modeling something closer to "this habit is
-- still warm" than "you broke your streak." The actual decay
-- computation is read-time (see src/lib/momentum.ts), derived from
-- last_engaged_date vs today rather than a background job ticking a
-- stored value down — there is no scheduled process required to keep
-- this correct, only a pure function of (stored state, current date).
create table public.momentum (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  current_value            numeric(6,2) not null default 0 check (current_value >= 0 and current_value <= 100),
  protected_days_left      integer not null default 2 check (protected_days_left >= 0),
  last_engaged_date        date,
  -- Tracks consecutive engaged days with NO gap, used ONLY to decide
  -- when a new protected day is earned back (src/lib/gameLogic/momentum.ts).
  -- This is intentionally separate from current_value: a missed day
  -- resets this counter to 0 even though it does NOT reset
  -- current_value to 0 — that distinction is the entire point of
  -- Momentum existing instead of a streak mechanic. See this table's
  -- header comment.
  consecutive_engaged_days integer not null default 0 check (consecutive_engaged_days >= 0),
  updated_at               timestamptz not null default now()
);

alter table public.momentum enable row level security;

create policy "momentum_select_own" on public.momentum
  for select using (auth.uid() = user_id);
create policy "momentum_insert_own" on public.momentum
  for insert with check (auth.uid() = user_id);
create policy "momentum_update_own" on public.momentum
  for update using (auth.uid() = user_id);

create trigger momentum_set_updated_at
  before update on public.momentum
  for each row execute function public.set_updated_at();
