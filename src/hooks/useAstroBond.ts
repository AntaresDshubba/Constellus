/**
 * useAstroBond.
 *
 * Loads the player's Astro Bond progress for the Nexus (the phase name,
 * the within-phase bar, and the phase number that warms Astro's dialogue
 * tone). refresh() is called after completing the daily quest, since that
 * is what advances the bond. A load failure leaves it null and the Nexus
 * simply omits the bond panel rather than blocking.
 */

import { useCallback, useEffect, useState } from 'react';
import { getMyBond } from '../lib/astroBond';
import type { BondProgress } from '../lib/gameLogic/astroBond';

export function useAstroBond() {
  const [bond, setBond] = useState<BondProgress | null>(null);

  const refresh = useCallback(async () => {
    try {
      setBond(await getMyBond());
    } catch {
      setBond(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { bond, refresh };
}
