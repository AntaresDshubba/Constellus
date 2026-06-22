/**
 * Astro's procedural dialogue tier.
 *
 * The fallback tier: when no authored line matches the current
 * situation (../authoredDialogue.ts), Astro still needs to say
 * SOMETHING contextually relevant rather than nothing or a generic
 * placeholder. This tier builds a line from small, recombinable parts
 * keyed on the Daily Alignment's challenge rating and focus planet —
 * not as rich as an authored line, but always available and never
 * generic-feeling in the way a single fixed fallback string would be.
 *
 * Deterministic per (challengeRating, focusPlanet, seed) — same inputs,
 * same output — consistent with every other procedural system in this
 * codebase. No LLM call here or anywhere in this tier; that is a
 * deliberate Phase 2 boundary (see ../dialogueRouter.ts's header).
 */

import { createSeededRandom } from '../worldGen/seededRandom';
import type { ChallengeRating } from '../../types/dailyAlignment';
import type { Planet } from '../../types/astrology';

const OPENERS_BY_RATING: Record<ChallengeRating, string[]> = {
  very_tense: ['Heavy sky today.', "I won't sugarcoat this one.", 'This one asks something of you.'],
  tense: ['A little friction in the air.', 'Nothing dramatic, just some resistance.'],
  balanced: ['An ordinary day, astrologically speaking.', 'Nothing loud happening up there today.'],
  harmonious: ['Good sky today.', 'Things are flowing easier than usual.'],
  very_harmonious: ['Rare alignment today.', "Don't waste this one."],
};

const PLANET_FLAVOR: Record<Planet, string> = {
  sun: 'Your sense of self is front and center.',
  moon: 'Your emotional undercurrent is louder than usual.',
  mercury: 'Communication is the theme — say the thing.',
  venus: 'Connection and value are in focus.',
  mars: "There's drive here, or maybe friction. Possibly both.",
  jupiter: 'Expansion is on offer, if you take it.',
  saturn: 'Structure, limits, and the work of holding steady.',
  uranus: 'Something wants to break a pattern.',
  neptune: 'The line between clarity and fog is thin today.',
  pluto: 'Something old is asking to be looked at directly.',
  chiron: 'An old wound has something to teach, not just hurt.',
  north_node: 'A pull toward something unfamiliar but right.',
};

export function generateProceduralLine(challengeRating: ChallengeRating, focusPlanet: Planet, seed: string): string {
  const rng = createSeededRandom(`${seed}:procedural`);
  const openers = OPENERS_BY_RATING[challengeRating];
  const opener = openers[Math.floor(rng() * openers.length)]!;
  return `Astro: "${opener} ${PLANET_FLAVOR[focusPlanet]}"`;
// A closing touch whose warmth tracks the Astro Bond phase (GDD §10.4:
// Astro speaks formally as a Stranger, shows personality as a Companion,
// and mirrors emotionally as a Confidant). Phase 1 adds nothing (formal);
// higher phases sometimes add a familiar closer. Deterministic via seed.
const BOND_CLOSERS: Record<number, string[]> = {
  1: [''],
  2: ['', ' For what it’s worth, I think you’ve got this.'],
  3: ['', ' I’ve got you.', ' We’ve been at this a while now — and I mean that.'],
};

export function generateProceduralLine(
  challengeRating: ChallengeRating,
  focusPlanet: Planet,
  seed: string,
  bondPhase = 1,
): string {
  const rng = createSeededRandom(`${seed}:procedural`);
  const openers = OPENERS_BY_RATING[challengeRating];
  const opener = openers[Math.floor(rng() * openers.length)]!;

  // Phases above 3 (not reachable in this build) reuse the warmest set.
  const closers = BOND_CLOSERS[Math.min(3, Math.max(1, bondPhase))]!;
  const closer = closers[Math.floor(rng() * closers.length)]!;

  return `Astro: "${opener} ${PLANET_FLAVOR[focusPlanet]}${closer}"`;
}
