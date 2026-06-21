/**
 * Analytics event types.
 *
 * Mirrors supabase/migrations/007_analytics_events.sql. Scoped
 * deliberately to acquisition + engagement only — see that migration's
 * header comment for why.
 *
 * session_ended, webgl_context_lost, and webgl_context_restored are a
 * narrow, deliberate exception added in Phase 3. They are technically
 * part of a Health/stability KPI row, not acquisition or engagement —
 * but Architecture Audit Phase 3's exit criteria explicitly require
 * "Daily Minimum session length against the 3-5 minute target" and "at
 * least one logged context-loss-and-recovery cycle." Neither was
 * measurable without these three events, so they're added here as the
 * minimum needed to make those two specific, named criteria
 * observable from real data — not as a general Health-row buildout.
 */

export const ANALYTICS_EVENT_NAMES = [
  'onboarding_started',
  'onboarding_completed',
  'birth_moment_revealed',
  'session_started',
  'session_ended',
  'daily_alignment_generated',
  'daily_alignment_quest_completed',
  'world_entered',
  'webgl_context_lost',
  'webgl_context_restored',
] as const;
export type AnalyticsEventName = typeof ANALYTICS_EVENT_NAMES[number];

export type AnalyticsEventRow = {
  id: string;
  user_id: string | null;
  event_name: AnalyticsEventName;
  properties: Record<string, unknown>;
  created_at: string;
};
