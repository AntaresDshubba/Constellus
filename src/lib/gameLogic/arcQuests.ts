/**
 * Arc Quest catalogue and pure progression logic.
 *
 * GDD §20.1: every world has an authored Arc — an ordered quest chain.
 * The chains live here as code (the per-player progress is the only
 * stored state, in arc_progress); each step is grounded in its world's
 * landmarks (src/lib/worldGen/signWorlds.ts), so an Arc is a guided tour
 * through the world's authored places, not a generic fetch list.
 *
 * Step rewards are derived by index (arcStepReward) rather than authored
 * per step, so the content here stays focused on flavor while reward
 * tuning is centralized. A three-step Arc grants 55 bond points total,
 * which carries a player across the Bond Phase 2 threshold (50) on their
 * first completed Arc — matching the GDD trigger "Complete first Zodiac
 * Arc → Companion."
 *
 * Pure: no I/O. src/lib/arcQuests.ts owns reading/advancing progress and
 * granting the rewards this module describes.
 */

import type { ZodiacSign } from '../../types/astrology';

export interface ArcStep {
  id: string;
  title: string;
  objective: string;
}

export interface ArcQuest {
  title: string;
  steps: ArcStep[];
}

export interface ArcStepReward {
  stardust: number;
  masteryXp: number;
  bondPoints: number;
}

/** Reward for completing the step at `index` of an Arc of `total` steps. */
export function arcStepReward(index: number, total: number): ArcStepReward {
  const isFinal = index === total - 1;
  return {
    stardust: 30 + index * 20, // 30, 50, 70, …
    masteryXp: 15,
    bondPoints: isFinal ? 25 : 15, // 15 + 15 + 25 = 55 over a 3-step Arc
  };
}

export const ARC_QUESTS: Record<ZodiacSign, ArcQuest> = {
  aries: {
    title: 'The Kindling',
    steps: [
      { id: 'aries-1', title: 'First Light', objective: 'Reach The First Spark and let Ignisar’s eternal flame mark the start of your arc.' },
      { id: 'aries-2', title: 'Headlong', objective: 'Cross the Charging Grounds without slowing — Aries rewards those who commit.' },
      { id: 'aries-3', title: 'Forged', objective: 'Stand at The Ram’s Horn and claim the courage you came for.' },
    ],
  },
  taurus: {
    title: 'The Steadfast Season',
    steps: [
      { id: 'taurus-1', title: 'Rooted', objective: 'Set your weight against The Unmoved Stone and learn what will not be hurried.' },
      { id: 'taurus-2', title: 'Tended', objective: 'Walk Orchard Eternal and gather from groves that never fail.' },
      { id: 'taurus-3', title: 'Enough', objective: 'Rest at the Hearth of Plenty and feel, for once, that there is no lack.' },
    ],
  },
  gemini: {
    title: 'Two Voices',
    steps: [
      { id: 'gemini-1', title: 'Echo', objective: 'Speak at The Twin Pillars and hear yourself answered.' },
      { id: 'gemini-2', title: 'Overheard', objective: 'Listen at the Whispering Span for the word meant only for you.' },
      { id: 'gemini-3', title: 'Crossing', objective: 'Trade your story at the Crossroads of Tongues and leave changed.' },
    ],
  },
  cancer: {
    title: 'The Tide Remembers',
    steps: [
      { id: 'cancer-1', title: 'Homecoming', objective: 'Light the lantern at The Tidewatch Hearth.' },
      { id: 'cancer-2', title: 'Kept', objective: 'Enter the Hall of Keeping and face a memory the water saved.' },
      { id: 'cancer-3', title: 'Held', objective: 'Linger at The Cradle Pools until the glow softens for you.' },
    ],
  },
  leo: {
    title: 'The Seen',
    steps: [
      { id: 'leo-1', title: 'Ascend', objective: 'Climb to The Sunthrone and stand in the unbroken light.' },
      { id: 'leo-2', title: 'Roam', objective: 'Cross The Great Mane where the bold are made welcome.' },
      { id: 'leo-3', title: 'Encore', objective: 'Take the stage at the Amphitheater of Suns and let the world watch.' },
    ],
  },
  virgo: {
    title: 'The Right Order',
    steps: [
      { id: 'virgo-1', title: 'Sort', objective: 'Walk the Sorted Fields and find the pattern beneath them.' },
      { id: 'virgo-2', title: 'Remedy', objective: 'Catalogue one cure in the Apothecary Hollow.' },
      { id: 'virgo-3', title: 'Refine', objective: 'At the Threshing Stone, part what serves from what does not.' },
    ],
  },
  libra: {
    title: 'The Weighing',
    steps: [
      { id: 'libra-1', title: 'Counterpoise', objective: 'Stand on The Perfect Balance and feel it answer your weight.' },
      { id: 'libra-2', title: 'Reflect', objective: 'Pass through the Hall of Mirrors and choose the fairest true thing.' },
      { id: 'libra-3', title: 'Accord', objective: 'Broker peace at The Concord Reef where opposing winds meet.' },
    ],
  },
  scorpio: {
    title: 'The Descent',
    steps: [
      { id: 'scorpio-1', title: 'Mark', objective: 'Reach The Sting Spire where Scorpio’s energy gathers thickest.' },
      { id: 'scorpio-2', title: 'Uncover', objective: 'Read what the Drowned Archive kept from the light.' },
      { id: 'scorpio-3', title: 'Surface', objective: 'Pass the Undertow Threshold and learn what you are made of.' },
    ],
  },
  sagittarius: {
    title: 'The Long Aim',
    steps: [
      { id: 'sagittarius-1', title: 'Loose', objective: 'Find where The Aimed Arrow struck and never fell.' },
      { id: 'sagittarius-2', title: 'Survey', objective: 'From Wanderer’s Rise, see every road at once.' },
      { id: 'sagittarius-3', title: 'Depart', objective: 'Light a fire at the Beacon of the Beyond for the next traveler.' },
    ],
  },
  capricorn: {
    title: 'The Ascent',
    steps: [
      { id: 'capricorn-1', title: 'Begin the Climb', objective: 'Set foot on The Long Ascent, one lifetime’s step at a time.' },
      { id: 'capricorn-2', title: 'Endure', objective: 'Keep Saturn’s Watch where patience is the only coin.' },
      { id: 'capricorn-3', title: 'Arrive', objective: 'Reach The Earned Summit that none gain without the climbing.' },
    ],
  },
  aquarius: {
    title: 'The Signal',
    steps: [
      { id: 'aquarius-1', title: 'Charge', objective: 'Draw the sky’s fire into The Lightning Vessel.' },
      { id: 'aquarius-2', title: 'Convene', objective: 'Add your voice to the Assembly of the Many.' },
      { id: 'aquarius-3', title: 'Foresee', objective: 'Walk The Future Reef and recognize what is merely early.' },
    ],
  },
  pisces: {
    title: 'The Dissolving',
    steps: [
      { id: 'pisces-1', title: 'Wade', objective: 'Step onto The Dissolving Shore where water and air give up the line.' },
      { id: 'pisces-2', title: 'Dream', objective: 'Reach into the Cathedral of Dreams and take one drifting thought.' },
      { id: 'pisces-3', title: 'Release', objective: 'At Veil’s Edge, thin to nothing and touch everything.' },
    ],
  },
};

export interface ArcStatus {
  title: string;
  totalSteps: number;
  stepsCompleted: number;
  /** The next step to do, or null if the Arc is complete. */
  currentStep: ArcStep | null;
  isComplete: boolean;
  percent: number;
}

export function arcStatus(sign: ZodiacSign, stepsCompleted: number): ArcStatus {
  const arc = ARC_QUESTS[sign];
  const total = arc.steps.length;
  const done = Math.max(0, Math.min(total, stepsCompleted));
  return {
    title: arc.title,
    totalSteps: total,
    stepsCompleted: done,
    currentStep: done < total ? arc.steps[done]! : null,
    isComplete: done >= total,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}
