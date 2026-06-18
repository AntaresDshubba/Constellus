/**
 * Daily Alignment types.
 *
 * Mirrors supabase/migrations/005_daily_alignment.sql.
 *
 * See src/types/world.ts's header note: Row types consumed by Database
 * (src/lib/database.types.ts) must be `type` aliases, not `interface`
 * declarations, or supabase-js's generic inference for
 * .insert()/.update() silently collapses to `never`.
 */

import type { Planet, ZodiacSign, Element } from './astrology';

export type ChallengeRating = 'very_harmonious' | 'harmonious' | 'balanced' | 'tense' | 'very_tense';

export type DailyAlignmentRow = {
  id: string;
  user_id: string;
  local_date: string;
  cosmic_weather_summary: string;
  focus_planet: Planet;
  opportunity_zone: ZodiacSign;
  quest_objective: string;
  quest_reward_amount: number;
  challenge_rating: ChallengeRating;
  lucky_element: Element;
  astro_insight: string;
  generated_at: string;
  quest_completed_at: string | null;
};
