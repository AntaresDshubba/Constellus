/**
 * OnboardingScreen.
 *
 * The full Phase 0+1 onboarding flow in one component (deliberately not
 * split into a router-driven multi-route wizard for this phase — a
 * single component with a `step` state machine is simpler to reason
 * about for a linear, no-skipping-around flow, and splitting it into
 * routes would let the browser back button desync from the
 * consent-must-precede-data-collection ordering this flow depends on).
 *
 * Step order is deliberate and load-bearing:
 *   age_gate -> email_signin -> email_verify -> birth_date -> birth_time
 *   -> birth_location -> personality -> concerns -> goals -> submitting
 *   -> birth_moment
 * Each consent-gated step (birth_location's precise-location consent,
 * concerns, goals) records that tier's consent via useConsent BEFORE
 * the corresponding input is shown, never after — so a player who
 * declines a tier never even sees that tier's input fields.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpOrSignInWithEmail, verifyOtp } from '../../lib/auth';
import { useConsent } from '../../hooks/useConsent';
import { useCosmicProfile } from '../../hooks/useCosmicProfile';
import { trackEvent } from '../../lib/analytics';
import type { AgeGroup } from '../../types/identity';
import type { NatalChart } from '../../types/astrology';

type Step =
  | 'age_gate' | 'email_signin' | 'email_verify'
  | 'birth_date' | 'birth_time' | 'birth_location'
  | 'personality' | 'concerns' | 'goals'
  | 'submitting' | 'birth_moment';

const PERSONALITY_OPTIONS = ['Intense', 'Private', 'Loyal', 'Curious', 'Determined', 'Perceptive'];
const CONCERN_OPTIONS = ['Relationships', 'Career direction', 'Self-trust', 'Letting go', 'Burnout'];
const GOAL_OPTIONS = ['Deeper connection', 'Clarity', 'Confidence', 'Rest', 'Creative breakthrough'];

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { recordConsent } = useConsent();
  const { createCosmicProfile } = useCosmicProfile();

  const [step, setStep] = useState<Step>('age_gate');
  const [error, setError] = useState<string | null>(null);

  const [ageGroup, setAgeGroup] = useState<AgeGroup>('adult');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [birthDate, setBirthDate] = useState('');
  const [knowsBirthTime, setKnowsBirthTime] = useState(true);
  const [birthTime, setBirthTime] = useState('12:00');
  const [birthTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  const [wantsPreciseLocation, setWantsPreciseLocation] = useState(false);
  const [birthLat, setBirthLat] = useState('');
  const [birthLng, setBirthLng] = useState('');

  const [personalityTags, setPersonalityTags] = useState<string[]>([]);
  const [concernTags, setConcernTags] = useState<string[]>([]);
  const [goalTags, setGoalTags] = useState<string[]>([]);

  const [revealedChart, setRevealedChart] = useState<NatalChart | null>(null);

  // Funnel top: fires once per mount, regardless of whether the player
  // ever signs in — this is what makes "onboarding_started ->
  // onboarding_completed" a real funnel rather than one that only
  // starts counting after authentication.
  useEffect(() => {
    void trackEvent('onboarding_started');
  }, []);

  function toggleTag(list: string[], setList: (v: string[]) => void, tag: string) {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  function handleAgeGateContinue() {
    // Just advance to sign-in. Essential-tier consent (which gates the
    // birth date) is recorded right after authentication in
    // handleVerifyOtp — it CANNOT be recorded here, because
    // consent_records is RLS-scoped to auth.uid() and there is no session
    // yet at the age gate (recordConsent throws without one). It is still
    // recorded before any birth data is collected, so the
    // consent-precedes-collection ordering is preserved.
    setStep('email_signin');
  }

  async function handleSendOtp() {
    setError(null);
    try {
      await signUpOrSignInWithEmail(email, ageGroup);
      setStep('email_verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the sign-in code.');
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    try {
      await verifyOtp(email, otpCode);
      // A session now exists — record the essential-tier consent (the
      // audit-trail entry for the birth data about to be collected)
      // before showing any birth-data input.
      await recordConsent('essential', true);
      setStep('birth_date');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was incorrect or expired.');
    }
  }

  async function handleLocationConsent(granted: boolean) {
    setWantsPreciseLocation(granted);
    await recordConsent('precise_location', granted);
    setStep('personality');
  }

  async function handleConcernsConsent(granted: boolean) {
    if (!granted) setConcernTags([]);
    await recordConsent('life_concerns', granted);
    setStep('goals');
  }

  async function handleGoalsConsentAndSubmit(granted: boolean) {
    if (!granted) setGoalTags([]);
    await recordConsent('goals', granted);
    setStep('submitting');
    setError(null);
    try {
      const chart = await createCosmicProfile({
        birthDate,
        birthTime: knowsBirthTime ? birthTime : undefined,
        birthTimezone,
        locationPrecision: wantsPreciseLocation ? 'precise' : 'timezone',
        birthLat: wantsPreciseLocation && birthLat ? Number(birthLat) : undefined,
        birthLng: wantsPreciseLocation && birthLng ? Number(birthLng) : undefined,
        personalityTags,
        concernTags,
        goalTags,
      });
      setRevealedChart(chart.chart_json);
      setStep('birth_moment');
      void trackEvent('onboarding_completed');
      void trackEvent('birth_moment_revealed', {
        sunSign: chart.chart_json.sunSign,
        houseResolutionState: chart.chart_json.houseResolutionState,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong reading your chart.');
      setStep('goals');
    }
  }

  return (
    <div style={{ padding: 24, color: '#e6e6f0', fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto' }}>
      {step === 'age_gate' && (
        <section>
          <h1>Welcome to the Astroverse</h1>
          <p>Before we begin — are you an adult or a minor?</p>
          <label style={{ display: 'block', marginBottom: 8 }}>
            <input type="radio" checked={ageGroup === 'adult'} onChange={() => setAgeGroup('adult')} /> I am an adult
          </label>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <input type="radio" checked={ageGroup === 'minor'} onChange={() => setAgeGroup('minor')} /> I am a minor
          </label>
          <button onClick={handleAgeGateContinue}>Continue</button>
        </section>
      )}

      {step === 'email_signin' && (
        <section>
          <h1>Sign in</h1>
          <p>We'll email you a one-time code — no password needed.</p>
          <input
            type="email" placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 12 }}
          />
          {error && <p style={{ color: '#f87171' }}>{error}</p>}
          <button onClick={handleSendOtp} disabled={!email}>Send code</button>
        </section>
      )}

      {step === 'email_verify' && (
        <section>
          <h1>Check your email</h1>
          <p>Enter the code we sent to {email}.</p>
          <input
            type="text" placeholder="123456" value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 12 }}
          />
          {error && <p style={{ color: '#f87171' }}>{error}</p>}
          <button onClick={handleVerifyOtp} disabled={!otpCode}>Verify</button>
        </section>
      )}

      {step === 'birth_date' && (
        <section>
          <h1>When were you born?</h1>
          <input
            type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 12 }}
          />
          <button onClick={() => setStep('birth_time')} disabled={!birthDate}>Continue</button>
        </section>
      )}

      {step === 'birth_time' && (
        <section>
          <h1>What time were you born?</h1>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <input type="checkbox" checked={knowsBirthTime} onChange={(e) => setKnowsBirthTime(e.target.checked)} />
            {' '}I know my birth time
          </label>
          {knowsBirthTime ? (
            <input
              type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}
              style={{ width: '100%', padding: 8, marginBottom: 12 }}
            />
          ) : (
            <p style={{ opacity: 0.8, fontSize: 14 }}>
              No problem — we'll use a solar chart instead. Your Sun sign and Moon sign will still be fully accurate;
              your rising sign and houses will be left unresolved until you add a birth time later.
            </p>
          )}
          <button onClick={() => setStep('birth_location')}>Continue</button>
        </section>
      )}

      {step === 'birth_location' && (
        <section>
          <h1>Where were you born?</h1>
          <p style={{ fontSize: 14, opacity: 0.85 }}>
            Sharing your exact birth coordinates gives a fully resolved chart (rising sign, houses). You can skip this
            and we'll use your timezone alone — your Sun and Moon signs are unaffected either way.
          </p>
          <div style={{ marginBottom: 12 }}>
            <input
              type="number" placeholder="Latitude" value={birthLat}
              onChange={(e) => setBirthLat(e.target.value)}
              style={{ width: '48%', padding: 8, marginRight: '4%' }}
            />
            <input
              type="number" placeholder="Longitude" value={birthLng}
              onChange={(e) => setBirthLng(e.target.value)}
              style={{ width: '48%', padding: 8 }}
            />
          </div>
          <button onClick={() => handleLocationConsent(true)} disabled={!birthLat || !birthLng} style={{ marginRight: 8 }}>
            Share precise location
          </button>
          <button onClick={() => handleLocationConsent(false)}>Skip — use timezone only</button>
        </section>
      )}

      {step === 'personality' && (
        <section>
          <h1>How would you describe yourself?</h1>
          <p style={{ fontSize: 14, opacity: 0.85 }}>Optional — pick any that resonate.</p>
          {PERSONALITY_OPTIONS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(personalityTags, setPersonalityTags, tag)}
              style={{
                margin: 4, padding: '6px 12px', borderRadius: 16,
                background: personalityTags.includes(tag) ? '#9d4edd' : 'transparent',
                border: '1px solid #9d4edd', color: '#e6e6f0',
              }}
            >
              {tag}
            </button>
          ))}
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setStep('concerns')}>Continue</button>
          </div>
        </section>
      )}

      {step === 'concerns' && (
        <section>
          <h1>What's on your mind lately?</h1>
          <p style={{ fontSize: 14, opacity: 0.85 }}>
            Optional, and private — this helps personalize your experience but is never required.
          </p>
          {CONCERN_OPTIONS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(concernTags, setConcernTags, tag)}
              style={{
                margin: 4, padding: '6px 12px', borderRadius: 16,
                background: concernTags.includes(tag) ? '#3a86ff' : 'transparent',
                border: '1px solid #3a86ff', color: '#e6e6f0',
              }}
            >
              {tag}
            </button>
          ))}
          <div style={{ marginTop: 16 }}>
            <button onClick={() => handleConcernsConsent(concernTags.length > 0)}>Continue</button>
          </div>
        </section>
      )}

      {step === 'goals' && (
        <section>
          <h1>What are you hoping for?</h1>
          <p style={{ fontSize: 14, opacity: 0.85 }}>Optional — last step before your chart is revealed.</p>
          {GOAL_OPTIONS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(goalTags, setGoalTags, tag)}
              style={{
                margin: 4, padding: '6px 12px', borderRadius: 16,
                background: goalTags.includes(tag) ? '#52e89e' : 'transparent',
                border: '1px solid #52e89e', color: '#e6e6f0',
              }}
            >
              {tag}
            </button>
          ))}
          {error && <p style={{ color: '#f87171' }}>{error}</p>}
          <div style={{ marginTop: 16 }}>
            <button onClick={() => handleGoalsConsentAndSubmit(goalTags.length > 0)}>Reveal my universe</button>
          </div>
        </section>
      )}

      {step === 'submitting' && <p>Your universe is being born…</p>}

      {step === 'birth_moment' && revealedChart && (
        <section style={{ textAlign: 'center' }}>
          <h1>Your Universe</h1>
          <p style={{ fontSize: 14, opacity: 0.85 }}>
            {revealedChart.houseResolutionState === 'provisional_solar'
              ? 'Your chart is provisional, resolved by Sun position alone. Add an exact birth time later to fully resolve it.'
              : 'Your chart has fully resolved.'}
          </p>
          <div style={{ border: '1px solid #444', borderRadius: 8, padding: 20, margin: '20px 0' }}>
            <p style={{ fontSize: 18 }}>
              Sun in <strong>{revealedChart.sunSign}</strong> · Moon in <strong>{revealedChart.moonSign}</strong>
              {revealedChart.risingSign && (
                <>
                  {' '}· Rising in <strong>{revealedChart.risingSign}</strong>
                </>
              )}
            </p>
            <p style={{ fontSize: 14, opacity: 0.8 }}>{revealedChart.aspects.length} aspects found in your chart</p>
          </div>
          <button onClick={() => navigate('/star-map')}>Enter the Astroverse</button>
        </section>
      )}
    </div>
  );
}
