/**
 * Star Pass data access.
 *
 * grantStarPassXp is called (best-effort, non-blocking) from the daily
 * quest and Arc-step completion paths, so all engagement feeds the one
 * seasonal track. claimTier credits a tier's reward through the
 * append-only ledger and records the claim; the (user, season, tier)
 * primary key plus the absence of any update/delete policy make a
 * double-claim structurally impossible even under a race — the same
 * guarantee Constellation Drawing relies on.
 */

import { supabase } from './supabaseClient';
import { earnCurrency } from './ledger';
import { starPassStatus, tierReward, CURRENT_SEASON } from './gameLogic/starPass';
import type { StarPassStatus } from './gameLogic/starPass';

async function currentUserId(): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  return session.session?.user.id ?? null;
}

const SEASON_ID = CURRENT_SEASON.id;

export async function getStarPassStatus(): Promise<StarPassStatus> {
  const userId = await currentUserId();
  if (!userId) return starPassStatus(0, new Set());

  const [{ data: progress, error: progressError }, { data: claims, error: claimsError }] = await Promise.all([
    supabase.from('star_pass_progress').select('xp').eq('user_id', userId).eq('season_id', SEASON_ID).maybeSingle(),
    supabase.from('star_pass_claims').select('tier').eq('user_id', userId).eq('season_id', SEASON_ID),
  ]);
  if (progressError) throw progressError;
  if (claimsError) throw claimsError;

  const claimedTiers = new Set((claims ?? []).map((c) => c.tier));
  return starPassStatus(progress?.xp ?? 0, claimedTiers);
}

/** Add Star Pass XP from any engagement source. Upsert-increment by (user, season). */
export async function grantStarPassXp(amount: number): Promise<void> {
  const userId = await currentUserId();
  if (!userId || amount <= 0) return;

  const { data: existing, error: selectError } = await supabase
    .from('star_pass_progress')
    .select('xp')
    .eq('user_id', userId)
    .eq('season_id', SEASON_ID)
    .maybeSingle();
  if (selectError) throw selectError;

  const nextXp = (existing?.xp ?? 0) + Math.floor(amount);

  if (!existing) {
    const { error: insertError } = await supabase
      .from('star_pass_progress')
      .insert({ user_id: userId, season_id: SEASON_ID, xp: nextXp });
    if (insertError && insertError.code !== '23505') throw insertError;
    if (!insertError) return;
  }

  // Re-read then increment relative to current, so a concurrent grant
  // isn't clobbered with a stale base.
  const { data: current, error: rereadError } = await supabase
    .from('star_pass_progress')
    .select('xp')
    .eq('user_id', userId)
    .eq('season_id', SEASON_ID)
    .single();
  if (rereadError) throw rereadError;

  const { error: updateError } = await supabase
    .from('star_pass_progress')
    .update({ xp: current.xp + Math.floor(amount) })
    .eq('user_id', userId)
    .eq('season_id', SEASON_ID);
  if (updateError) throw updateError;
}

export interface ClaimResult {
  claimed: boolean;
  reason?: 'locked' | 'already_claimed' | 'unknown_tier' | 'no_session';
  rewardStardust?: number;
  status: StarPassStatus;
}

/** Claim a tier's reward if it is unlocked and not already claimed. Idempotent. */
export async function claimTier(tier: number): Promise<ClaimResult> {
  const userId = await currentUserId();
  if (!userId) return { claimed: false, reason: 'no_session', status: starPassStatus(0, new Set()) };

  const reward = tierReward(tier);
  if (!reward) return { claimed: false, reason: 'unknown_tier', status: await getStarPassStatus() };

  const status = await getStarPassStatus();
  const view = status.tiers.find((t) => t.tier === tier);
  if (!view?.unlocked) return { claimed: false, reason: 'locked', status };
  if (view.claimed) return { claimed: false, reason: 'already_claimed', status };

  // Record the claim first; the PK enforces claim-at-most-once. If a
  // concurrent claim already inserted, stop before crediting.
  const { error: insertError } = await supabase
    .from('star_pass_claims')
    .insert({ user_id: userId, season_id: SEASON_ID, tier });
  if (insertError) {
    if (insertError.code === '23505') return { claimed: false, reason: 'already_claimed', status: await getStarPassStatus() };
    throw insertError;
  }

  await earnCurrency({ amount: reward.rewardStardust, reason: `star_pass:${SEASON_ID}:tier_${tier}` });
  return { claimed: true, rewardStardust: reward.rewardStardust, status: await getStarPassStatus() };
}
