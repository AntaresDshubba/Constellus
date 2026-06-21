/**
 * AscensionScreen.
 *
 * The Starwalker Level and Astral Ascension home. Shows the current level
 * and progress, the active galaxy modifier and its bonus, and — at the
 * level cap — the Ascend action. Ascending resets the Level but keeps all
 * other progress; the confirmation copy makes that explicit. Reached from
 * the Nexus.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStarwalker } from '../../hooks/useStarwalker';

export function AscensionScreen() {
  const navigate = useNavigate();
  const { status, loading, ascending, ascend } = useStarwalker();
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleAscend() {
    const ok = await ascend();
    setConfirming(false);
    setMessage(ok ? 'You Ascend. The Level begins again — everything else you have earned remains.' : 'Not ready to Ascend yet.');
  }

  return (
    <div style={{ padding: 24, color: '#e6e6f0', fontFamily: 'sans-serif', maxWidth: 560, margin: '0 auto' }}>
      <button onClick={() => navigate('/nexus')} style={{ marginBottom: 16 }}>← Back to Nexus</button>
      <h1 style={{ marginBottom: 4 }}>Astral Ascension</h1>

      {loading && <p>Reading your Starwalker path…</p>}
      {!loading && !status && <p>Ascension is unavailable right now.</p>}

      {status && (
        <>
          <section style={{ border: '1px solid #3a2a55', borderRadius: 8, padding: 16, background: 'rgba(40,28,72,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={{ margin: 0 }}>Starwalker Level {status.level}<span style={{ fontSize: 13, opacity: 0.6 }}> / {status.maxLevel}</span></h2>
              <span style={{ fontSize: 13, color: '#e0aaff' }}>{status.galaxyModifier}</span>
            </div>

            {!status.atMaxLevel && status.xpForNextLevel !== null ? (
              <div style={{ margin: '10px 0 4px' }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 3 }}>
                  {status.xpIntoLevel}/{status.xpForNextLevel} XP to Level {status.level + 1}
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${Math.round(status.fractionToNextLevel * 100)}%`, background: '#9d4edd' }} />
                </div>
              </div>
            ) : (
              <p style={{ margin: '10px 0 4px', color: '#52e89e', fontWeight: 700 }}>Level cap reached — ready to Ascend.</p>
            )}

            <p style={{ fontSize: 13, opacity: 0.85, margin: '8px 0 0' }}>
              Ascensions: <strong>{status.ascensionTier}</strong>
              {status.ascensionBonusPct > 0 && <> · +{status.ascensionBonusPct}% Starwalker XP</>}
            </p>
          </section>

          <section style={{ marginTop: 16 }}>
            <p style={{ fontSize: 14, opacity: 0.9 }}>
              Ascending resets your Starwalker Level to 1 and grants a permanent galaxy modifier.
              Your Zodiac Mastery, Astro Bond, constellations, and Star Pass are <strong>kept</strong>.
            </p>

            {status.canAscend ? (
              confirming ? (
                <div>
                  <p style={{ color: '#e0aaff' }}>Ascend now? Your Level returns to 1.</p>
                  <button onClick={handleAscend} disabled={ascending} style={{ marginRight: 8, padding: '6px 14px', background: '#9d4edd', color: '#fff', border: 'none', borderRadius: 6 }}>
                    {ascending ? 'Ascending…' : 'Confirm Ascension'}
                  </button>
                  <button onClick={() => setConfirming(false)} disabled={ascending}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirming(true)} style={{ padding: '6px 14px', background: '#9d4edd', color: '#fff', border: 'none', borderRadius: 6 }}>
                  Ascend
                </button>
              )
            ) : (
              <p style={{ fontSize: 13, opacity: 0.6 }}>Reach Starwalker Level {status.maxLevel} to Ascend. Keep completing daily quests and Arc steps.</p>
            )}

            {message && <p style={{ color: '#e0aaff', fontSize: 13, marginTop: 8 }}>{message}</p>}
          </section>
        </>
      )}
    </div>
  );
}
