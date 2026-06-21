/**
 * NexusScreen.
 *
 * The player's hub, and the home of Phase 2's Daily Minimum loop: an
 * Astro greeting (via the Dialogue Router), the day's full Daily
 * Alignment (all seven components), a quest-completion action that
 * grants currency and advances Momentum together, and a small
 * Momentum/wallet display. This replaces Phase 1's placeholder version
 * of this screen — Phase 2's whole point is this loop, so a minimal
 * Nexus would leave the loop with nowhere to actually surface.
 */

import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCosmicProfile } from '../../hooks/useCosmicProfile';
import { useDailyAlignment } from '../../hooks/useDailyAlignment';
import { useMomentumAndWallet } from '../../hooks/useMomentumAndWallet';
import { useLunarPhase } from '../../hooks/useLunarPhase';
import { useAstroBond } from '../../hooks/useAstroBond';
import { useStarPass } from '../../hooks/useStarPass';
import { signOut } from '../../lib/auth';
import { routeDialogue } from '../../lib/astro/dialogueRouter';

const CHALLENGE_RATING_LABEL: Record<string, string> = {
  very_harmonious: 'Very Harmonious',
  harmonious: 'Harmonious',
  balanced: 'Balanced',
  tense: 'Tense',
  very_tense: 'Very Tense',
};

export function NexusScreen() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useCosmicProfile();
  const { alignment, loading: alignmentLoading, error: alignmentError, completing, completeQuest } = useDailyAlignment();
  const { momentum, balance, loading: walletLoading, refresh: refreshWallet } = useMomentumAndWallet();
  const lunarPhase = useLunarPhase();
  const { bond, refresh: refreshBond } = useAstroBond();
  const { status: starPass, refresh: refreshStarPass } = useStarPass();

  // first_daily_alignment is the one authored Astro moment this screen
  // can trigger deterministically from data already on hand: the
  // player's very first Alignment ever. Anything richer (recognizing
  // "first login" specifically, as opposed to first Alignment) would
  // need a dedicated flag this phase's schema doesn't carry yet, so
  // it's intentionally left as a future addition rather than guessed at
  // here.
  const astroLine = useMemo(() => {
    if (!alignment) return null;
    const situation = momentum?.lastEngagedDate === null ? 'first_daily_alignment' : null;
    return routeDialogue({
      situation,
      challengeRating: alignment.challenge_rating,
      focusPlanet: alignment.focus_planet,
      seed: alignment.id,
      bondPhase: bond?.phase ?? 1,
    });
  }, [alignment, momentum?.lastEngagedDate, bond?.phase]);

  useEffect(() => {
    if (alignment?.quest_completed_at) {
      // Quest completion changes both Momentum and the wallet balance —
      // refresh both rather than guessing the new values client-side.
      void refreshWallet();
    }
  }, [alignment?.quest_completed_at, refreshWallet]);

  async function handleSignOut() {
    await signOut();
    navigate('/onboarding');
  }

  async function handleCompleteQuest() {
    await completeQuest();
    // Completing the quest moves the wallet, Momentum, the Astro Bond, and
    // the Star Pass (it grants season XP) — refresh all so the screen,
    // including the Star Pass claimable badge, reflects the new state.
    await Promise.all([refreshWallet(), refreshBond(), refreshStarPass()]);
  }

  return (
    <div style={{ padding: 24, color: '#e6e6f0', fontFamily: 'sans-serif', maxWidth: 560, margin: '0 auto' }}>
      <h1>The Nexus</h1>

      {profileLoading && <p>Loading your chart…</p>}
      {profile && (
        <section style={{ border: '1px solid #444', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <p style={{ margin: 0 }}>
            Sun in <strong>{profile.sun_sign}</strong> · Moon in <strong>{profile.moon_sign}</strong>
            {profile.rising_sign && (
              <>
                {' '}· Rising in <strong>{profile.rising_sign}</strong>
              </>
            )}
          </p>
        </section>
      )}

      {lunarPhase && (
        <section
          style={{
            border: '1px solid #3a2a55', borderRadius: 8, padding: '10px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
            background: 'rgba(40,28,72,0.35)',
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 700 }}>{lunarPhase.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, opacity: 0.85 }}>{lunarPhase.emphasis}</p>
          </div>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{lunarPhase.illuminationPct}% lit</p>
            {lunarPhase.rewardMultiplier > 1 && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#e0aaff' }}>
                ×{lunarPhase.rewardMultiplier.toFixed(2)} rewards
              </p>
            )}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 8 }}>Today's Alignment</h2>

        {alignmentLoading && <p>Reading today's sky…</p>}
        {alignmentError && <p style={{ color: '#f87171' }}>{alignmentError}</p>}

        {alignment && (
          <div style={{ border: '1px solid #444', borderRadius: 8, padding: 16 }}>
            {astroLine && <p style={{ fontStyle: 'italic', opacity: 0.9, marginTop: 0 }}>{astroLine}</p>}

            <p style={{ margin: '8px 0' }}>{alignment.cosmic_weather_summary}</p>

            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 14, margin: '12px 0' }}>
              <dt style={{ opacity: 0.7 }}>Focus Planet</dt>
              <dd style={{ margin: 0, textTransform: 'capitalize' }}>{alignment.focus_planet}</dd>
              <dt style={{ opacity: 0.7 }}>Opportunity Zone</dt>
              <dd style={{ margin: 0, textTransform: 'capitalize' }}>{alignment.opportunity_zone}</dd>
              <dt style={{ opacity: 0.7 }}>Challenge Rating</dt>
              <dd style={{ margin: 0 }}>{CHALLENGE_RATING_LABEL[alignment.challenge_rating]}</dd>
              <dt style={{ opacity: 0.7 }}>Lucky Element</dt>
              <dd style={{ margin: 0, textTransform: 'capitalize' }}>{alignment.lucky_element}</dd>
            </dl>

            <p style={{ fontSize: 13, opacity: 0.85 }}>{alignment.astro_insight}</p>

            <div style={{ borderTop: '1px solid #333', paddingTop: 12, marginTop: 12 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{alignment.quest_objective}</p>
              {alignment.quest_completed_at ? (
                <p style={{ color: '#52e89e', margin: 0 }}>
                  Quest complete — earned {alignment.quest_reward_amount} stardust.
                </p>
              ) : (
                <button onClick={handleCompleteQuest} disabled={completing}>
                  {completing ? 'Completing…' : `Complete quest (+${alignment.quest_reward_amount} stardust)`}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {bond && (
        <section style={{ border: '1px solid #3a2a55', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p style={{ margin: 0, fontWeight: 700 }}>
              Astro Bond — {bond.name} <span style={{ opacity: 0.6, fontWeight: 400, fontSize: 12 }}>(Phase {bond.phase})</span>
            </p>
            {!bond.atLaunchMax && bond.pointsForNextPhase !== null && (
              <span style={{ fontSize: 12, opacity: 0.7 }}>{bond.pointsIntoPhase}/{bond.pointsForNextPhase}</span>
            )}
          </div>
          <p style={{ margin: '4px 0 8px', fontSize: 13, opacity: 0.85 }}>{bond.narrativeBeat}</p>
          <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${Math.round(bond.fractionToNextPhase * 100)}%`, background: '#9d4edd' }} />
          </div>
          {bond.atLaunchMax && bond.nextPhase?.locked && (
            <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.6 }}>
              Next: {bond.nextPhase.name} — {bond.nextPhase.narrativeBeat}
            </p>
          )}
        </section>
      )}

      <section style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <div style={{ border: '1px solid #444', borderRadius: 8, padding: 12, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>Momentum</p>
          <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700 }}>
            {walletLoading || !momentum ? '—' : Math.round(momentum.currentValue)}
            <span style={{ fontSize: 12, opacity: 0.6 }}> / 100</span>
          </p>
          {momentum && momentum.protectedDaysLeft > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.6 }}>
              {momentum.protectedDaysLeft} protected day{momentum.protectedDaysLeft === 1 ? '' : 's'} banked
            </p>
          )}
        </div>
        <div style={{ border: '1px solid #444', borderRadius: 8, padding: 12, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>Stardust</p>
          <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700 }}>{walletLoading ? '—' : balance}</p>
        </div>
      </section>

      <button onClick={() => navigate('/star-map')} style={{ marginRight: 8 }}>
        Open Star Map
      </button>
      <button onClick={() => navigate('/star-pass')} style={{ marginRight: 8 }}>
        Star Pass
        {starPass && starPass.claimableCount > 0 && (
          <span style={{ marginLeft: 6, padding: '0 6px', borderRadius: 8, background: '#9d4edd', color: '#fff', fontSize: 12 }}>
            {starPass.claimableCount}
          </span>
        )}
      </button>
      <button onClick={() => navigate('/convergence')} style={{ marginRight: 8 }}>
        The Convergence
      </button>
      <button onClick={() => navigate('/synastry')} style={{ marginRight: 8 }}>
        Synastry
      </button>
      <button onClick={() => navigate('/ascension')} style={{ marginRight: 8 }}>
        Ascension
      </button>
      <button onClick={handleSignOut}>Sign out</button>
    </div>
  );
}
