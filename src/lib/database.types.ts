/**
 * Database schema types.
 *
 * Hand-written to mirror supabase/migrations exactly, rather than
 * generated via `supabase gen types` (which requires a live project to
 * introspect and isn't available in this offline build context). If the
 * Supabase CLI is available in a real deployment, regenerating this file
 * from the actual schema is the more maintainable long-term approach;
 * this hand-written version is kept in lockstep with the migrations
 * directory manually for now.
 *
 * Every table includes a `Relationships: []` field even where empty,
 * matching the shape `supabase gen types` itself produces — supabase-js's
 * generic client inference depends on this exact shape being present.
 *
 * TWO REAL BUGS WERE FOUND AND FIXED while wiring this file up, both
 * worth recording since neither produces an obviously-related error
 * message:
 *
 * 1. `Update: never` (an earlier draft's attempt to mark insert-only
 *    tables as non-updatable at the type level) breaks INSERT inference
 *    too, not just UPDATE — supabase-js's generics collapse the whole
 *    row to `never[]`. Every table here uses a real `Partial<Row>`
 *    shape for `Update` instead; the actual enforcement against
 *    updating insert-only tables (e.g. cosmic_profiles) is the RLS
 *    policy in the migration, not the TypeScript type.
 * 2. The Row/Insert/Update types referenced here (ProfileRow,
 *    CosmicProfileRow, etc., defined in ../types/) must be declared as
 *    `type X = {...}` in their source files, NOT `interface X {...}`.
 *    Verified via an isolated minimal repro against this project's
 *    installed @supabase/supabase-js version: a named `interface`
 *    reference causes the exact same `never[]` collapse as bug #1,
 *    even though it is structurally identical to a `type` alias in
 *    every other respect. See the header comment in ../types/world.ts
 *    for where this convention is recorded for anyone adding a new
 *    table's row type later.
 */

import type {
  ProfileRow, ConsentRecordRow, CurrentConsentRow, AgeGroup, ConsentTier,
} from '../types/identity';
import type { CosmicProfileRow } from '../types/cosmicProfile';
import type { BaseLayerWorldRow, TransitSnapshotRow, WorldSaveRow } from '../types/world';
import type { DailyAlignmentRow } from '../types/dailyAlignment';
import type { CurrencyLedgerRow, CurrencyBalanceRow, MomentumRow, ZodiacMasteryRow, ConstellationDrawnRow } from '../types/progression';
import type { AnalyticsEventRow } from '../types/analytics';

export interface Database {
  // Required by @supabase/supabase-js for its generic client/schema
  // resolution machinery (present in supabase CLI-generated type files
  // automatically since the version installed here). Harmless to
  // include even if a future version stops requiring it.
  __InternalSupabase: {
    PostgrestVersion: '12.2.3';
  };
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; age_group: AgeGroup };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      consent_records: {
        Row: ConsentRecordRow;
        Insert: { user_id: string; tier: ConsentTier; granted: boolean };
        Update: Partial<ConsentRecordRow>;
        Relationships: [];
      };
      cosmic_profiles: {
        Row: CosmicProfileRow;
        Insert: Omit<CosmicProfileRow, 'created_at'>;
        Update: Partial<CosmicProfileRow>;
        Relationships: [];
      };
      base_layer_worlds: {
        Row: BaseLayerWorldRow;
        Insert: Omit<BaseLayerWorldRow, 'id' | 'generated_at'>;
        Update: Partial<BaseLayerWorldRow>;
        Relationships: [];
      };
      transit_snapshots: {
        Row: TransitSnapshotRow;
        Insert: Omit<TransitSnapshotRow, 'computed_at'>;
        Update: Partial<TransitSnapshotRow>;
        Relationships: [];
      };
      world_saves: {
        Row: WorldSaveRow;
        Insert: Partial<WorldSaveRow> & { user_id: string; zodiac_sign: string };
        Update: Partial<WorldSaveRow>;
        Relationships: [];
      };
      daily_alignments: {
        Row: DailyAlignmentRow;
        Insert: Omit<DailyAlignmentRow, 'id' | 'generated_at' | 'quest_completed_at'> & { quest_completed_at?: string | null };
        Update: Partial<DailyAlignmentRow>;
        Relationships: [];
      };
      currency_ledger: {
        Row: CurrencyLedgerRow;
        Insert: Omit<CurrencyLedgerRow, 'id' | 'created_at'>;
        Update: Partial<CurrencyLedgerRow>;
        Relationships: [];
      };
      momentum: {
        Row: MomentumRow;
        Insert: Partial<MomentumRow> & { user_id: string };
        Update: Partial<MomentumRow>;
        Relationships: [];
      };
      analytics_events: {
        Row: AnalyticsEventRow;
        Insert: Omit<AnalyticsEventRow, 'id' | 'created_at'>;
        Update: Partial<AnalyticsEventRow>;
        Relationships: [];
      };
      zodiac_mastery: {
        Row: ZodiacMasteryRow;
        Insert: Partial<ZodiacMasteryRow> & { user_id: string; zodiac_sign: string };
        Update: Partial<ZodiacMasteryRow>;
        Relationships: [];
      };
      constellations_drawn: {
        Row: ConstellationDrawnRow;
        Insert: Omit<ConstellationDrawnRow, 'drawn_at'> & { drawn_at?: string };
        Update: Partial<ConstellationDrawnRow>;
        Relationships: [];
      };
    };
    Views: {
      current_consent: {
        Row: CurrentConsentRow;
        Relationships: [];
      };
      currency_balances: {
        Row: CurrencyBalanceRow;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
