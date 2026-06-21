/**
 * VoidScreen — Serpentaria, the hidden thirteenth world.
 *
 * Gated on completing all twelve Arcs. Locked, it shows only how far off
 * the player is. Unlocked, it generates the world deterministically from
 * the player's seed and renders it through the same WorldCanvas the
 * zodiac worlds use — but it is not a zodiac world, not persisted, and
 * carries no Transit Overlay (it sits outside the wheel and its weather).
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSerpentaria } from '../../hooks/useSerpentaria';
import { WorldCanvas } from '../../nexus-render/r3f-backend/WorldCanvas';
import { generateSerpentariaScene } from '../../lib/gameLogic/serpentaria';
import type { WorldSceneDescriptor } from '../../nexus-render/core/NexusRender';

export function VoidScreen() {
  const navigate = useNavigate();
  const state = useSerpentaria();

  const descriptor = useMemo<WorldSceneDescriptor | null>(() => {
    if (!state?.unlocked || !state.seed) return null;
    const scene = generateSerpentariaScene(state.seed);
    return {
      archetypeTheme: scene.archetypeTheme,
      ambientColorHex: scene.ambientColorHex,
      biomes: scene.biomes,
      landmarks: scene.landmarks,
      activeOverlayOperations: [], // outside the zodiac — no transit weather
    };
  }, [state?.unlocked, state?.seed]);

  if (!state) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#e6e6f0' }}>
        Listening for the thirteenth…
      </div>
    );
  }

  if (!state.unlocked) {
    return (
      <div style={{ padding: 24, color: '#e6e6f0', fontFamily: 'sans-serif', maxWidth: 520, margin: '0 auto' }}>
        <button onClick={() => navigate('/nexus')} style={{ marginBottom: 16 }}>← Back to Nexus</button>
        <h1>Serpentaria — Sealed</h1>
        <p style={{ opacity: 0.85 }}>
          There is a thirteenth, left out of the wheel. It will not open to anyone who has not walked all twelve worlds first.
        </p>
        <p style={{ fontSize: 14 }}>
          Arcs completed: <strong>{state.arcsComplete}</strong> / {state.arcsRequired}
        </p>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.15)', maxWidth: 280 }}>
          <div style={{ height: '100%', borderRadius: 3, background: '#9d4edd', width: `${Math.round((state.arcsComplete / state.arcsRequired) * 100)}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {descriptor && <WorldCanvas descriptor={descriptor} />}
      <div style={{ position: 'absolute', top: 16, left: 16, color: '#e6e6f0', fontFamily: 'sans-serif', pointerEvents: 'none' }}>
        <h2 style={{ margin: 0 }}>Serpentaria</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.75 }}>The thirteenth — beyond the wheel</p>
      </div>
      <button
        onClick={() => navigate('/nexus')}
        style={{ position: 'absolute', top: 16, right: 16, padding: '6px 12px', borderRadius: 6, background: 'rgba(20,20,30,0.7)', color: '#e6e6f0', border: '1px solid #444' }}
      >
        Leave
      </button>
    </div>
  );
}
