/**
 * ConvergenceScreen — the Convergence Journal.
 *
 * The meta-narrative's home: Act I's synopsis, the Nexus Fragments
 * recovered so far (one per completed Arc, named for its world), the
 * backstory beats unlocked, and a teaser for what is still locked. When
 * Act I completes, it shows the finale and a teaser for Act II
 * (post-launch). Reached from the Nexus.
 */

import { useNavigate } from 'react-router-dom';
import { useConvergence } from '../../hooks/useConvergence';
import { SIGN_WORLD_PROFILES } from '../../lib/worldGen/signWorlds';

export function ConvergenceScreen() {
  const navigate = useNavigate();
  const { status, loading } = useConvergence();

  return (
    <div style={{ padding: 24, color: '#e6e6f0', fontFamily: 'sans-serif', maxWidth: 620, margin: '0 auto' }}>
      <button onClick={() => navigate('/nexus')} style={{ marginBottom: 16 }}>← Back to Nexus</button>

      {loading && <p>Opening the Convergence Journal…</p>}
      {!loading && !status && <p>The Convergence Journal is unavailable right now.</p>}

      {status && (
        <>
          <h1 style={{ marginBottom: 4 }}>The Convergence</h1>
          <h2 style={{ margin: '0 0 8px', fontSize: 16, color: '#e0aaff' }}>{status.actName}</h2>
          <p style={{ opacity: 0.85, fontSize: 14 }}>{status.synopsis}</p>

          <div style={{ margin: '16px 0' }}>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>
              Nexus Fragments recovered: <strong>{Math.min(status.fragmentsRecovered, status.fragmentsRequired)}</strong> / {status.fragmentsRequired}
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }}>
              <div
                style={{
                  height: '100%', borderRadius: 3, background: '#9d4edd',
                  width: `${Math.round((Math.min(status.fragmentsRecovered, status.fragmentsRequired) / status.fragmentsRequired) * 100)}%`,
                }}
              />
            </div>
          </div>

          {status.recoveredSigns.length > 0 && (
            <p style={{ fontSize: 13, opacity: 0.8 }}>
              Fragments held:{' '}
              {status.recoveredSigns.map((s) => `Shard of ${SIGN_WORLD_PROFILES[s].worldName}`).join(' · ')}
            </p>
          )}

          {status.fragmentsRecovered === 0 && (
            <p style={{ fontSize: 13, opacity: 0.7, fontStyle: 'italic' }}>
              Complete a world's Arc (from its world screen) to recover your first Nexus Fragment and begin the story.
            </p>
          )}

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {status.revealedBeats.map((beat) => (
              <div key={beat.id} style={{ border: '1px solid #3a2a55', borderRadius: 8, padding: 14, background: 'rgba(40,28,72,0.3)' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 15 }}>{beat.title}</h3>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.9, lineHeight: 1.5 }}>{beat.text}</p>
              </div>
            ))}

            {status.nextLockedBeatIndex !== null && (
              <div style={{ border: '1px dashed #444', borderRadius: 8, padding: 14, opacity: 0.65 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 15 }}>??? — Fragment {status.nextLockedBeatIndex + 1}</h3>
                <p style={{ margin: 0, fontSize: 13, fontStyle: 'italic' }}>
                  Complete another world's Arc to recover the next Nexus Fragment and reveal what it holds.
                </p>
              </div>
            )}

            {status.actComplete && (
              <div style={{ border: '1px solid #2e5a3a', borderRadius: 8, padding: 14 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 15, color: '#52e89e' }}>Act I complete</h3>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
                  Act II — Exploration (Zodiac Arcs 5–8) continues the descent into the Fracture. It arrives in a future chapter.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
