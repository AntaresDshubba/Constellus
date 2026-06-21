/**
 * useStarwalker.
 *
 * Loads the Starwalker Level / Ascension status and exposes the ascend
 * action. Non-blocking: a load failure leaves status null and the screen
 * shows an unavailable state. ascend returns whether it happened so the
 * screen can show feedback, and refreshes the status either way.
 */

import { useCallback, useEffect, useState } from 'react';
import { getStarwalker, ascend as ascendApi } from '../lib/starwalker';
import type { StarwalkerStatus } from '../lib/gameLogic/ascension';

export function useStarwalker() {
  const [status, setStatus] = useState<StarwalkerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [ascending, setAscending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getStarwalker());
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const ascend = useCallback(async (): Promise<boolean> => {
    setAscending(true);
    try {
      const result = await ascendApi();
      setStatus(result.status);
      return result.ascended;
    } catch {
      return false;
    } finally {
      setAscending(false);
    }
  }, []);

  return { status, loading, ascending, ascend };
}
