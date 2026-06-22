/**
 * StarMapScreen.
 *
 * Wraps StarMapScene in its own lightweight <Canvas> — deliberately NOT
 * WorldCanvas, since the star map isn't a WorldSceneDescriptor (it has
 * no biomes/landmarks/overlay, just twelve fixed star positions) and
 * doesn't need the mobile movement controls a playable world does. It
 * still gets the same context-recovery treatment via useContextRecovery
 * directly, since context loss is a platform risk for ANY WebGL canvas,
 * not just world screens.
 *
 * It is also the home of Constellation Drawing: the panel lists the
 * astrological constellations, shows how many of each one's worlds the
 * player has explored, and lets a complete one be drawn — which credits
 * its reward and renders its connecting lines among the stars.
 */

import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrbitControls } from '@react-three/drei';
import { useContextRecovery } from '../../nexus-render/core/useContextRecovery';
import { StarMapScene } from '../../nexus-render/r3f-backend/StarMapScene';
import { useCosmicProfile } from '../../hooks/useCosmicProfile';
import { getAllMasteryXp } from '../../lib/zodiacMastery';
import { tierForXp } from '../../lib/gameLogic/zodiacMastery';
import { getExploredSigns, getDrawnConstellationIds, drawConstellation } from '../../lib/constellations';
import { CONSTELLATIONS, constellationStatus } from '../../lib/gameLogic/constellations';
import type { ZodiacSign } from '../../types/astrology';

export function StarMapScreen() {
  const navigate = useNavigate();
  const { profile, loading } = useCosmicProfile();
  const { reconnecting, onCanvasCreated } = useContextRecovery();

  // Progression state surfaced on the map: mastery (for per-star tier
  // badges), explored worlds and drawn constellations (for the
  // Constellation Drawing panel and the lines among the stars). A load
  // failure leaves these empty rather than blocking the map.
  const [masteryXpBySign, setMasteryXpBySign] = useState<Partial<Record<ZodiacSign, number>>>({});
  const [exploredSigns, setExploredSigns] = useState<Set<ZodiacSign>>(new Set());
  const [drawnIds, setDrawnIds] = useState<Set<string>>(new Set());
  const [drawMessage, setDrawMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [xp, explored, drawn] = await Promise.all([
      getAllMasteryXp().catch(() => ({})),
      getExploredSigns().catch(() => new Set<ZodiacSign>()),
      getDrawnConstellationIds().catch(() => new Set<string>()),
    ]);
    setMasteryXpBySign(xp);
    setExploredSigns(explored);
    setDrawnIds(drawn);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refresh().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [refresh]);

  const masteryTierBySign = useMemo(() => {
    const tiers: Partial<Record<ZodiacSign, number>> = {};
    for (const [sign, xp] of Object.entries(masteryXpBySign)) {
      tiers[sign as ZodiacSign] = tierForXp(xp as number);
    }
    return tiers;
  }, [masteryXpBySign]);

  const statuses = useMemo(
    () => CONSTELLATIONS.map((c) => constellationStatus(c, exploredSigns)),
    [exploredSigns],
  );

  const drawnConstellationSigns = useMemo(
    () => CONSTELLATIONS.filter((c) => drawnIds.has(c.id)).map((c) => c.signs),
    [drawnIds],
  );

  const handleDraw = useCallback(async (id: string) => {
    const result = await drawConstellation(id);
    if (result.drawn) {
      const c = CONSTELLATIONS.find((x) => x.id === id);
      setDrawMessage(`Drew ${c?.name ?? 'constellation'} — +${result.rewardGranted} stardust`);
      await refresh();
    } else if (result.reason === 'incomplete') {
      setDrawMessage('Explore all of its worlds first.');
    } else if (result.reason === 'already_drawn') {
      setDrawMessage('Already drawn.');
      await refresh();
    } else {
      setDrawMessage('Could not draw that constellation.');
    }
  }, [refresh]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas onCreated={onCanvasCreated} dpr={[1, 2]} camera={{ fov: 55, position: [0, 8, 30] }}>
        <Suspense fallback={null}>
          {!loading && (
            <StarMapScene
              sunSign={profile?.sun_sign ?? null}
              onSelectSign={(sign) => navigate(`/world/${sign}`)}
              masteryTierBySign={masteryTierBySign}
              drawnConstellationSigns={drawnConstellationSigns}
            />
          )}
        </Suspense>
        {/* Mouse/trackpad orbit for desktop testing; touch users can
            also drag to orbit since OrbitControls handles single-finger
            touch natively. A dedicated joystick isn't needed here since
            there's no player to move around — only the camera moves. */}
        <OrbitControls enablePan={false} minDistance={15} maxDistance={50} />
      </Canvas>

      <div style={{ position: 'absolute', top: 16, left: 16, color: '#e6e6f0', fontFamily: 'sans-serif' }}>
        <h2 style={{ margin: 0 }}>The Star Map</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.8 }}>All twelve worlds are open. Tap any star to enter — your Sun sign glows gold.</p>
        {drawMessage && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#e0aaff' }}>{drawMessage}</p>}
      </div>

      <ConstellationPanel statuses={statuses} drawnIds={drawnIds} onDraw={handleDraw} />

      {reconnecting && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(5,5,10,0.85)', color: '#e6e6f0', fontFamily: 'sans-serif',
          }}
        >
          Reconnecting the stars…
        </div>
      )}
    </div>
  );
}

type Statuses = ReturnType<typeof constellationStatus>[];

function ConstellationPanel({
  statuses, drawnIds, onDraw,
}: {
  statuses: Statuses;
  drawnIds: Set<string>;
  onDraw: (id: string) => void;
}) {
  return (
    <div
      style={{
        position: 'absolute', top: 16, right: 16, width: 240, maxHeight: '80%', overflowY: 'auto',
        background: 'rgba(12,12,22,0.82)', border: '1px solid #2a2a44', borderRadius: 8, padding: 12,
        color: '#e6e6f0', fontFamily: 'sans-serif',
      }}
    >
      <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Constellations</h3>
      {statuses.map(({ constellation, isComplete, exploredCount }) => {
        const isDrawn = drawnIds.has(constellation.id);
        return (
          <div key={constellation.id} style={{ marginBottom: 10, opacity: isDrawn ? 0.7 : 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{constellation.name}</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>
              {exploredCount}/{constellation.signs.length} worlds explored
            </div>
            {isDrawn ? (
              <div style={{ fontSize: 12, color: '#9d4edd', fontWeight: 700, marginTop: 2 }}>✓ Drawn</div>
            ) : isComplete ? (
              <button
                onClick={() => onDraw(constellation.id)}
                style={{
                  marginTop: 4, padding: '3px 10px', fontSize: 12, borderRadius: 5,
                  background: '#9d4edd', color: '#fff', border: 'none', cursor: 'pointer',
                }}
              >
                Draw (+{constellation.reward})
              </button>
            ) : (
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>Locked</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
