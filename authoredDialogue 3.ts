/**
 * Astro's authored dialogue tier.
 *
 * The highest-priority, highest-quality tier: hand-written lines for
 * specific, recognized situations (first visit, milestone moments).
 * These take priority over the procedural tier whenever a situation
 * matches one — see ../dialogueRouter.ts for the actual selection
 * logic. This file holds ONLY the authored content; it has no
 * selection logic of its own.
 */

export interface AuthoredLine {
  situation: string;
  text: string;
}

export const AUTHORED_LINES: AuthoredLine[] = [
  {
    situation: 'first_ever_login',
    text: 'Astro: "There you are. I\'ve been waiting for someone with your particular sky."',
  },
  {
    situation: 'first_daily_alignment',
    text: 'Astro: "This is the first of many. Some days I\'ll have a lot to say. Today, just: welcome."',
  },
  {
    situation: 'first_world_entry',
    text: 'Astro: "Abyssia doesn\'t open for everyone. It opened for you."',
  },
  {
    situation: 'momentum_recovered_after_gap',
    text: 'Astro: "You were gone a few days. The sky kept moving, but so did your Momentum — it\'s still warm. Pick back up whenever."',
  },
  {
    situation: 'momentum_milestone_50',
    text: 'Astro: "Fifty. That\'s not nothing. I notice."',
  },
];

export function findAuthoredLine(situation: string): AuthoredLine | null {
  return AUTHORED_LINES.find((line) => line.situation === situation) ?? null;
}
