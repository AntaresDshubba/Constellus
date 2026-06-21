/**
 * useWorldSave.
 *
 * The Save System's UI-layer half (the data-access half is
 * src/lib/worldSave.ts). Saves on a fixed interval AND on page
 * hide/unmount, so closing the app mid-session doesn't lose more than a
 * few seconds of position.
 *
 * Reads the live position from worldStore via getState() inside the
 * interval/handler rather than subscribing to it as a React dependency
 * — position changes every frame during movement, and re-running this
 * effect on every frame would tear down and recreate the interval
 * constantly. getState() reads the CURRENT value at save-time without
 * needing the effect to depend on it.
 */

import { useEffect, useRef } from 'react';
import { useWorldStore } from '../state/worldStore';
import { saveWorldState } from '../lib/worldSave';
import type { ZodiacSign } from '../types/astrology';

const AUTOSAVE_INTERVAL_MS = 15_000;

export function useWorldSave(zodiacSign: ZodiacSign): void {
  const progressRef = useRef<Record<string, unknown>>({});

  useEffect(() => {
    function save() {
      const position = useWorldStore.getState().playerPosition;
      void saveWorldState({ zodiacSign, position, progress: progressRef.current }).catch(() => {
        // Best-effort: a missed autosave tick is not worth surfacing to
        // the player, since the next tick (or the next session) will
        // simply save the then-current position instead.
      });
    }

    const interval = setInterval(save, AUTOSAVE_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') save();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', save);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', save);
      save(); // also save once on unmount (e.g. navigating away within the app)
    };
  }, [zodiacSign]);
}
