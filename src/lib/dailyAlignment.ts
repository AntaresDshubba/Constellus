/**
 * Daily Alignment orchestration.
 *
 * Ties together everything Phase 2's Daily Minimum loop needs:
 * - the player's chart (src/lib/cosmicProfile.ts)
 * - today's global transit snapshot (src/lib/worldGen/transitOverlay.ts,
 *   the SAME cache used by the Transit Overlay system — there is only
 *   ONE global snapshot fetch path in this codebase, not a second one
 *   for Daily Alignment to maintain separately)
 * - the personal comparison (src/lib/gameLogic/personalTransits.ts)
 * - the content derivation (src/lib/gameLogic/dailyAlignment.ts)
 * - idempotent persistence (this file)
 * - quest completion, which grants currency AND records Momentum
 *   engagement together, since "completing today's Daily Alignment
 *   quest" is the one specific action that should advance Momentum in
 *   this phase.
 *
 * generateTodaysAlignment is idempotent per (player, local date) via
 * the unique constraint on daily_alignments — calling it when today's
 * row already exists just returns that row, making it safe to call
 * eagerly on every Nexus screen visit rather than needing a separate
 * "has today's Alignment been generated yet" check beforehand.
 */

import { supabase } from './supabaseClient';
import { getGlobalTransitSnapshot } from './worldGen/transitOverlay';
import { getMyCosmicProfile } from './cosmicProfile';
import { computePersonalTransitAspects } from './gameLogic/personalTransits';
import { deriveDailyAlignmentContent } from './gameLogic/dailyAlignment';
import { earnCurrency } from './ledger';
import { recordDailyEngagement } from './momentum';
import { trackEvent } from './analytics';
import type { DailyAlignmentRow } from '../types/dailyAlignment';

function todayLocalDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Generate (or return the existing) Daily Alignment for the player's
 * current local date. See file header for idempotency.
 */
export async function generateTodaysAlignment(): Promise<DailyAlignmentRow> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error('Cannot generate a Daily Alignment without an active session');

  const localDate = todayLocalDateString();

  const { data: existing, error: selectError } = await supabase
    .from('daily_alignments')
    .select('*')
    .eq('user_id', userId)
    .eq('local_date', localDate)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;

  const profile = await getMyCosmicProfile();
  if (!profile) {
    throw new Error('Cannot generate a Daily Alignment before a cosmic profile exists — complete onboarding first.');
  }

  const snapshot = await getGlobalTransitSnapshot();
  const aspects = computePersonalTransitAspects(profile.chart_json, snapshot);
  const content = deriveDailyAlignmentContent(aspects, `${userId}:${localDate}`);

  const { error: insertError } = await supabase.from('daily_alignments').insert({
    user_id: userId,
    local_date: localDate,
    cosmic_weather_summary: content.cosmicWeatherSummary,
    focus_planet: content.focusPlanet,
    opportunity_zone: content.opportunityZone,
    quest_objective: content.questObjective,
    quest_reward_amount: content.questRewardAmount,
    challenge_rating: content.challengeRating,
    lucky_element: content.luckyElement,
    astro_insight: content.astroInsight,
  });
  // 23505 = unique_violation: lost a race with a concurrent call to
  // this same function for the same (user, date) — safe to ignore and
  // re-read below, since both calls would have derived the identical
  // content anyway (deriveDailyAlignmentContent is pure).
  if (insertError && insertError.code !== '23505') throw insertError;

  const { data: row, error: rereadError } = await supabase
    .from('daily_alignments')
    .select('*')
    .eq('user_id', userId)
    .eq('local_date', localDate)
    .single();
  if (rereadError) throw rereadError;

  // Tracked here, after the insert-or-reread resolves, rather than
  // right after the insert call — this way the event only fires once
  // even under the 23505 race (both the winner and the loser of that
  // race reach this same line, but only the winner's insert actually
  // created a new row; tracking unconditionally here slightly
  // over-counts in that rare race, which is an acceptable tradeoff
  // versus the complexity of distinguishing "I created it" from "I lost
  // the race" for an analytics event that doesn't need to be exact to
  // the row).
  void trackEvent('daily_alignment_generated', { challengeRating: row.challenge_rating });
  return row;
}

export async function getTodaysAlignment(): Promise<DailyAlignmentRow | null> {
  const { data, error } = await supabase
    .from('daily_alignments')
    .select('*')
    .eq('local_date', todayLocalDateString())
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Complete today's Daily Alignment quest: grant its currency reward AND
 * record Momentum engagement, together, exactly once (idempotent — a
 * row whose quest_completed_at is already set is returned unchanged,
 * never double-rewarded).
 */
export async function completeDailyAlignmentQuest(alignmentId: string): Promise<DailyAlignmentRow> {
  const { data: alignment, error: fetchError } = await supabase
    .from('daily_alignments')
    .select('*')
    .eq('id', alignmentId)
    .single();
  if (fetchError) throw fetchError;
  if (alignment.quest_completed_at) return alignment; // already completed; idempotent no-op

  await earnCurrency({
    amount: alignment.quest_reward_amount,
    reason: 'daily_alignment_quest',
    refId: alignment.id,
  });
  await recordDailyEngagement();

  const { data: updated, error: updateError } = await supabase
    .from('daily_alignments')
    .update({ quest_completed_at: new Date().toISOString() })
    .eq('id', alignmentId)
    .select()
    .single();
  if (updateError) throw updateError;
  void trackEvent('daily_alignment_quest_completed', { challengeRating: updated.challenge_rating });
  return updated;
}
