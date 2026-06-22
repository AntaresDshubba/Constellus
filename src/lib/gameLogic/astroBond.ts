/**
 * Astro Bond progression math.
 *
 * GDD §10.4: the player–Astro relationship moves through five phases,
 * each warming Astro's tone and unlocking content. Pure derivation of the
 * current phase and within-phase progress from a single stored value
 * (bond_points), the same one-source-of-truth pattern as Zodiac Mastery.
 *
 * Launch scope (GDD §20.1) is Bond Phases 1–3. Phases 4–5 in the GDD are
 * triggered by Arc Quests, Astro's personal quest chain, and the
 * Convergence storyline — none of which this build implements yet — so
 * they are marked locked here and earnable progress is capped at the top
 * of Phase 3. When that story content ships, raising the cap (and the
 * `locked` flags) is all this needs.
 */

export type BondPhaseKey = 'stranger' | 'companion' | 'confidant' | 'partner' | 'nexus';

export interface BondPhaseDef {
  phase: number; // 1..5
  key: BondPhaseKey;
  name: string;
  /** Cumulative bond points to have reached this phase. */
  threshold: number;
  /** The GDD narrative beat for this phase. */
  narrativeBeat: string;
  /** Phases gated behind story content this build does not implement yet. */
  locked: boolean;
}

/** Bond points granted per Daily Alignment quest completed. */
export const BOND_POINTS_PER_QUEST = 10;

/** Highest phase reachable in this build (launch scope: 1–3). */
export const LAUNCH_MAX_PHASE = 3;

export const BOND_PHASES: BondPhaseDef[] = [
  { phase: 1, key: 'stranger', name: 'Stranger', threshold: 0, locked: false,
    narrativeBeat: 'Astro is helpful but guarded, and speaks formally.' },
  { phase: 2, key: 'companion', name: 'Companion', threshold: 50, locked: false,
    narrativeBeat: 'Astro begins sharing opinions and showing personality.' },
  { phase: 3, key: 'confidant', name: 'Confidant', threshold: 300, locked: false,
    narrativeBeat: 'Astro reveals fragments of their own origin story.' },
  { phase: 4, key: 'partner', name: 'Partner', threshold: 800, locked: true,
    narrativeBeat: 'Astro’s true nature begins to emerge — unlocks with the Arc Quests to come.' },
  { phase: 5, key: 'nexus', name: 'Nexus', threshold: 1500, locked: true,
    narrativeBeat: 'Astro’s true form revealed — unlocks with the Convergence storyline to come.' },
];

// The point ceiling: one below Phase 4's threshold, so engagement alone
// can carry a player to the top of Phase 3 but no further until Phase 4
// is unlocked by story content.
export const BOND_POINTS_CAP = BOND_PHASES[LAUNCH_MAX_PHASE]!.threshold - 1;

export function clampBondPoints(points: number): number {
  return Math.max(0, Math.min(BOND_POINTS_CAP, Math.floor(points)));
}

export interface BondProgress {
  phase: number;
  key: BondPhaseKey;
  name: string;
  narrativeBeat: string;
  points: number;
  /** Points earned since reaching the current phase. */
  pointsIntoPhase: number;
  /** Points from current phase to the next, or null if next is unreachable in this build. */
  pointsForNextPhase: number | null;
  fractionToNextPhase: number;
  /** True when the player is at the highest phase reachable in this build. */
  atLaunchMax: boolean;
  /** The next phase's definition, even if locked, for "what's next" display. */
  nextPhase: BondPhaseDef | null;
}

export function bondPhaseDefFromPoints(points: number): BondPhaseDef {
  const p = clampBondPoints(points);
  let def = BOND_PHASES[0]!;
  for (const phase of BOND_PHASES) {
    if (!phase.locked && p >= phase.threshold) def = phase;
    else break;
  }
  return def;
}

export function bondProgress(points: number): BondProgress {
  const p = clampBondPoints(points);
  const current = bondPhaseDefFromPoints(p);
  const nextPhase = BOND_PHASES[current.phase] ?? null; // BOND_PHASES is 0-indexed; index === current.phase is the next one
  const atLaunchMax = current.phase >= LAUNCH_MAX_PHASE;

  if (!nextPhase || atLaunchMax) {
    return {
      phase: current.phase, key: current.key, name: current.name, narrativeBeat: current.narrativeBeat,
      points: p, pointsIntoPhase: p - current.threshold, pointsForNextPhase: null,
      fractionToNextPhase: 1, atLaunchMax: true, nextPhase: nextPhase ?? null,
    };
  }

  const span = nextPhase.threshold - current.threshold;
  const into = p - current.threshold;
  return {
    phase: current.phase, key: current.key, name: current.name, narrativeBeat: current.narrativeBeat,
    points: p, pointsIntoPhase: into, pointsForNextPhase: span,
    fractionToNextPhase: span > 0 ? into / span : 0, atLaunchMax: false, nextPhase,
  };
}
