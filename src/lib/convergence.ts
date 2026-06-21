/**
 * Convergence storyline data access.
 *
 * The Convergence has no table of its own: a Nexus Fragment is recovered
 * by completing a world's Arc, so the storyline's state is derived
 * entirely from arc_progress (see src/lib/gameLogic/convergence.ts for
 * why). This composes the Arc-completion read with the pure narrative
 * logic — a world counts as a recovered fragment when its Arc is fully
 * complete.
 */

import { getAllArcProgress } from './arcQuests';
import { ARC_QUESTS } from './gameLogic/arcQuests';
import { convergenceStatus } from './gameLogic/convergence';
import type { ConvergenceStatus } from './gameLogic/convergence';
import type { ZodiacSign } from '../types/astrology';

export async function getConvergenceStatus(): Promise<ConvergenceStatus> {
  const progress = await getAllArcProgress();
  const recovered = (Object.keys(progress) as ZodiacSign[]).filter(
    (sign) => (progress[sign] ?? 0) >= ARC_QUESTS[sign].steps.length,
  );
  return convergenceStatus(recovered);
}
