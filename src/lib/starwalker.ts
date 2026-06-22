/**
 * Starwalker / Astral Ascension data access.
 *
 * grantStarwalkerXp is called (best-effort, non-blocking) from the daily
 * quest and Arc-step completion paths, applying the player's ascension
 * bonus to the gain. ascend resets level_xp to 0 and bumps ascension_tier
 * — the ONLY write that resets anything, and it touches no other table,
 * so "reset Level, keep all other progress" holds structurally.
 *
 * level_xp and ascension_tier are the only stored values; everything
 * shown (level, progress, modifier) is derived in gameLogic/ascension.ts.
 */

import { supabase } from './supabaseClient';
import { starwalkerStatus, ascensionXpMultiplier, MAX_LEVEL, levelFromXp } from './gameLogic/ascension';
import type { StarwalkerStatus } from './gameLogic/ascension';

async function currentUserId(): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  return session.session?.user.id ?? null;
}

async function readRow(userId: string): Promise<{ level_xp: number; ascension_tier: number } | null> {
  const { data, error } = await supabase
    .from('starwalker')
    .select('level_xp, ascension_tier')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getStarwalker(): Promise<StarwalkerStatus> {
  const userId = await currentUserId();
  if (!userId) return starwalkerStatus(0, 0);
  const row = await readRow(userId);
  return starwalkerStatus(row?.level_xp ?? 0, row?.ascension_tier ?? 0);
}

/** Add Starwalker XP, scaled by the player's ascension bonus. Upsert by user. */
export async function grantStarwalkerXp(baseAmount: number): Promise<StarwalkerStatus> {
  const userId = await currentUserId();
  if (!userId || baseAmount <= 0) return starwalkerStatus(0, 0);

  const existing = await readRow(userId);
  const tier = existing?.ascension_tier ?? 0;
  const award = Math.round(baseAmount * ascensionXpMultiplier(tier));
  const nextXp = (existing?.level_xp ?? 0) + award;

  if (!existing) {
    const { error: insertError } = await supabase
      .from('starwalker')
      .insert({ user_id: userId, level_xp: nextXp, ascension_tier: 0 });
    if (insertError && insertError.code !== '23505') throw insertError;
    if (!insertError) return starwalkerStatus(nextXp, 0);
  }

  // Re-read then increment relative to current, so a concurrent grant
  // isn't clobbered with a stale base.
  const current = await readRow(userId);
  const updatedXp = (current?.level_xp ?? 0) + award;
  const { error: updateError } = await supabase
    .from('starwalker')
    .update({ level_xp: updatedXp })
    .eq('user_id', userId);
  if (updateError) throw updateError;
  return starwalkerStatus(updatedXp, current?.ascension_tier ?? tier);
}

export interface AscendResult {
  ascended: boolean;
  reason?: 'not_max_level' | 'no_session';
  status: StarwalkerStatus;
}

/**
 * Ascend: only when at the level cap. Resets level_xp to 0 and raises
 * ascension_tier by one. Guarded on the read level_xp so a concurrent
 * ascend can't double-bump the tier.
 */
export async function ascend(): Promise<AscendResult> {
  const userId = await currentUserId();
  if (!userId) return { ascended: false, reason: 'no_session', status: starwalkerStatus(0, 0) };

  const row = await readRow(userId);
  const levelXp = row?.level_xp ?? 0;
  const tier = row?.ascension_tier ?? 0;
  if (levelFromXp(levelXp) < MAX_LEVEL) {
    return { ascended: false, reason: 'not_max_level', status: starwalkerStatus(levelXp, tier) };
  }

  // Guarded reset: only succeeds if level_xp is still what we read, so two
  // concurrent ascends can't both bump the tier.
  const { data: updated, error } = await supabase
    .from('starwalker')
    .update({ level_xp: 0, ascension_tier: tier + 1 })
    .eq('user_id', userId)
    .eq('level_xp', levelXp)
    .select('level_xp, ascension_tier')
    .maybeSingle();
  if (error) throw error;

  if (!updated) {
    const latest = await readRow(userId);
    return { ascended: false, reason: 'not_max_level', status: starwalkerStatus(latest?.level_xp ?? 0, latest?.ascension_tier ?? tier) };
  }
  return { ascended: true, status: starwalkerStatus(updated.level_xp, updated.ascension_tier) };
}
