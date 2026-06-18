/**
 * Momentum data access.
 *
 * Bridges the pure logic in src/lib/gameLogic/momentum.ts to Supabase.
 * getMyMomentum ALWAYS recalculates against today's date before
 * returning — see that module's header for why this is correct without
 * any scheduled background job. recordDailyEngagement is the one write
 * path, called once per day from completeDailyAlignmentQuest
 * (src/lib/dailyAlignment.ts), never called directly from a screen.
 */

import { supabase } from './supabaseClient';
import { recalculateMomentum, recordEngagement, momentumStateFromRow } from './gameLogic/momentum';
import type { MomentumState } from './gameLogic/momentum';

function todayLocalDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function getOrCreateMomentumRow(userId: string) {
  const { data: existing, error: selectError } = await supabase
    .from('momentum')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;

  const { data: inserted, error: insertError } = await supabase
    .from('momentum')
    .insert({ user_id: userId })
    .select()
    .single();
  if (insertError) throw insertError;
  return inserted;
}

export async function getMyMomentum(): Promise<MomentumState> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return { currentValue: 0, protectedDaysLeft: 0, lastEngagedDate: null, consecutiveEngagedDays: 0 };

  const row = await getOrCreateMomentumRow(userId);
  return recalculateMomentum(momentumStateFromRow(row), todayLocalDateString());
}

/**
 * Record today's engagement, persisting the result. Always
 * recalculates against today first (in case this is the first write of
 * the day after a gap) before applying the engagement gain, so the gain
 * is never applied on top of stale, un-decayed state.
 */
export async function recordDailyEngagement(): Promise<MomentumState> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error('Cannot record engagement without an active session');

  const row = await getOrCreateMomentumRow(userId);
  const today = todayLocalDateString();
  const caughtUp = recalculateMomentum(momentumStateFromRow(row), today);
  const updated = recordEngagement(caughtUp, today);

  const { error } = await supabase
    .from('momentum')
    .update({
      current_value: updated.currentValue,
      protected_days_left: updated.protectedDaysLeft,
      last_engaged_date: updated.lastEngagedDate,
      consecutive_engaged_days: updated.consecutiveEngagedDays,
    })
    .eq('user_id', userId);
  if (error) throw error;

  return updated;
}
