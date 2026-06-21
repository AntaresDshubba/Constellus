/**
 * Zodiac Mastery progression math.
 *
 * A pure derivation of mastery tier (1–10) and within-tier progress from
 * a single stored value: total mastery XP for a (player, world). No I/O,
 * no Date.now() — the data-access layer (src/lib/zodiacMastery.ts) owns
 * reading/writing XP and gating the daily earn; this module only answers
 * "given this much XP, what tier is the player and how far into it?", so
 * the tier can never be stored stale or drift out of sync with the XP it
 * is derived from (the same reasoning as the currency balance being a
 * derived sum of the ledger, never a stored mutable number).
 *
 * GDD §20.1: "ten-tier Zodiac Mastery per world."
 */

export const MAX_TIER = 10;

/** XP awarded for the first visit to a given world on a given local day. */
export const DAILY_WORLD_VISIT_XP = 10;

// Cumulative XP required to HAVE REACHED each tier. Index i holds the
// threshold for tier (i + 1); tier 1 starts at 0. The curve steepens
// gently so early tiers come quickly (a few visits) and the climb to
// tier 10 is a genuine long-tail goal (~65 daily visits at the current
// earn rate) — these are balance numbers, safe to retune without
// touching any logic that consumes them.
const TIER_THRESHOLDS = [0, 20, 50, 90, 140, 200, 280, 380, 500, 650] as const;

export interface MasteryProgress {
  /** Current tier, 1..MAX_TIER. */
  tier: number;
  /** Total accumulated XP. */
  xp: number;
  /** XP earned since reaching the current tier. */
  xpIntoTier: number;
  /** XP span from the current tier to the next, or null at max tier. */
  xpForNextTier: number | null;
  /** Fraction toward the next tier, 0..1 (1 at max tier). */
  fractionToNextTier: number;
  isMaxTier: boolean;
}

/** The tier (1..MAX_TIER) a given amount of XP corresponds to. */
export function tierForXp(xp: number): number {
  let tier = 1;
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    if (xp >= TIER_THRESHOLDS[i]!) tier = i + 1;
    else break;
  }
  return tier;
}

export function masteryProgress(xp: number): MasteryProgress {
  const safeXp = Math.max(0, Math.floor(xp));
  const tier = tierForXp(safeXp);
  const isMaxTier = tier >= MAX_TIER;

  const currentThreshold = TIER_THRESHOLDS[tier - 1]!;
  const xpIntoTier = safeXp - currentThreshold;

  if (isMaxTier) {
    return { tier: MAX_TIER, xp: safeXp, xpIntoTier, xpForNextTier: null, fractionToNextTier: 1, isMaxTier: true };
  }

  const nextThreshold = TIER_THRESHOLDS[tier]!;
  const xpForNextTier = nextThreshold - currentThreshold;
  return {
    tier,
    xp: safeXp,
    xpIntoTier,
    xpForNextTier,
    fractionToNextTier: xpForNextTier > 0 ? xpIntoTier / xpForNextTier : 0,
    isMaxTier: false,
  };
}
