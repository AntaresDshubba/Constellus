/**
 * Daily Alignment content derivation.
 *
 * The Daily Alignment has a fixed shape — cosmic weather summary, focus
 * planet, opportunity zone, a quest objective, a challenge rating, a
 * lucky element, and an astro insight. This module derives ALL of it
 * from one input (today's personal transit aspects, from
 * ./personalTransits.ts) plus a deterministic seed string, via a small
 * set of explicit rules — not an LLM call (Phase 2 explicitly excludes
 * live LLM; see src/lib/astro/dialogueRouter.ts) and not Math.random()
 * (the seed makes this reproducible for a given player+date, consistent
 * with every other procedural system in this codebase).
 *
 * This is a PURE function: no I/O, no Date.now(). The caller
 * (src/lib/dailyAlignment.ts) is responsible for fetching the snapshot,
 * computing the aspects, and persisting the result — this module only
 * decides what the content SHOULD say given those aspects.
 */

import { createSeededRandom } from '../worldGen/seededRandom';
import type { ChartAspect } from '@ephemeris/aspects';
import type { ChallengeRating } from '../../types/dailyAlignment';
import type { Planet, ZodiacSign, Element } from '../../types/astrology';
import { ZODIAC_SIGNS } from '../../types/astrology';

const TENSE_ASPECTS = new Set(['square', 'opposition']);
const HARMONIOUS_ASPECTS = new Set(['trine', 'sextile']);

const HEAVY_BODIES: Planet[] = ['saturn', 'pluto', 'mars'];
const LIGHT_BODIES: Planet[] = ['venus', 'jupiter', 'moon'];

export interface DailyAlignmentContent {
  cosmicWeatherSummary: string;
  focusPlanet: Planet;
  opportunityZone: ZodiacSign;
  questObjective: string;
  questRewardAmount: number;
  challengeRating: ChallengeRating;
  luckyElement: Element;
  astroInsight: string;
}

/**
 * Score today's aspects on a tense<->harmonious axis. Each tense aspect
 * to a heavy body adds tension; each harmonious aspect to a light body
 * adds ease. This is a deliberately simple, legible scoring rule, not a
 * claim of astrological authority — the point is a stable, explainable
 * mapping from "what aspects exist today" to "how should today feel,"
 * not a definitive interpretation.
 */
function scoreAspects(aspects: ChartAspect[]): number {
  let score = 0;
  for (const aspect of aspects) {
    const transitingBody = aspect.planetA as Planet;
    if (TENSE_ASPECTS.has(aspect.type) && HEAVY_BODIES.includes(transitingBody)) score -= 2;
    if (HARMONIOUS_ASPECTS.has(aspect.type) && LIGHT_BODIES.includes(transitingBody)) score += 2;
    if (aspect.type === 'conjunction') score += HEAVY_BODIES.includes(transitingBody) ? -1 : 1;
  }
  return score;
}

function challengeRatingFromScore(score: number): ChallengeRating {
  if (score <= -4) return 'very_tense';
  if (score <= -1) return 'tense';
  if (score <= 1) return 'balanced';
  if (score <= 4) return 'harmonious';
  return 'very_harmonious';
}

/**
 * The most exact (lowest-orb) aspect is treated as "today's defining
 * aspect" — its transiting body becomes the Focus Planet, the thing the
 * Astro Insight text and quest objective are framed around. Falls back
 * to the Moon (always present, always relevant day-to-day) if there are
 * no aspects at all, which is rare but possible on a quiet day.
 */
function deriveFocusPlanet(aspects: ChartAspect[]): Planet {
  if (aspects.length === 0) return 'moon';
  const tightest = aspects.reduce((best, a) => (a.orb < best.orb ? a : best), aspects[0]!);
  return tightest.planetA as Planet;
}

/**
 * The Opportunity Zone is a zodiac sign framed as "where today's energy
 * is best spent" — derived deterministically from the seed and focus
 * planet, giving a stable-but-not-formulaic pick rather than literally
 * always naming the focus planet's own sign.
 */
function deriveOpportunityZone(seed: string, focusPlanet: Planet): ZodiacSign {
  const rng = createSeededRandom(`${seed}:opportunity:${focusPlanet}`);
  const index = Math.floor(rng() * ZODIAC_SIGNS.length);
  return ZODIAC_SIGNS[index]!;
}

function deriveLuckyElement(seed: string): Element {
  const rng = createSeededRandom(`${seed}:element`);
  const elements: Element[] = ['fire', 'earth', 'air', 'water'];
  return elements[Math.floor(rng() * elements.length)]!;
}

const QUEST_OBJECTIVES_BY_RATING: Record<ChallengeRating, string[]> = {
  very_tense: ['Visit a landmark in Abyssia and sit with whatever feels heaviest today.', 'Spend two minutes at the Undertow Threshold before doing anything else.'],
  tense: ['Walk to the Sting Spire and notice what it stirs up.', 'Visit one biome in Abyssia you have been avoiding.'],
  balanced: ['Explore a new corner of Abyssia today.', 'Visit the Drowned Archive and read its lore.'],
  harmonious: ['Revisit your favorite spot in Abyssia.', 'Spend a few minutes in the Molting Grotto.'],
  very_harmonious: ['Celebrate today by exploring freely — nothing to fix, just wander.', 'Visit every landmark in Abyssia in one sitting.'],
};

function deriveQuestObjective(seed: string, rating: ChallengeRating): string {
  const options = QUEST_OBJECTIVES_BY_RATING[rating];
  const rng = createSeededRandom(`${seed}:quest`);
  return options[Math.floor(rng() * options.length)]!;
}

const COSMIC_WEATHER_BY_RATING: Record<ChallengeRating, string> = {
  very_tense: 'The sky is taut today — old pressure is surfacing, asking to be felt rather than fixed.',
  tense: 'Today carries some friction. Nothing urgent, just a little resistance worth noticing.',
  balanced: 'A steady, unremarkable day — good for showing up rather than for big moves.',
  harmonious: 'The sky is easy today. Things you start now tend to go smoothly.',
  very_harmonious: 'A rare, wide-open kind of day. Whatever you reach for today, reach further.',
};

const ASTRO_INSIGHT_BY_RATING: Record<ChallengeRating, string> = {
  very_tense: "Astro: \"I know this one's heavy. You don't have to resolve it today — just don't look away from it either.\"",
  tense: 'Astro: "A little friction is just information. See what it\'s pointing at."',
  balanced: 'Astro: "Some days are just days. This is one of them, and that\'s fine."',
  harmonious: 'Astro: "The sky\'s cooperating today. Worth using it."',
  very_harmonious: 'Astro: "Don\'t waste a day like this on small things."',
};

const BASE_QUEST_REWARD = 25;

/**
 * Derive the full Daily Alignment content. `seed` should be unique per
 * (player, local date) — see src/lib/dailyAlignment.ts for how that's
 * constructed — so the same player on the same day always gets the
 * same content, even if this function is called more than once before
 * the result is persisted.
 */
export function deriveDailyAlignmentContent(aspects: ChartAspect[], seed: string): DailyAlignmentContent {
  const score = scoreAspects(aspects);
  const challengeRating = challengeRatingFromScore(score);
  const focusPlanet = deriveFocusPlanet(aspects);
  const opportunityZone = deriveOpportunityZone(seed, focusPlanet);
  const luckyElement = deriveLuckyElement(seed);
  const questObjective = deriveQuestObjective(seed, challengeRating);

  // Harder days pay slightly more — a small, legible incentive not to
  // skip the loop specifically on the days it would be easiest to
  // avoid, without making tense days punishing in any other way.
  const rewardMultiplier = challengeRating === 'very_tense' ? 1.5 : challengeRating === 'tense' ? 1.2 : 1;
  const questRewardAmount = Math.round(BASE_QUEST_REWARD * rewardMultiplier);

  return {
    cosmicWeatherSummary: COSMIC_WEATHER_BY_RATING[challengeRating],
    focusPlanet,
    opportunityZone,
    questObjective,
    questRewardAmount,
    challengeRating,
    luckyElement,
    astroInsight: ASTRO_INSIGHT_BY_RATING[challengeRating],
  };
}
