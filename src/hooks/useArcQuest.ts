/**
 * useArcQuest.
 *
 * Loads a world's Arc progress and exposes a completeStep action for the
 * World screen's quest panel. completeStep returns the just-granted
 * reward (if any) so the screen can show "+N stardust" feedback, and
 * updates the local status so the panel advances without a refetch. All
 * non-blocking: a load/write failure leaves the panel hidden rather than
 * disrupting the world.
 */

import { useCallback, useEffect, useState } from 'react';
import { getArcStatus, completeArcStep } from '../lib/arcQuests';
import type { ArcStatus, ArcStepReward } from '../lib/gameLogic/arcQuests';
import type { ZodiacSign } from '../types/astrology';

export function useArcQuest(zodiacSign: ZodiacSign) {
  const [status, setStatus] = useState<ArcStatus | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getArcStatus(zodiacSign)
      .then((s) => { if (!cancelled) setStatus(s); })
      .catch(() => { if (!cancelled) setStatus(null); });
    return () => { cancelled = true; };
  }, [zodiacSign]);

  const completeStep = useCallback(async (): Promise<ArcStepReward | null> => {
    setCompleting(true);
    try {
      const result = await completeArcStep(zodiacSign);
      setStatus(result.status);
      return result.advanced ? result.reward ?? null : null;
    } catch {
      return null;
    } finally {
      setCompleting(false);
    }
  }, [zodiacSign]);

  return { status, completing, completeStep };
}
