/**
 * WorldScreen.
 *
 * Renders the playable world for a given zodiac sign. Reads the sign
 * from the route param (Phase 1 only ever has 'scorpio' actually
 * reachable from StarMapScreen, but the screen itself is general).
 * Combines useWorld (Base Layer + Transit Overlay) and useWorldSave
 * (autosave) with WorldCanvas (the actual R3F rendering).
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorld } from '../../hooks/useWorld';
import { useWorldSave } from '../../hooks/useWorldSave';
import { useZodiacMastery } from '../../hooks/useZodiacMastery';
import { useArcQuest } from '../../hooks/useArcQuest';
import { useWorldAudio } from '../../hooks/useWorldAudio';
import { grantDailyWorldVisitXp, getMastery } from '../../lib/zodiacMastery';
import { getDrawnConstellationIds } from '../../lib/constellations';
import { passiveVisitXpBonus } from '../../lib/gameLogic/constellations';
import type { ArcStatus } from '../../lib/gameLogic/arcQuests';
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
  const { status: arc, completing: arcCompleting, completeStep } = useArcQuest(sign);
  const { enabled: audioOn, toggle: toggleAudio, profile: audioProfile } = useWorldAudio(sign);
  const [arcMessage, setArcMessage] = useState<string | null>(null);

  async function handleCompleteArcStep() {
    const reward = await completeStep();
    if (reward) {
      setArcMessage(`+${reward.stardust} stardust · +${reward.masteryXp} mastery`);
      // The step granted mastery XP too — refresh the bar to reflect it.
      getMastery(sign).then(setMastery).catch(() => {});
    }
  }

  // Fires once per (sign, successful load) — keyed on baseLayer's id
  // rather than just `sign`, so re-entering the same world in a later
  // session (a fresh baseLayer object from a fresh query) tracks a new
  // entry, while React's normal re-render churn within one mount does
  // not produce duplicate events. The same moment credits the once-per-day
  // Zodiac Mastery visit XP (grantDailyWorldVisitXp is idempotent per day,
  // so this is safe even though the effect can re-run on re-entry).
  useEffect(() => {
    if (!baseLayer) return;
    void trackEvent('world_entered', { zodiacSign: sign });
    void (async () => {
      try {
        // The daily visit XP is boosted by the player's passive
        // Constellation Drawing bonus, computed from the drawn set.
        const drawnIds = await getDrawnConstellationIds();
        const updated = await grantDailyWorldVisitXp(sign, passiveVisitXpBonus(drawnIds));
        setMastery(updated);
      } catch {
        // Mastery/constellations are a non-blocking overlay; a failure
        // must never disrupt the world the player is already standing in.
      }
    })();
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

  // Bodies currently transiting this world's sign (from the Transit
  // Overlay's sign_resonance op), surfaced as a "living sky" line.
  const resonanceBodies = ((overlay?.appliedOperations.find((op) => op.type === 'sign_resonance')?.payload
    .bodies as string[] | undefined) ?? []);

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
        {resonanceBodies.length > 0 && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ffd166' }}>
            ✦ {resonanceBodies.map(formatBodyName).join(', ')} transiting {sign.charAt(0).toUpperCase() + sign.slice(1)} — the sky resonates here today
          </p>
        )}
      </div>

      {arc && (
        <ArcQuestPanel
          arc={arc}
          completing={arcCompleting}
          message={arcMessage}
          onComplete={handleCompleteArcStep}
        />
      )}

      <button
        onClick={toggleAudio}
        title={audioOn ? `Ambient: ${audioProfile.mode} (${audioProfile.description})` : 'Enable ambient sound'}
        style={{
          position: 'absolute', top: 16, right: 92, padding: '6px 12px', borderRadius: 6,
          background: 'rgba(20,20,30,0.7)', color: '#e6e6f0', border: '1px solid #444', cursor: 'pointer',
        }}
      >
        {audioOn ? '🔊' : '🔇'}
      </button>
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

/** The world's Arc Quest panel: current step + a complete action, or a done state. */
function ArcQuestPanel({
  arc, completing, message, onComplete,
}: {
  arc: ArcStatus;
  completing: boolean;
  message: string | null;
  onComplete: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute', bottom: 16, left: 16, width: 280,
        background: 'rgba(12,12,22,0.82)', border: '1px solid #2a2a44', borderRadius: 8, padding: 12,
        color: '#e6e6f0', fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{arc.title}</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{arc.stepsCompleted}/{arc.totalSteps}</span>
      </div>

      {arc.currentStep ? (
        <>
          <p style={{ margin: '6px 0 2px', fontSize: 13, fontWeight: 600 }}>{arc.currentStep.title}</p>
          <p style={{ margin: '0 0 8px', fontSize: 12, opacity: 0.85 }}>{arc.currentStep.objective}</p>
          <button
            onClick={onComplete}
            disabled={completing}
            style={{
              padding: '4px 12px', fontSize: 12, borderRadius: 5, border: 'none',
              background: '#9d4edd', color: '#fff', cursor: completing ? 'default' : 'pointer',
            }}
          >
            {completing ? 'Completing…' : 'Complete step'}
          </button>
        </>
      ) : (
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#52e89e', fontWeight: 700 }}>Arc complete ✓</p>
      )}

      {message && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#e0aaff' }}>{message}</p>}
    </div>
  );
}

/** "north_node" -> "North Node", "sun" -> "Sun". */
function formatBodyName(body: string): string {
  return body.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
