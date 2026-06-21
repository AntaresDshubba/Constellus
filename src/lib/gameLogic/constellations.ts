/**
 * Constellation catalogue and pure status logic.
 *
 * GDD Appendix: "Constellation Drawing — connecting explored stars to
 * form constellations for passive bonuses." The catalogue is authored
 * here as code (the player's DRAWN set is the only per-player state, in
 * constellations_drawn); the groupings are the real astrological ones, so
 * the mechanic teaches genuine structure rather than arbitrary sets:
 *
 * - the four elemental TRIPLICITIES (fire/earth/air/water trines),
 * - the three modal QUADRUPLICITIES (cardinal/fixed/mutable crosses),
 * - the full zodiac WHEEL (all twelve).
 *
 * Everything here is pure: which constellations exist, whether a given
 * one is complete for a set of explored signs, the one-time reward, and
 * the ongoing passive bonus a set of drawn constellations confers. No
 * I/O — src/lib/constellations.ts owns reading explored worlds and
 * persisting draws.
 */

import type { ZodiacSign } from '../../types/astrology';

export interface Constellation {
  id: string;
  name: string;
  /** The worlds whose stars this constellation connects. */
  signs: ZodiacSign[];
  /** One-time stardust granted the first time it is drawn. */
  reward: number;
  /** Flat bonus added to each day's world-visit Mastery XP while drawn. */
  passiveVisitXpBonus: number;
  lore: string;
}

export const CONSTELLATIONS: Constellation[] = [
  // ── Elemental triplicities (trines) ──────────────────────────
  {
    id: 'fire_trine', name: 'The Fire Trine', signs: ['aries', 'leo', 'sagittarius'],
    reward: 50, passiveVisitXpBonus: 2,
    lore: 'Aries, Leo, and Sagittarius — the triplicity of flame: the spark, the blaze, and the far-cast ember.',
  },
  {
    id: 'earth_trine', name: 'The Earth Trine', signs: ['taurus', 'virgo', 'capricorn'],
    reward: 50, passiveVisitXpBonus: 2,
    lore: 'Taurus, Virgo, and Capricorn — the triplicity of soil: what is grown, what is tended, and what is built to last.',
  },
  {
    id: 'air_trine', name: 'The Air Trine', signs: ['gemini', 'libra', 'aquarius'],
    reward: 50, passiveVisitXpBonus: 2,
    lore: 'Gemini, Libra, and Aquarius — the triplicity of wind: the word, the balance, and the vision carried far.',
  },
  {
    id: 'water_trine', name: 'The Water Trine', signs: ['cancer', 'scorpio', 'pisces'],
    reward: 50, passiveVisitXpBonus: 2,
    lore: 'Cancer, Scorpio, and Pisces — the triplicity of tides: the shore, the depth, and the dream beneath both.',
  },
  // ── Modal quadruplicities (crosses) ──────────────────────────
  {
    id: 'cardinal_cross', name: 'The Cardinal Cross', signs: ['aries', 'cancer', 'libra', 'capricorn'],
    reward: 80, passiveVisitXpBonus: 3,
    lore: 'The four initiators, one at each turn of the year — the constellation of beginnings.',
  },
  {
    id: 'fixed_cross', name: 'The Fixed Cross', signs: ['taurus', 'leo', 'scorpio', 'aquarius'],
    reward: 80, passiveVisitXpBonus: 3,
    lore: 'The four sustainers, holding the middle of each season — the constellation of endurance.',
  },
  {
    id: 'mutable_cross', name: 'The Mutable Cross', signs: ['gemini', 'virgo', 'sagittarius', 'pisces'],
    reward: 80, passiveVisitXpBonus: 3,
    lore: 'The four adapters, easing each season into the next — the constellation of change.',
  },
  // ── The whole wheel ──────────────────────────────────────────
  {
    id: 'zodiac_wheel', name: 'The Complete Wheel',
    signs: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'],
    reward: 250, passiveVisitXpBonus: 5,
    lore: 'Every world explored, every star connected. The Nexus sees itself whole again.',
  },
];

export interface ConstellationStatus {
  constellation: Constellation;
  isComplete: boolean;
  /** Member signs not yet explored (empty when complete). */
  missingSigns: ZodiacSign[];
  exploredCount: number;
}

/** Status of one constellation against the set of explored (entered) worlds. */
export function constellationStatus(constellation: Constellation, exploredSigns: ReadonlySet<ZodiacSign>): ConstellationStatus {
  const missingSigns = constellation.signs.filter((s) => !exploredSigns.has(s));
  return {
    constellation,
    isComplete: missingSigns.length === 0,
    missingSigns,
    exploredCount: constellation.signs.length - missingSigns.length,
  };
}

/** Total ongoing daily-visit Mastery XP bonus from a set of drawn constellation ids. */
export function passiveVisitXpBonus(drawnIds: ReadonlySet<string>): number {
  return CONSTELLATIONS.reduce((sum, c) => (drawnIds.has(c.id) ? sum + c.passiveVisitXpBonus : sum), 0);
}

export function constellationById(id: string): Constellation | undefined {
  return CONSTELLATIONS.find((c) => c.id === id);
}
