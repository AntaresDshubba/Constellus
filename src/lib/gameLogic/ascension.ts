/**
 * Starwalker Level + Astral Ascension — pure progression math.
 *
 * GDD §"Astral Ascension". The Starwalker Level is the prestige track:
 * the player climbs it through engagement, and at the cap may Ascend —
 * resetting the Level while keeping every other kind of progress, and
 * gaining a permanent galaxy modifier (here, a compounding bonus to
 * future Starwalker XP, so each cycle re-climbs a little faster).
 *
 * Pure: no I/O. The Level is derived from level_xp (never stored), and the
 * ascension XP multiplier is derived from the stored ascension_tier — so
 * src/lib/starwalker.ts only ever persists the two raw numbers
 * (level_xp, ascension_tier) and this module answers everything else.
 */

export const MAX_LEVEL = 30;

/** Starwalker XP granted per Daily Alignment quest / per Arc step (pre-ascension-bonus). */
export const STARWALKER_XP_PER_QUEST = 25;
export const STARWALKER_XP_PER_ARC_STEP = 15;

/** Each ascension tier adds this fraction to future Starwalker XP gains. */
export const ASCENSION_XP_BONUS_PER_TIER = 0.05;

// Cumulative XP required to REACH each level. Per-level cost rises
// linearly (level L→L+1 costs 40 + (L-1)*10), so the climb lengthens
// toward the cap. thresholds[i] is the XP to reach level (i + 1).
const THRESHOLDS: number[] = (() => {
  const t = [0];
  let total = 0;
  for (let level = 1; level < MAX_LEVEL; level++) {
    total += 40 + (level - 1) * 10;
    t.push(total);
  }
  return t;
})();

export function levelFromXp(xp: number): number {
  const safe = Math.max(0, Math.floor(xp));
  let level = 1;
  for (let i = 0; i < THRESHOLDS.length; i++) {
    if (safe >= THRESHOLDS[i]!) level = i + 1;
    else break;
  }
  return level;
}

/** Multiplier applied to Starwalker XP gains for a given ascension tier. */
export function ascensionXpMultiplier(tier: number): number {
  return 1 + Math.max(0, tier) * ASCENSION_XP_BONUS_PER_TIER;
}

/** Flavor name for the permanent galaxy modifier at a given tier. */
export function galaxyModifierName(tier: number): string {
  if (tier <= 0) return 'Unascended';
  return `Ascendant ${'★'.repeat(Math.min(tier, 5))}${tier > 5 ? ` ×${tier}` : ''}`;
}

export interface StarwalkerStatus {
  level: number;
  maxLevel: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  fractionToNextLevel: number;
  atMaxLevel: boolean;
  /** True when the player may Ascend (at the level cap). */
  canAscend: boolean;
  ascensionTier: number;
  galaxyModifier: string;
  /** Percent bonus to Starwalker XP from ascensions (e.g. 10 for +10%). */
  ascensionBonusPct: number;
}

export function starwalkerStatus(levelXp: number, ascensionTier: number): StarwalkerStatus {
  const xp = Math.max(0, Math.floor(levelXp));
  const level = levelFromXp(xp);
  const atMaxLevel = level >= MAX_LEVEL;

  const currentThreshold = THRESHOLDS[level - 1]!;
  const xpIntoLevel = xp - currentThreshold;
  const xpForNextLevel = atMaxLevel ? null : THRESHOLDS[level]! - currentThreshold;

  return {
    level,
    maxLevel: MAX_LEVEL,
    xp,
    xpIntoLevel,
    xpForNextLevel,
    fractionToNextLevel: xpForNextLevel && xpForNextLevel > 0 ? Math.min(1, xpIntoLevel / xpForNextLevel) : 1,
    atMaxLevel,
    canAscend: atMaxLevel,
    ascensionTier,
    galaxyModifier: galaxyModifierName(ascensionTier),
    ascensionBonusPct: Math.round(ascensionTier * ASCENSION_XP_BONUS_PER_TIER * 100),
  };
}
