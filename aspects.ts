/**
 * Aspect calculation.
 *
 * GDD §2.1.2: "all major aspects (conjunction, sextile, square, trine,
 * opposition) within standard orb tolerances." This module computes the
 * angular separation between every pair of placed planets and classifies
 * it against the standard orb table below.
 */

export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

export interface PlanetPlacement {
  planet: string;
  longitude: number;
}

export interface ChartAspect {
  planetA: string;
  planetB: string;
  type: AspectType;
  orb: number;
}

/** Standard exact-angle and orb-tolerance table for the five major aspects. */
const ASPECT_DEFINITIONS: Array<{ type: AspectType; exactAngle: number; orb: number }> = [
  { type: 'conjunction', exactAngle: 0, orb: 8 },
  { type: 'sextile', exactAngle: 60, orb: 4 },
  { type: 'square', exactAngle: 90, orb: 7 },
  { type: 'trine', exactAngle: 120, orb: 7 },
  { type: 'opposition', exactAngle: 180, orb: 8 },
];

export function angularSeparation(lonA: number, lonB: number): number {
  const diff = Math.abs(lonA - lonB) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Compute every major aspect between the given planet placements. Returns
 * one ChartAspect per qualifying pair — a pair may match at most one
 * aspect type (the tightest-fitting one).
 */
export function computeAspects(placements: PlanetPlacement[]): ChartAspect[] {
  const aspects: ChartAspect[] = [];

  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i]!;
      const b = placements[j]!;
      const separation = angularSeparation(a.longitude, b.longitude);

      let best: { type: AspectType; orb: number } | null = null;
      for (const def of ASPECT_DEFINITIONS) {
        const orb = Math.abs(separation - def.exactAngle);
        if (orb <= def.orb && (best === null || orb < best.orb)) {
          best = { type: def.type, orb };
        }
      }

      if (best) {
        aspects.push({ planetA: a.planet, planetB: b.planet, type: best.type, orb: best.orb });
      }
    }
  }

  return aspects;
}

/**
 * Compute aspects BETWEEN two distinct sets of placements — e.g. today's
 * transiting planets against a player's natal placements — rather than
 * within a single set. This is the function Phase 2's Daily Alignment
 * derivation needs: computeAspects(natal.concat(transit)) would be
 * wrong, since it would also report natal-vs-natal and
 * transit-vs-transit pairs the caller doesn't want mixed in with the
 * personal comparison. planetA is always drawn from `setA` (conventionally
 * the transiting/current set) and planetB from `setB` (conventionally
 * the natal set), so callers can rely on that ordering rather than
 * checking which set each result came from.
 */
export function computeCrossAspects(setA: PlanetPlacement[], setB: PlanetPlacement[]): ChartAspect[] {
  const aspects: ChartAspect[] = [];

  for (const a of setA) {
    for (const b of setB) {
      const separation = angularSeparation(a.longitude, b.longitude);

      let best: { type: AspectType; orb: number } | null = null;
      for (const def of ASPECT_DEFINITIONS) {
        const orb = Math.abs(separation - def.exactAngle);
        if (orb <= def.orb && (best === null || orb < best.orb)) {
          best = { type: def.type, orb };
        }
      }

      if (best) {
        aspects.push({ planetA: a.planet, planetB: b.planet, type: best.type, orb: best.orb });
      }
    }
  }

  return aspects;
}
