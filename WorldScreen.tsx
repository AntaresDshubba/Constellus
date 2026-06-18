/**
 * WorldScreen.
 *
 * Renders the playable world for a given zodiac sign. Reads the sign
 * from the route param (Phase 1 only ever has 'scorpio' actually
 * reachable from StarMapScreen, but the screen itself is general).
 * Combines useWorld (Base Layer + Transit Overlay) and useWorldSave
 * (autosave) with WorldCanvas (the actual R3F rendering).
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorld } from '../../hooks/useWorld';
import { useWorldSave } from '../../hooks/useWorldSave';
import { WorldCanvas } from '../../nexus-render/r3f-backend/WorldCanvas';
import { trackEvent } from '../../lib/analytics';
import { ZODIAC_SIGNS } from '../../types/astrology';
import type { ZodiacSign } from '../../types/astrology';
import type { WorldSceneDescriptor } from '../../nexus-render/core/NexusRender';

function isZodiacSign(value: string | undefined): value is ZodiacSign {
  return !!value && (ZODIAC_SIGNS as readonly string[]).includes(value);
}

export function WorldScreen() {
  const { sign } = useParams<{ sign: string }>();
  const navigate = useNavigate();

  if (!isZodiacSign(sign)) {
    return (
      <div style={{ padding: 24, color: '#e6e6f0', fontFamily: 'sans-serif' }}>
        <p>Unknown world.</p>
        <button onClick={() => navigate('/star-map')}>Back to Star Map</button>
      </div>
    );
  }

  return <WorldScreenForSign sign={sign} />;
}

function WorldScreenForSign({ sign }: { sign: ZodiacSign }) {
  const navigate = useNavigate();
  const { baseLayer, overlay, loading, error } = useWorld(sign);
  useWorldSave(sign);

  // Fires once per (sign, successful load) — keyed on baseLayer's id
  // rather than just `sign`, so re-entering the same world in a later
  // session (a fresh baseLayer object from a fresh query) tracks a new
  // entry, while React's normal re-render churn within one mount does
  // not produce duplicate events.
  useEffect(() => {
    if (baseLayer) {
      void trackEvent('world_entered', { zodiacSign: sign });
    }
  }, [baseLayer?.id, sign]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#e6e6f0' }}>
        Descending into {sign}…
      </div>
    );
  }

  if (error || !baseLayer) {
    return (
      <div style={{ padding: 24, color: '#e6e6f0', fontFamily: 'sans-serif' }}>
        <p>{error ?? `No world has been generated for ${sign} yet.`}</p>
        <button onClick={() => navigate('/star-map')}>Back to Star Map</button>
      </div>
    );
  }

  const descriptor: WorldSceneDescriptor = {
    archetypeTheme: baseLayer.world_json.archetypeTheme,
    ambientColorHex: baseLayer.world_json.ambientColorHex,
    biomes: baseLayer.world_json.biomes,
    landmarks: baseLayer.world_json.landmarks,
    activeOverlayOperations: overlay?.appliedOperations ?? [],
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <WorldCanvas descriptor={descriptor} />
      <div
        style={{
          position: 'absolute', top: 16, left: 16, color: '#e6e6f0', fontFamily: 'sans-serif', pointerEvents: 'none',
        }}
      >
        <h2 style={{ margin: 0 }}>{baseLayer.world_json.worldName}</h2>
      </div>
      <button
        onClick={() => navigate('/star-map')}
        style={{
          position: 'absolute', top: 16, right: 16, padding: '6px 12px', borderRadius: 6,
          background: 'rgba(20,20,30,0.7)', color: '#e6e6f0', border: '1px solid #444',
        }}
      >
        Leave
      </button>
    </div>
  );
}
