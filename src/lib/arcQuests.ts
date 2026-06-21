/**
 * Arc Quest data access.
 *
 * completeArcStep advances a world's Arc by exactly one step and grants
 * that step's rewards. The advance is a GUARDED update (steps_completed
 * must still equal the value this call read) so two concurrent completes
 * can't both advance the same step — only the call whose guard matches
 * "owns" the step and grants its reward; the other no-ops. The reward
 * grants themselves are best-effort (each caught) so a not-yet-applied
 * progression migration can't leave the Arc advanced but erroring.
 */

import { supabase } from './supabaseClient';
import { earnCurrency } from './ledger';
import { addMasteryXp } from './zodiacMastery';
import { grantBondPoints } from './astroBond';
import { grantStarPassXp } from './starPass';
import { XP_PER_ARC_STEP } from './gameLogic/starPass';
import { ARC_QUESTS, arcStatus, arcStepReward } from './gameLogic/arcQuests';
import type { ArcStatus, ArcStepReward } from './gameLogic/arcQuests';
import type { ZodiacSign } from '../types/astrology';

async function currentUserId(): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  return session.session?.user.id ?? null;
}

/** Steps completed in every world the player has any Arc progress in, keyed by sign. */
export async function getAllArcProgress(): Promise<Partial<Record<ZodiacSign, number>>> {
  const userId = await currentUserId();
  if (!userId) return {};

  const { data, error } = await supabase
    .from('arc_progress')
    .select('zodiac_sign, steps_completed')
    .eq('user_id', userId);
  if (error) throw error;

  const bySign: Partial<Record<ZodiacSign, number>> = {};
  for (const row of data ?? []) bySign[row.zodiac_sign as ZodiacSign] = row.steps_completed;
  return bySign;
}

export async function getArcStatus(zodiacSign: ZodiacSign): Promise<ArcStatus> {
  const userId = await currentUserId();
  if (!userId) return arcStatus(zodiacSign, 0);

  const { data, error } = await supabase
    .from('arc_progress')
    .select('steps_completed')
    .eq('user_id', userId)
    .eq('zodiac_sign', zodiacSign)
    .maybeSingle();
  if (error) throw error;
  return arcStatus(zodiacSign, data?.steps_completed ?? 0);
}

export interface ArcStepResult {
  status: ArcStatus;
  advanced: boolean;
  reward?: ArcStepReward;
}

/**
 * Complete the current step of a world's Arc: advance progress by one
 * (guarded), then grant the completed step's rewards. Idempotent against
 * races and against an already-complete Arc.
 */
export async function completeArcStep(zodiacSign: ZodiacSign): Promise<ArcStepResult> {
  const userId = await currentUserId();
  if (!userId) return { status: arcStatus(zodiacSign, 0), advanced: false };

  const total = ARC_QUESTS[zodiacSign].steps.length;

  const { data: existing, error: selectError } = await supabase
    .from('arc_progress')
    .select('steps_completed')
    .eq('user_id', userId)
    .eq('zodiac_sign', zodiacSign)
    .maybeSingle();
  if (selectError) throw selectError;

  const current = existing?.steps_completed ?? 0;
  if (current >= total) return { status: arcStatus(zodiacSign, current), advanced: false };

  // Ensure the row exists so the guarded update below has something to
  // match. A concurrent insert (23505) is fine — we fall through to the
  // guarded update either way.
  if (!existing) {
    const { error: insertError } = await supabase
      .from('arc_progress')
      .insert({ user_id: userId, zodiac_sign: zodiacSign, steps_completed: 0 });
    if (insertError && insertError.code !== '23505') throw insertError;
  }

  // Guarded advance: only succeeds if steps_completed is still `current`.
  const { data: updated, error: updateError } = await supabase
    .from('arc_progress')
    .update({ steps_completed: current + 1 })
    .eq('user_id', userId)
    .eq('zodiac_sign', zodiacSign)
    .eq('steps_completed', current)
    .select('steps_completed')
    .maybeSingle();
  if (updateError) throw updateError;

  if (!updated) {
    // Another call advanced this step first — re-read, grant nothing.
    const { data: latest } = await supabase
      .from('arc_progress')
      .select('steps_completed')
      .eq('user_id', userId)
      .eq('zodiac_sign', zodiacSign)
      .maybeSingle();
    return { status: arcStatus(zodiacSign, latest?.steps_completed ?? current), advanced: false };
  }

  // This call owns step index `current`: grant its rewards (best-effort).
  const reward = arcStepReward(current, total);
  await earnCurrency({ amount: reward.stardust, reason: `arc_step:${zodiacSign}:${current}` }).catch(() => {});
  await addMasteryXp(zodiacSign, reward.masteryXp).catch(() => {});
  await grantBondPoints(reward.bondPoints).catch(() => {});
  await grantStarPassXp(XP_PER_ARC_STEP).catch(() => {});

  return { status: arcStatus(zodiacSign, updated.steps_completed), advanced: true, reward };
}
