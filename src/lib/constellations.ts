/**
 * Constellation Drawing data access.
 *
 * "Explored" means the player has ENTERED a world — i.e. a
 * base_layer_worlds row exists for it (created on first visit). That
 * signal predates this feature and needs no extra bookkeeping, so the
 * explored-check works regardless of whether the newer progression
 * migrations have been applied.
 *
 * drawConstellation is the one write path: it re-validates completeness
 * server-side-of-the-client (against the explored set), grants the
 * one-time stardust reward through the append-only currency_ledger, and
 * records the draw. It is idempotent — a constellation already drawn is
 * returned without re-crediting, and the DB primary key plus the absence
 * of any UPDATE/DELETE policy make a double-credit structurally
 * impossible even under a race.
 */

import { supabase } from './supabaseClient';
import { earnCurrency } from './ledger';
import { constellationById, constellationStatus } from './gameLogic/constellations';
import type { ZodiacSign } from '../types/astrology';

async function currentUserId(): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  return session.session?.user.id ?? null;
}

/** Signs the player has explored (entered at least once). */
export async function getExploredSigns(): Promise<Set<ZodiacSign>> {
  const userId = await currentUserId();
  if (!userId) return new Set();

  const { data, error } = await supabase
    .from('base_layer_worlds')
    .select('zodiac_sign')
    .eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.zodiac_sign as ZodiacSign));
}

/** Ids of constellations the player has already drawn. */
export async function getDrawnConstellationIds(): Promise<Set<string>> {
  const userId = await currentUserId();
  if (!userId) return new Set();

  const { data, error } = await supabase
    .from('constellations_drawn')
    .select('constellation_id')
    .eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.constellation_id));
}

export interface DrawResult {
  drawn: boolean;
  /** Set when drawn === false, explaining why (already drawn, or incomplete). */
  reason?: 'already_drawn' | 'incomplete' | 'unknown_constellation' | 'no_session';
  rewardGranted?: number;
}

/**
 * Draw a constellation: validate it exists and is complete, credit its
 * one-time reward, and record it. Idempotent and double-credit-safe (see
 * file header).
 */
export async function drawConstellation(constellationId: string): Promise<DrawResult> {
  const constellation = constellationById(constellationId);
  if (!constellation) return { drawn: false, reason: 'unknown_constellation' };

  const userId = await currentUserId();
  if (!userId) return { drawn: false, reason: 'no_session' };

  const [explored, drawnIds] = await Promise.all([getExploredSigns(), getDrawnConstellationIds()]);
  if (drawnIds.has(constellationId)) return { drawn: false, reason: 'already_drawn' };

  const status = constellationStatus(constellation, explored);
  if (!status.isComplete) return { drawn: false, reason: 'incomplete' };

  // Record the draw first. The primary key (user_id, constellation_id)
  // makes this the single point that enforces "draw at most once" — if a
  // concurrent call already inserted, this fails with 23505 and we stop
  // before crediting, so the reward is never granted twice.
  const { error: insertError } = await supabase
    .from('constellations_drawn')
    .insert({ user_id: userId, constellation_id: constellationId });
  if (insertError) {
    if (insertError.code === '23505') return { drawn: false, reason: 'already_drawn' };
    throw insertError;
  }

  await earnCurrency({ amount: constellation.reward, reason: `constellation_drawn:${constellationId}` });
  return { drawn: true, rewardGranted: constellation.reward };
}
