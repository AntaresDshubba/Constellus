/**
 * useConvergence.
 *
 * Loads the Convergence storyline status (fragments recovered, revealed
 * beats) for the Convergence Journal. Derived from Arc completion, so it
 * reflects progress made anywhere in the game. Non-blocking: a load
 * failure leaves it null and the screen shows an unavailable state.
 */

import { useEffect, useState } from 'react';
import { getConvergenceStatus } from '../lib/convergence';
import type { ConvergenceStatus } from '../lib/gameLogic/convergence';

export function useConvergence() {
  const [status, setStatus] = useState<ConvergenceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getConvergenceStatus()
      .then((s) => { if (!cancelled) setStatus(s); })
      .catch(() => { if (!cancelled) setStatus(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { status, loading };
}
