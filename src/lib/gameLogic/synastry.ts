/**
 * Synastry — natal chart comparison.
 *
 * A post-launch extension of the sealed ephemeris (Technical Bible: the
 * "Synastry feature" in the post-launch roadmap). Given two natal charts,
 * it runs the ephemeris's existing computeCrossAspects primitive — the
 * SAME one personal transits use — between their planets and turns the
 * cross-aspects into a legible compatibility read: a themes-not-authority
 * score, harmonious/tense counts, and the notable contacts between the
 * pair's personal planets.
 *
 * Pure: no I/O, no Date.now(). The screen computes the second chart with
 * computeNatalChart (client-side, deterministic, exactly as onboarding
 * does for the player's own) and hands both charts here. Nothing about
 * synastry is persisted — it's computed on demand from public birth data
 * the player enters, so it needs no table and stores nothing about anyone.
 */

import { computeCrossAspects } from '@ephemeris/aspects';
import type { ChartAspect, AspectType } from '@ephemeris/aspects';
import type { NatalChart, Planet } from '../../types/astrology';

const HARMONIOUS: Set<AspectType> = new Set(['trine', 'sextile']);
const TENSE: Set<AspectType> = new Set(['square', 'opposition']);

// The relationship-relevant bodies. Highlights are drawn from contacts
// where BOTH sides are one of these — outer-planet pairings matter more
// for generational than interpersonal synastry, so they're left out of
// the headline read (they still count toward the totals/score).
const PERSONAL: Set<Planet> = new Set(['sun', 'moon', 'mercury', 'venus', 'mars']);

const ASPECT_PHRASE: Record<AspectType, string> = {
  conjunction: 'meets',
  sextile: 'sparks with',
  trine: 'flows with',
  square: 'clashes with',
  opposition: 'pulls against',
};

export interface SynastryHighlight {
  /** Body from chart A (the player). */
  yours: Planet;
  /** Body from chart B (the other person). */
  theirs: Planet;
  type: AspectType;
  orb: number;
  quality: 'harmonious' | 'tense' | 'intense';
  note: string;
}

export interface SynastryResult {
  harmoniousCount: number;
  tenseCount: number;
  conjunctionCount: number;
  totalContacts: number;
  /** 0–100, themed (not a claim of astrological authority). */
  score: number;
  label: string;
  summary: string;
  highlights: SynastryHighlight[];
}

function qualityOf(type: AspectType): SynastryHighlight['quality'] {
  if (HARMONIOUS.has(type)) return 'harmonious';
  if (TENSE.has(type)) return 'tense';
  return 'intense'; // conjunction
}

function cap(body: Planet): string {
  return body.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function labelForScore(score: number): { label: string; summary: string } {
  if (score >= 75) return { label: 'Radiant', summary: 'An unusually easy, warm connection — the charts reinforce each other.' };
  if (score >= 60) return { label: 'Harmonious', summary: 'More flow than friction; the easy contacts outweigh the hard ones.' };
  if (score >= 45) return { label: 'Balanced', summary: 'A real mix of ease and challenge — texture, not a smooth ride or a hard one.' };
  if (score >= 30) return { label: 'Challenging', summary: 'More friction than flow; rewarding, but it asks for work.' };
  return { label: 'Volatile', summary: 'Intense and demanding — strong charges, easily struck.' };
}

export function computeSynastry(yourChart: NatalChart, theirChart: NatalChart): SynastryResult {
  const yours = yourChart.planets.map((p) => ({ planet: p.planet, longitude: p.longitude }));
  const theirs = theirChart.planets.map((p) => ({ planet: p.planet, longitude: p.longitude }));
  const cross: ChartAspect[] = computeCrossAspects(yours, theirs);

  let harmoniousCount = 0;
  let tenseCount = 0;
  let conjunctionCount = 0;
  for (const a of cross) {
    if (HARMONIOUS.has(a.type)) harmoniousCount++;
    else if (TENSE.has(a.type)) tenseCount++;
    else conjunctionCount++;
  }

  // Themed score: the BALANCE of ease vs friction, not raw counts — a
  // ratio so a chart pair with many aspects doesn't saturate at 100 just
  // by having lots of everything. Centered at 50 (even mix); conjunctions
  // are intensity, not ease/friction, so they don't move the ratio.
  const decisive = harmoniousCount + tenseCount;
  const score = Math.max(0, Math.min(100, Math.round(50 + 50 * (harmoniousCount - tenseCount) / Math.max(1, decisive))));
  const { label, summary } = labelForScore(score);

  const highlights: SynastryHighlight[] = cross
    .filter((a) => PERSONAL.has(a.planetA as Planet) && PERSONAL.has(a.planetB as Planet))
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 6)
    .map((a) => {
      const yoursBody = a.planetA as Planet;
      const theirsBody = a.planetB as Planet;
      return {
        yours: yoursBody,
        theirs: theirsBody,
        type: a.type,
        orb: Math.round(a.orb * 10) / 10,
        quality: qualityOf(a.type),
        note: `Your ${cap(yoursBody)} ${ASPECT_PHRASE[a.type]} their ${cap(theirsBody)}`,
      };
    });

  return { harmoniousCount, tenseCount, conjunctionCount, totalContacts: cross.length, score, label, summary, highlights };
}
