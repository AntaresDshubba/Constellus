/**
 * Cosmic Profile types.
 *
 * Mirrors supabase/migrations/002_cosmic_profiles.sql's column shape
 * exactly (snake_case as stored, since this app reads/writes Supabase
 * rows directly with no separate server-side mapping layer — see
 * src/lib/cosmicProfile.ts for the one conversion point between this
 * row shape and ephemeris's NatalChart shape stored in chart_json).
 */

import type { NatalChart, ZodiacSign, HouseResolutionState } from './astrology';

export type LocationPrecision = 'precise' | 'timezone';

// See src/types/world.ts's header note: Row types consumed by
// Database (src/lib/database.types.ts) must be `type` aliases, not
// `interface` declarations, or supabase-js's generic inference for
// .insert()/.update() silently collapses to `never`.
export type CosmicProfileRow = {
  user_id: string;
  birth_date: string;
  birth_time: string | null;
  birth_timezone: string;
  birth_lat: number | null;
  birth_lng: number | null;
  chart_json: NatalChart;
  sun_sign: ZodiacSign;
  moon_sign: ZodiacSign;
  rising_sign: ZodiacSign | null;
  house_resolution_state: HouseResolutionState;
  personality_tags: string[];
  concern_tags: string[];
  goal_tags: string[];
  created_at: string;
};

export interface CreateCosmicProfileInput {
  birthDate: string;
  birthTime?: string;
  birthTimezone: string;
  birthLat?: number;
  birthLng?: number;
  locationPrecision: LocationPrecision;
  personalityTags?: string[];
  concernTags?: string[];
  goalTags?: string[];
}
