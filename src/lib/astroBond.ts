/**
 * Astro Bond data access.
 *
 * Bridges the pure Bond math (src/lib/gameLogic/astroBond.ts) to the
 * astro_bond table. recordBondEngagement is the one write path — called
 * from completeDailyAlignmentQuest (src/lib/dailyAlignment.ts) alongside
 * the currency and Momentum grants, since completing the daily quest is
 * the engagement that deepens the bond. Points are clamped to the launch
 * cap on write, so the stored value can never exceed what Phase 3 allows.
 */

import { supabase } from './supabaseClient';
import { bondProgress, clampBondPoints, BOND_POINTS_PER_QUEST } from './gameLogic/astroBond';
import type { BondProgress } from './gameLogic/astroBond';

async function currentUserId(): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  return session.session?.user.id ?? null;
}

export async function getMyBond(): Promise<BondProgress> {
  const userId = await currentUserId();
  if (!userId) return bondProgress(0);

  const { data, error } = await supabase
    .from('astro_bond')
    .select('bond_points')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return bondProgress(data?.bond_points ?? 0);
}

/**
 * Add this quest's bond points, clamped to the launch cap. Upsert by
 * primary key (user_id): a first engagement inserts the row, later ones
 * read-modify-write. Returns the resulting progress so the caller can
 * surface it without a second read.
 */
export async function recordBondEngagement(): Promise<BondProgress> {
  const userId = await currentUserId();
  if (!userId) return bondProgress(0);

  const { data: existing, error: selectError } = await supabase
    .from('astro_bond')
    .select('bond_points')
    .eq('user_id', userId)
    .maybeSingle();
  if (selectError) throw selectError;

  const nextPoints = clampBondPoints((existing?.bond_points ?? 0) + BOND_POINTS_PER_QUEST);

  if (!existing) {
    const { error: insertError } = await supabase
      .from('astro_bond')
      .insert({ user_id: userId, bond_points: nextPoints });
    // 23505: a concurrent first-engagement insert landed first — fall
    // through to the update path against the now-existing row.
    if (insertError && insertError.code !== '23505') throw insertError;
    if (!insertError) return bondProgress(nextPoints);
  }

  const { data: updated, error: updateError } = await supabase
    .from('astro_bond')
    .update({ bond_points: nextPoints })
    .eq('user_id', userId)
    .select('bond_points')
    .single();
  if (updateError) throw updateError;
  return bondProgress(updated.bond_points);
}
