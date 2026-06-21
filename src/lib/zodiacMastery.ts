/**
 * Zodiac Mastery data access.
 *
 * Bridges the pure tier math (src/lib/gameLogic/zodiacMastery.ts) to
 * Supabase's zodiac_mastery table. The one write path,
 * grantDailyWorldVisitXp, is idempotent per (player, world, local day):
 * it credits XP only when the world has not already been credited today,
 * so it is safe to call unconditionally on every world entry (it is
 * called from src/screens/world/WorldScreen.tsx on a successful load,
 * alongside the world_entered analytics event).
 *
 * The earn is keyed on LOCAL date, matching the Daily Alignment / Momentum
 * loop's notion of "today" rather than UTC, so a player's "first visit
 * today" lines up with the rest of the daily loop they experience.
 */

import { supabase } from './supabaseClient';
import { masteryProgress, DAILY_WORLD_VISIT_XP } from './gameLogic/zodiacMastery';
import type { MasteryProgress } from './gameLogic/zodiacMastery';
import type { ZodiacSign } from '../types/astrology';

function todayLocalDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function currentUserId(): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  return session.session?.user.id ?? null;
}

/** Mastery progress for one world (tier 1 / 0 XP if never visited). */
export async function getMastery(zodiacSign: ZodiacSign): Promise<MasteryProgress> {
  const userId = await currentUserId();
  if (!userId) return masteryProgress(0);

  const { data, error } = await supabase
    .from('zodiac_mastery')
    .select('*')
    .eq('user_id', userId)
    .eq('zodiac_sign', zodiacSign)
    .maybeSingle();
  if (error) throw error;
  return masteryProgress(data?.xp ?? 0);
}

/** Mastery XP for every world the player has any mastery in, keyed by sign. */
export async function getAllMasteryXp(): Promise<Partial<Record<ZodiacSign, number>>> {
  const userId = await currentUserId();
  if (!userId) return {};

  const { data, error } = await supabase
    .from('zodiac_mastery')
    .select('zodiac_sign, xp')
    .eq('user_id', userId);
  if (error) throw error;

  const bySign: Partial<Record<ZodiacSign, number>> = {};
  for (const row of data ?? []) {
    bySign[row.zodiac_sign as ZodiacSign] = row.xp;
  }
  return bySign;
}

/**
 * Add mastery XP to a world directly, with NO daily gate — for reward
 * grants that aren't the daily visit (e.g. completing an Arc step). Does
 * not touch last_xp_date, so it never interferes with the once-per-day
 * visit accounting. Upserts by (user, sign) and returns the new progress.
 */
export async function addMasteryXp(zodiacSign: ZodiacSign, amount: number): Promise<MasteryProgress> {
  const userId = await currentUserId();
  if (!userId || amount <= 0) return masteryProgress(0);

  const { data: existing, error: selectError } = await supabase
    .from('zodiac_mastery')
    .select('xp')
    .eq('user_id', userId)
    .eq('zodiac_sign', zodiacSign)
    .maybeSingle();
  if (selectError) throw selectError;

  const nextXp = (existing?.xp ?? 0) + Math.floor(amount);

  if (!existing) {
    const { error: insertError } = await supabase
      .from('zodiac_mastery')
      .insert({ user_id: userId, zodiac_sign: zodiacSign, xp: nextXp });
    if (insertError && insertError.code !== '23505') throw insertError;
    if (!insertError) return masteryProgress(nextXp);
  }

  // Re-read and increment relative to the now-current value to avoid
  // clobbering a concurrent write with a stale base.
  const { data: current, error: rereadError } = await supabase
    .from('zodiac_mastery')
    .select('xp')
    .eq('user_id', userId)
    .eq('zodiac_sign', zodiacSign)
    .single();
  if (rereadError) throw rereadError;

  const { data: updated, error: updateError } = await supabase
    .from('zodiac_mastery')
    .update({ xp: current.xp + Math.floor(amount) })
    .eq('user_id', userId)
    .eq('zodiac_sign', zodiacSign)
    .select('xp')
    .single();
  if (updateError) throw updateError;
  return masteryProgress(updated.xp);
}

/**
 * Credit the once-per-day world-visit XP for a world, if it hasn't
 * already been credited today. Returns the resulting mastery progress
 * (whether or not anything was credited this call), so the caller can
 * surface the up-to-date tier without a second read.
 *
 * `bonusXp` is the player's passive Constellation Drawing bonus
 * (src/lib/gameLogic/constellations.ts), passed in by the caller rather
 * than read here — this keeps the dependency one-directional (the
 * constellation layer reads mastery's explored set, not the reverse) and
 * keeps this function a leaf with no cross-feature imports.
 */
export async function grantDailyWorldVisitXp(zodiacSign: ZodiacSign, bonusXp = 0): Promise<MasteryProgress> {
  const userId = await currentUserId();
  if (!userId) return masteryProgress(0);

  const today = todayLocalDateString();
  const dailyAward = DAILY_WORLD_VISIT_XP + Math.max(0, Math.floor(bonusXp));

  const { data: existing, error: selectError } = await supabase
    .from('zodiac_mastery')
    .select('*')
    .eq('user_id', userId)
    .eq('zodiac_sign', zodiacSign)
    .maybeSingle();
  if (selectError) throw selectError;

  // Already credited today: nothing to do, return current progress.
  if (existing && existing.last_xp_date === today) {
    return masteryProgress(existing.xp);
  }

  const nextXp = (existing?.xp ?? 0) + dailyAward;

  if (!existing) {
    const { error: insertError } = await supabase
      .from('zodiac_mastery')
      .insert({ user_id: userId, zodiac_sign: zodiacSign, xp: nextXp, last_xp_date: today });
    // 23505 = unique_violation: a concurrent first-visit insert landed
    // first. Fall through to the update path below to credit against the
    // row that now exists, rather than erroring.
    if (insertError && insertError.code !== '23505') throw insertError;
    if (!insertError) return masteryProgress(nextXp);
  }

  const { data: updated, error: updateError } = await supabase
    .from('zodiac_mastery')
    .update({ xp: nextXp, last_xp_date: today })
    .eq('user_id', userId)
    .eq('zodiac_sign', zodiacSign)
    .neq('last_xp_date', today) // guard the concurrent-double-credit case: if another call set today first, this matches no row
    .select()
    .maybeSingle();
  if (updateError) throw updateError;

  // updated is null only if the guard above filtered the row out (today
  // was set concurrently between our select and update) — re-read to
  // return an accurate value.
  if (updated) return masteryProgress(updated.xp);

  const { data: reread, error: rereadError } = await supabase
    .from('zodiac_mastery')
    .select('xp')
    .eq('user_id', userId)
    .eq('zodiac_sign', zodiacSign)
    .single();
  if (rereadError) throw rereadError;
  return masteryProgress(reread.xp);
}
