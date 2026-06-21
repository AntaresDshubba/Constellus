/**
 * Serpentaria data access.
 *
 * Serpentaria has no table: it is unlocked by completing all twelve Arcs
 * (recovering every Nexus Fragment), so its unlock state is DERIVED from
 * arc_progress — the same no-storage approach the Convergence uses. The
 * scene itself is generated purely (gameLogic/serpentaria.ts), seeded by
 * the player's id so it is stable per player without being persisted.
 */

import { supabase } from './supabaseClient';
import { getAllArcProgress } from './arcQuests';
import { ARC_QUESTS } from './gameLogic/arcQuests';
import { ZODIAC_SIGNS } from '../types/astrology';
import type { ZodiacSign } from '../types/astrology';

export interface SerpentariaState {
  unlocked: boolean;
  arcsComplete: number;
  arcsRequired: number;
  /** Seed for generating the scene (stable per player). Null when no session. */
  seed: string | null;
}

export async function getSerpentariaState(): Promise<SerpentariaState> {
  const arcsRequired = ZODIAC_SIGNS.length; // 12

  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id ?? null;
  if (!userId) return { unlocked: false, arcsComplete: 0, arcsRequired, seed: null };

  const progress = await getAllArcProgress();
  const arcsComplete = (Object.keys(progress) as ZodiacSign[]).filter(
    (sign) => (progress[sign] ?? 0) >= ARC_QUESTS[sign].steps.length,
  ).length;

  return {
    unlocked: arcsComplete >= arcsRequired,
    arcsComplete,
    arcsRequired,
    seed: `${userId}:serpentaria`,
  };
}
