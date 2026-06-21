/**
 * useWorld.
 *
 * Loads (or generates, on first visit) the Base Layer for a given sign,
 * fetches today's global transit snapshot, composites the overlay, and
 * restores the player's last save position — everything
 * src/screens/world/WorldScreen.tsx needs before it can mount the R3F
 * canvas. Phase 1 only ever calls this with 'scorpio', but the hook
 * itself takes the sign as a parameter rather than hardcoding it.
 */

import { useEffect, useState } from 'react';
import { useWorldStore } from '../state/worldStore';
import { getOrGenerateBaseLayerWorld } from '../lib/worldGen/baseLayer';
import { getGlobalTransitSnapshot, compositeOverlay } from '../lib/worldGen/transitOverlay';
import { getWorldSave } from '../lib/worldSave';
import type { ZodiacSign } from '../types/astrology';

export function useWorld(zodiacSign: ZodiacSign) {
  const baseLayer = useWorldStore((s) => s.baseLayer);
  const overlay = useWorldStore((s) => s.overlay);
  const loading = useWorldStore((s) => s.loading);
  const setBaseLayer = useWorldStore((s) => s.setBaseLayer);
  const setOverlay = useWorldStore((s) => s.setOverlay);
  const setPlayerPosition = useWorldStore((s) => s.setPlayerPosition);
  const setLoading = useWorldStore((s) => s.setLoading);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const world = await getOrGenerateBaseLayerWorld(zodiacSign);
        const snapshot = await getGlobalTransitSnapshot();
        const composite = compositeOverlay(world.world_json, snapshot);
        const save = await getWorldSave(zodiacSign);

        if (cancelled) return;
        setBaseLayer(world);
        setOverlay(composite);
        if (save) {
          setPlayerPosition([save.position_x, save.position_y, save.position_z]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load world');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [zodiacSign, setBaseLayer, setOverlay, setPlayerPosition, setLoading]);

  return { baseLayer, overlay, loading, error };
}
