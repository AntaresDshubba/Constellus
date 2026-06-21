/**
 * StarPassScreen.
 *
 * The seasonal reward track. Shows current season XP and tier, progress
 * to the next tier, and the full ladder of tiers with their rewards —
 * each unlocked-but-unclaimed tier showing a Claim button. Reached from
 * the Nexus. All free-track (this build has no payments).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStarPass } from '../../hooks/useStarPass';
import type { TierView } from '../../lib/gameLogic/starPass';

export function StarPassScreen() {
  const navigate = useNavigate();
  const { status, loading, claimingTier, claim } = useStarPass();
  const [message, setMessage] = useState<string | null>(null);

  async function handleClaim(tier: number) {
    const reward = await claim(tier);
    if (reward !== null) setMessage(`Claimed Tier ${tier} — +${reward} stardust`);
  }

  return (
    <div style={{ padding: 24, color: '#e6e6f0', fontFamily: 'sans-serif', maxWidth: 560, margin: '0 auto' }}>
      <button onClick={() => navigate('/nexus')} style={{ marginBottom: 16 }}>← Back to Nexus</button>

      {loading && <p>Loading the Star Pass…</p>}
      {!loading && !status && <p>The Star Pass is unavailable right now.</p>}

      {status && (
        <>
          <h1 style={{ marginBottom: 4 }}>{status.seasonName}</h1>
          <p style={{ margin: '0 0 4px', opacity: 0.85 }}>
            Tier {status.currentTier} · {status.xp} XP
            {status.claimableCount > 0 && (
              <span style={{ color: '#e0aaff', fontWeight: 700 }}> · {status.claimableCount} reward{status.claimableCount === 1 ? '' : 's'} to claim</span>
            )}
          </p>

          {status.nextTier && status.xpForNextTier !== null && (
            <div style={{ margin: '8px 0 4px' }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 3 }}>
                {status.xpIntoTier}/{status.xpForNextTier} XP to Tier {status.nextTier.tier}
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${Math.round(status.fractionToNextTier * 100)}%`, background: '#9d4edd' }} />
              </div>
            </div>
          )}

          {message && <p style={{ color: '#e0aaff', fontSize: 13 }}>{message}</p>}

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {status.tiers.map((t) => (
              <TierRow key={t.tier} tier={t} claiming={claimingTier === t.tier} onClaim={() => handleClaim(t.tier)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TierRow({ tier, claiming, onClaim }: { tier: TierView; claiming: boolean; onClaim: () => void }) {
  const border = tier.claimable ? '#9d4edd' : tier.claimed ? '#2e5a3a' : '#333';
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px',
        opacity: tier.unlocked ? 1 : 0.5,
      }}
    >
      <div>
        <span style={{ fontWeight: 700 }}>Tier {tier.tier}</span>
        <span style={{ opacity: 0.8 }}> — {tier.label} (+{tier.rewardStardust} stardust)</span>
        <div style={{ fontSize: 11, opacity: 0.6 }}>{tier.xpThreshold} XP</div>
      </div>
      {tier.claimed ? (
        <span style={{ color: '#52e89e', fontWeight: 700, fontSize: 13 }}>✓ Claimed</span>
      ) : tier.claimable ? (
        <button
          onClick={onClaim}
          disabled={claiming}
          style={{ padding: '4px 12px', fontSize: 12, borderRadius: 5, border: 'none', background: '#9d4edd', color: '#fff', cursor: claiming ? 'default' : 'pointer' }}
        >
          {claiming ? 'Claiming…' : 'Claim'}
        </button>
      ) : (
        <span style={{ fontSize: 12, opacity: 0.5 }}>Locked</span>
      )}
    </div>
  );
}
