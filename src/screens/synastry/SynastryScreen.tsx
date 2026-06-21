/**
 * SynastryScreen.
 *
 * Compares the player's natal chart against someone else's. The player
 * enters the other person's birth data; we compute THEIR chart locally
 * with the ephemeris (exactly as onboarding does for the player) and run
 * the pure synastry comparison. Nothing is stored — the second chart and
 * its result live only for the session. Reached from the Nexus.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeNatalChart } from '@ephemeris/natal';
import type { NatalChartInput } from '@ephemeris/natal';
import { useCosmicProfile } from '../../hooks/useCosmicProfile';
import { computeSynastry } from '../../lib/gameLogic/synastry';
import type { SynastryResult, SynastryHighlight } from '../../lib/gameLogic/synastry';

const QUALITY_COLOR: Record<SynastryHighlight['quality'], string> = {
  harmonious: '#52e89e',
  tense: '#f0883e',
  intense: '#e0aaff',
};

export function SynastryScreen() {
  const navigate = useNavigate();
  const { profile, loading } = useCosmicProfile();

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [knowsTime, setKnowsTime] = useState(true);
  const [birthTime, setBirthTime] = useState('12:00');
  const [birthTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [birthLat, setBirthLat] = useState('');
  const [birthLng, setBirthLng] = useState('');

  const [result, setResult] = useState<SynastryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCompare() {
    setError(null);
    if (!profile) { setError('Complete your own chart first.'); return; }
    if (!birthDate) { setError('A birth date is required.'); return; }
    try {
      const input: NatalChartInput = {
        birthDate,
        birthTime: knowsTime ? birthTime : undefined,
        birthTimezone,
        birthLat: birthLat ? Number(birthLat) : undefined,
        birthLng: birthLng ? Number(birthLng) : undefined,
      };
      const theirChart = computeNatalChart(input);
      setResult(computeSynastry(profile.chart_json, theirChart));
    } catch {
      setError('Could not compute that chart — check the birth details.');
    }
  }

  return (
    <div style={{ padding: 24, color: '#e6e6f0', fontFamily: 'sans-serif', maxWidth: 560, margin: '0 auto' }}>
      <button onClick={() => navigate('/nexus')} style={{ marginBottom: 16 }}>← Back to Nexus</button>
      <h1 style={{ marginBottom: 4 }}>Synastry</h1>
      <p style={{ opacity: 0.85, fontSize: 14 }}>
        Compare your chart with someone else's. Enter their birth details — nothing is saved.
      </p>

      {loading && <p>Loading your chart…</p>}
      {!loading && !profile && <p style={{ color: '#f87171' }}>Finish your own onboarding first, then come back to compare.</p>}

      {!loading && profile && (
        <section style={{ border: '1px solid #444', borderRadius: 8, padding: 16, margin: '12px 0' }}>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Their name (optional)
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ display: 'block', marginTop: 4 }} />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Birth date
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={{ display: 'block', marginTop: 4 }} />
          </label>
          <label style={{ display: 'block', marginBottom: 8 }}>
            <input type="checkbox" checked={knowsTime} onChange={(e) => setKnowsTime(e.target.checked)} /> I know their birth time
          </label>
          {knowsTime && (
            <label style={{ display: 'block', marginBottom: 8 }}>
              Birth time
              <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} style={{ display: 'block', marginTop: 4 }} />
            </label>
          )}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="number" placeholder="Latitude (optional)" value={birthLat} onChange={(e) => setBirthLat(e.target.value)} style={{ flex: 1 }} />
            <input type="number" placeholder="Longitude (optional)" value={birthLng} onChange={(e) => setBirthLng(e.target.value)} style={{ flex: 1 }} />
          </div>
          <p style={{ fontSize: 11, opacity: 0.6, margin: '0 0 8px' }}>Timezone: {birthTimezone}</p>
          <button onClick={handleCompare} disabled={!birthDate} style={{ padding: '6px 14px' }}>Compare charts</button>
          {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
        </section>
      )}

      {result && (
        <section style={{ border: '1px solid #3a2a55', borderRadius: 8, padding: 16, background: 'rgba(40,28,72,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ margin: 0 }}>{name ? `You & ${name}` : 'Your synastry'}</h2>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#e0aaff' }}>{result.score}<span style={{ fontSize: 13, opacity: 0.6 }}>/100</span></span>
          </div>
          <p style={{ margin: '4px 0', fontWeight: 700 }}>{result.label}</p>
          <p style={{ margin: '0 0 8px', fontSize: 14, opacity: 0.9 }}>{result.summary}</p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>
            {result.harmoniousCount} harmonious · {result.tenseCount} tense · {result.conjunctionCount} conjunctions
            ({result.totalContacts} contacts)
          </p>

          {result.highlights.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h3 style={{ fontSize: 14, margin: '0 0 6px' }}>Notable contacts</h3>
              {result.highlights.map((h, i) => (
                <div key={i} style={{ fontSize: 13, padding: '3px 0', borderLeft: `3px solid ${QUALITY_COLOR[h.quality]}`, paddingLeft: 8, marginBottom: 4 }}>
                  {h.note} <span style={{ opacity: 0.6 }}>({h.type}, {h.orb}°)</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: 11, opacity: 0.5, marginTop: 12 }}>
            For reflection and play — a themed read of the charts' geometry, not a verdict on any relationship.
          </p>
        </section>
      )}
    </div>
  );
}
