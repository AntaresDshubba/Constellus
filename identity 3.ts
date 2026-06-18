/**
 * Identity and consent types.
 *
 * Mirrors supabase/migrations/001_profiles_and_consent.sql.
 *
 * See src/types/world.ts's header note: Row types consumed by Database
 * (src/lib/database.types.ts) must be `type` aliases, not `interface`
 * declarations, or supabase-js's generic inference for
 * .insert()/.update() silently collapses to `never`.
 */

export type AgeGroup = 'adult' | 'minor';
export type ConsentTier = 'essential' | 'precise_location' | 'life_concerns' | 'goals';

export type ProfileRow = {
  id: string;
  age_group: AgeGroup;
  onboarding_complete: boolean;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type ConsentRecordRow = {
  id: string;
  user_id: string;
  tier: ConsentTier;
  granted: boolean;
  recorded_at: string;
};

export type CurrentConsentRow = {
  user_id: string;
  tier: ConsentTier;
  granted: boolean;
  recorded_at: string;
};
