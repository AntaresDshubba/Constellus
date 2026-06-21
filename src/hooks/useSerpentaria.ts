/**
 * useSerpentaria.
 *
 * Loads the hidden thirteenth world's unlock state (derived from Arc
 * completion). Used by the Nexus to reveal its entry only once earned,
 * and by the Void screen to gate entry. Non-blocking: a load failure
 * leaves it locked rather than blocking.
 */

import { useEffect, useState } from 'react';
import { getSerpentariaState } from '../lib/serpentaria';
import type { SerpentariaState } from '../lib/serpentaria';

export function useSerpentaria() {
  const [state, setState] = useState<SerpentariaState | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSerpentariaState()
      .then((s) => { if (!cancelled) setState(s); })
      .catch(() => { if (!cancelled) setState(null); });
    return () => { cancelled = true; };
  }, []);

  return state;
}
