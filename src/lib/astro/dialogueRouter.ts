/**
 * Dialogue Router.
 *
 * Astro's dialogue has (at minimum) three tiers in the full product
 * vision: authored (hand-written, highest quality, situation-specific),
 * procedural (recombinant, always available, this codebase's fallback),
 * and live LLM (a real model call for open-ended conversation). Phase 2
 * deliberately implements ONLY the first two. There is no live LLM
 * integration point anywhere in this file or this codebase — adding one
 * later means adding a third tier here, not retrofitting this router's
 * existing logic.
 *
 * Selection order: try an authored line for the given situation key
 * first; if none exists, fall back to a procedural line built from the
 * Daily Alignment's challenge rating and focus planet. This means most
 * day-to-day moments (which have no specific authored situation) get a
 * procedural line, while the handful of meaningful, recognized moments
 * (first login, first world entry, etc.) get a hand-written one.
 */

import { findAuthoredLine } from './authoredDialogue';
import { generateProceduralLine } from './proceduralDialogue';
import type { ChallengeRating } from '../../types/dailyAlignment';
import type { Planet } from '../../types/astrology';

export interface DialogueContext {
  /** A specific, recognized situation key (e.g. 'first_world_entry'), or null for an ordinary day with no special moment. */
  situation: string | null;
  challengeRating: ChallengeRating;
  focusPlanet: Planet;
  /** Deterministic seed for the procedural fallback — see proceduralDialogue.ts. */
  seed: string;
  /** Current Astro Bond phase (1..5), warming the procedural tone. Defaults to 1 (Stranger). */
  bondPhase?: number;
}

export function routeDialogue(context: DialogueContext): string {
  if (context.situation) {
    const authored = findAuthoredLine(context.situation);
    if (authored) return authored.text;
  }
  return generateProceduralLine(context.challengeRating, context.focusPlanet, context.seed);
  return generateProceduralLine(context.challengeRating, context.focusPlanet, context.seed, context.bondPhase ?? 1);
}
