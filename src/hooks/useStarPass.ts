/**
 * useStarPass.
 *
 * Loads the Star Pass status (xp, tier, claimable rewards) and exposes a
 * claim action. claim returns the granted stardust (or null) so the
 * screen can show feedback, and refreshes the status. Non-blocking: a
 * load failure leaves status null and the screen shows an unavailable
 * state rather than crashing.
 */

import { useCallback, useEffect, useState } from 'react';
import { getStarPassStatus, claimTier } from '../lib/starPass';
import type { StarPassStatus } from '../lib/gameLogic/starPass';

export function useStarPass() {
  const [status, setStatus] = useState<StarPassStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingTier, setClaimingTier] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getStarPassStatus());
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const claim = useCallback(async (tier: number): Promise<number | null> => {
    setClaimingTier(tier);
    try {
      const result = await claimTier(tier);
      setStatus(result.status);
      return result.claimed ? result.rewardStardust ?? null : null;
    } catch {
      return null;
    } finally {
      setClaimingTier(null);
    }
  }, []);

  return { status, loading, claimingTier, claim };
}
