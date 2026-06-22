/**
 * The Convergence storyline — Act I: Awakening.
 *
 * GDD §11. The meta-narrative spine. The Astroverse is a cosmos in
 * crisis: twelve cycles ago the Constellation Nexus shattered in the
 * Fracture, and the player — a Starwalker — recovers the Nexus Fragments
 * hidden in each world, guided by Astro (a shard of the Nexus). "Act I:
 * Awakening (Zodiac Arcs 1–4)… the first four Zodiac Arcs each reveal one
 * Nexus Fragment and one piece of the Fracture backstory."
 *
 * A Nexus Fragment is recovered by COMPLETING a world's Arc Quest
 * (src/lib/gameLogic/arcQuests.ts). Act I's backstory therefore unfolds
 * purely as a function of how many Arcs the player has completed — no
 * separate state to store, the same derived-from-one-source approach used
 * for the currency balance and mastery tier. The four beats reveal in the
 * order Arcs are completed (Arcs may be done in any order), and the Act I
 * finale reveals once the fourth fragment is in hand.
 *
 * Pure: no I/O. src/lib/convergence.ts reads Arc progress and feeds it in.
 */

import type { ZodiacSign } from '../../types/astrology';

export interface StoryBeat {
  id: string;
  title: string;
  text: string;
}

export const ACT_I_FRAGMENTS_REQUIRED = 4;

export const ACT_I_SYNOPSIS =
  'The universe is a system in crisis. Recover the Nexus Fragments hidden in each world by completing its Arc, and piece together what shattered the cosmos — and what the Convergence will ask of you.';

// Revealed in order as the 1st…4th fragment is recovered.
export const ACT_I_BEATS: StoryBeat[] = [
  {
    id: 'act1-beat-1',
    title: 'The Crooked Sky',
    text: 'The first thing you notice is wrong before you can name it: a constellation overhead that matches no chart you were ever taught. Astro goes quiet when you point at it. “Keep walking,” is all they say.',
  },
  {
    id: 'act1-beat-2',
    title: 'Ruins Out of Time',
    text: 'In the next world, ruins that should be ancient still hum with power — abandoned moments ago and millennia ago at once. The fracture is not only in the sky. It is in time itself.',
  },
  {
    id: 'act1-beat-3',
    title: 'The Fracture',
    text: 'Astro finally says it plainly: twelve cosmic cycles ago the Constellation Nexus — the intelligence that held every star, sign, and soul in alignment — shattered in the event called the Fracture. The cosmos reformed, but imperfectly. Constellations are incomplete; worlds that should be joined drift apart.',
  },
  {
    id: 'act1-beat-4',
    title: 'What You Are',
    text: 'You are a Starwalker: a chart that resonates clearly enough to see the cracks and step between worlds. And Astro? “I am a shard of what broke,” they admit. “A piece of the Nexus, looking for the rest of itself — in you.”',
  },
];

export const ACT_I_FINALE: StoryBeat = {
  id: 'act1-finale',
  title: 'Awakening',
  text: 'Four fragments recovered, four truths faced. The Convergence is coming — the prophesied moment when the fractured cosmos could be made whole again, or deliberately kept apart. Act I ends not with an answer but with the weight of the choice ahead. You are ready to look deeper.',
};

export interface ConvergenceStatus {
  actName: string;
  synopsis: string;
  fragmentsRecovered: number;
  fragmentsRequired: number;
  recoveredSigns: ZodiacSign[];
  actComplete: boolean;
  /** Beats unlocked so far (plus the finale once the act is complete). */
  revealedBeats: StoryBeat[];
  /** The next beat still locked, with its text withheld — a teaser only. */
  nextLockedBeatIndex: number | null;
}

export function convergenceStatus(recoveredSigns: ZodiacSign[]): ConvergenceStatus {
  const fragmentsRecovered = recoveredSigns.length;
  const beatsToShow = Math.min(fragmentsRecovered, ACT_I_BEATS.length);
  const revealedBeats = ACT_I_BEATS.slice(0, beatsToShow);
  const actComplete = fragmentsRecovered >= ACT_I_FRAGMENTS_REQUIRED;
  if (actComplete) revealedBeats.push(ACT_I_FINALE);

  return {
    actName: 'Act I — Awakening',
    synopsis: ACT_I_SYNOPSIS,
    fragmentsRecovered,
    fragmentsRequired: ACT_I_FRAGMENTS_REQUIRED,
    recoveredSigns,
    actComplete,
    revealedBeats,
    nextLockedBeatIndex: actComplete ? null : beatsToShow,
  };
}
