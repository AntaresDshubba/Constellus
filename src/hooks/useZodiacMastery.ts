/**
 * useZodiacMastery.
 *
 * Loads the player's mastery progress for one world and exposes a
 * setter the world screen calls after crediting the daily visit XP, so
 * the displayed tier reflects the just-earned XP without a second
 * round-trip. Read-mostly: the only thing that changes mastery in this
 * phase is the once-per-day world visit, granted in WorldScreen.
 */

import { useEffect, useState } from 'react';
import { getMastery } from '../lib/zodiacMastery';
import type { MasteryProgress } from '../lib/gameLogic/zodiacMastery';
import type { ZodiacSign } from '../types/astrology';

export function useZodiacMastery(zodiacSign: ZodiacSign) {
  const [progress, setProgress] = useState<MasteryProgress | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMastery(zodiacSign)
      .then((p) => {
        if (!cancelled) setProgress(p);
      })
      .catch(() => {
        // Mastery is a non-blocking cosmetic overlay on the world; a read
        // failure should never prevent the world itself from rendering.
        if (!cancelled) setProgress(null);
      });
    return () => {
      cancelled = true;
    };
  }, [zodiacSign]);

  return { progress, setProgress };
}
