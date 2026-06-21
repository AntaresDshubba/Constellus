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
import { useZodiacMastery } from '../../hooks/useZodiacMastery';
import { grantDailyWorldVisitXp } from '../../lib/zodiacMastery';
import { WorldCanvas } from '../../nexus-render/r3f-backend/WorldCanvas';
import { trackEvent } from '../../lib/analytics';
import { ZODIAC_SIGNS } from '../../types/astrology';
import type { ZodiacSign } from '../../types/astrology';
import type { MasteryProgress } from '../../lib/gameLogic/zodiacMastery';
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
  const { progress: mastery, setProgress: setMastery } = useZodiacMastery(sign);

  // Fires once per (sign, successful load) — keyed on baseLayer's id
  // rather than just `sign`, so re-entering the same world in a later
  // session (a fresh baseLayer object from a fresh query) tracks a new
  // entry, while React's normal re-render churn within one mount does
  // not produce duplicate events. The same moment credits the once-per-day
  // Zodiac Mastery visit XP (grantDailyWorldVisitXp is idempotent per day,
  // so this is safe even though the effect can re-run on re-entry).
  useEffect(() => {
    if (baseLayer) {
      void trackEvent('world_entered', { zodiacSign: sign });
      void grantDailyWorldVisitXp(sign).then(setMastery).catch(() => {
        // Mastery is a non-blocking overlay; a write failure must never
        // disrupt the world the player is already standing in.
      });
    }
  }, [baseLayer?.id, sign, setMastery]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#e6e6f0' }}>
        Entering {sign.charAt(0).toUpperCase() + sign.slice(1)}…
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
        {mastery && <MasteryBar progress={mastery} />}
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

/** Compact Zodiac Mastery readout shown in the world's corner overlay. */
function MasteryBar({ progress }: { progress: MasteryProgress }) {
  return (
    <div style={{ marginTop: 6, width: 200 }}>
      <div style={{ fontSize: 12, opacity: 0.85, display: 'flex', justifyContent: 'space-between' }}>
        <span>Mastery — Tier {progress.tier}{progress.isMaxTier ? ' · Max' : ''}</span>
        {!progress.isMaxTier && <span>{progress.xpIntoTier}/{progress.xpForNextTier}</span>}
      </div>
      <div style={{ marginTop: 3, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }}>
        <div
          style={{
            height: '100%', borderRadius: 3,
            width: `${Math.round(progress.fractionToNextTier * 100)}%`, background: '#9d4edd',
          }}
        />
      </div>
    </div>
  );
}
