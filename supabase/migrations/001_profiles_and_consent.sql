-- =============================================================
-- ASTROVERSE (Supabase build) — Migration 001
-- Profiles & Consent
--
-- Supabase Auth (auth.users) already provides the account/identity
-- primitive (Technical Bible B.9: passwordless email/OTP and OAuth are
-- both natively supported by Supabase Auth, so this schema does not
-- reimplement password storage or token issuance at all). This
-- migration adds exactly what auth.users does NOT provide: a public,
-- queryable profile row per user, and the layered consent model
-- Technical Bible B.2.1 requires before any sensitive data collection.
--
-- Row Level Security (RLS) is enabled on every table in this schema and
-- is the actual security boundary — there is no separate "server"
-- enforcing access rules in this build; Postgres itself enforces them
-- via auth.uid() on every query the browser's Supabase client issues.
-- =============================================================

create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  age_group           text not null check (age_group in ('adult', 'minor')),
  onboarding_complete boolean not null default false,
  display_name        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can only ever see or modify their OWN profile row. This is the
-- structural equivalent of the old Fastify build's requireAuth
-- middleware + "where account_id = $1" pattern, expressed as a database
-- policy instead of application code — there is no path through the
-- Supabase client that lets one user read another's profile.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ── Consent (Technical Bible B.2.1) ──────────────────────────
-- Layered, per-tier consent: essential (birth date — never declinable),
-- precise_location, life_concerns, goals. Each tier is a separate row so
-- the history of what was granted/revoked and when is preserved, rather
-- than overwritten — this matters for any future data-subject-request
-- audit trail (B.10.2).
create type consent_tier as enum ('essential', 'precise_location', 'life_concerns', 'goals');

create table public.consent_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tier        consent_tier not null,
  granted     boolean not null,
  recorded_at timestamptz not null default now()
);

alter table public.consent_records enable row level security;

create policy "consent_select_own" on public.consent_records
  for select using (auth.uid() = user_id);
create policy "consent_insert_own" on public.consent_records
  for insert with check (auth.uid() = user_id);

create index consent_records_user_tier_idx on public.consent_records (user_id, tier, recorded_at desc);

-- Convenience view: the CURRENT (most recent) consent state per tier per
-- user, since consent_records is an append-only history and most reads
-- only care about "what's true right now."
create view public.current_consent as
  select distinct on (user_id, tier) user_id, tier, granted, recorded_at
  from public.consent_records
  order by user_id, tier, recorded_at desc;

-- ── updated_at maintenance ───────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── New-user bootstrap ────────────────────────────────────────
-- Supabase Auth creates the auth.users row on sign-up; this trigger
-- creates the matching public.profiles row in the same transaction, so
-- the app never has to remember to call a separate "create profile"
-- step after sign-up and never observes a user with no profile row.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, age_group)
  values (new.id, coalesce(new.raw_user_meta_data->>'age_group', 'adult'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
