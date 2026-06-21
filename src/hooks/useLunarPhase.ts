/**
 * useLunarPhase.
 *
 * Reads today's lunar phase for display, from the SAME global transit
 * snapshot cache the Daily Alignment and Transit Overlay already use
 * (one fetch path, not a new one) — it just maps that snapshot's cached
 * lunar_phase_fraction through the pure lunarPhaseFromFraction. A load
 * failure leaves the phase null; the Nexus simply omits the indicator
 * rather than blocking on it.
 */

import { useEffect, useState } from 'react';
import { getGlobalTransitSnapshot } from '../lib/worldGen/transitOverlay';
import { lunarPhaseFromFraction } from '../lib/gameLogic/lunarCycle';
import type { LunarPhaseInfo } from '../lib/gameLogic/lunarCycle';

export function useLunarPhase() {
  const [phase, setPhase] = useState<LunarPhaseInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGlobalTransitSnapshot()
      .then((snapshot) => {
        if (!cancelled) setPhase(lunarPhaseFromFraction(snapshot.lunar_phase_fraction));
      })
      .catch(() => { /* indicator is non-blocking */ });
    return () => { cancelled = true; };
  }, []);

  return phase;
}
