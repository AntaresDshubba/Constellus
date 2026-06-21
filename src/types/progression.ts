/**
 * Currency ledger and Momentum types.
 *
 * Mirrors supabase/migrations/006_ledger_and_momentum.sql.
 *
 * See src/types/world.ts's header note: Row types consumed by Database
 * (src/lib/database.types.ts) must be `type` aliases, not `interface`
 * declarations, or supabase-js's generic inference for
 * .insert()/.update() silently collapses to `never`.
 */

export type CurrencyLedgerRow = {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  ref_id: string | null;
  created_at: string;
};

export type CurrencyBalanceRow = {
  user_id: string;
  balance: number;
};

export type MomentumRow = {
  user_id: string;
  current_value: number;
  protected_days_left: number;
  last_engaged_date: string | null;
  consecutive_engaged_days: number;
  updated_at: string;
};

export type ZodiacMasteryRow = {
  user_id: string;
  zodiac_sign: string;
  xp: number;
  last_xp_date: string | null;
  updated_at: string;
};

export type ConstellationDrawnRow = {
  user_id: string;
  constellation_id: string;
  drawn_at: string;
};
