/**
 * useMomentumAndWallet.
 *
 * Combines the two small read-mostly pieces of player progression state
 * the Nexus screen displays: Momentum (src/lib/momentum.ts) and the
 * currency balance (src/lib/ledger.ts). refresh() is called after
 * completing the Daily Alignment quest, since that's the one action in
 * this phase that changes both.
 */

import { useCallback, useEffect, useState } from 'react';
import { getMyMomentum } from '../lib/momentum';
import { getMyBalance } from '../lib/ledger';
import type { MomentumState } from '../lib/gameLogic/momentum';

export function useMomentumAndWallet() {
  const [momentum, setMomentum] = useState<MomentumState | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [momentumState, currentBalance] = await Promise.all([getMyMomentum(), getMyBalance()]);
    setMomentum(momentumState);
    setBalance(currentBalance);
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return { momentum, balance, loading, refresh };
}
