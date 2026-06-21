/**
 * Star Pass season catalogue and pure status logic.
 *
 * GDD §20.1: "the first Star Pass" — a seasonal, tiered, FREE reward
 * track. The season and its tier thresholds/rewards live here as code;
 * the per-player xp and claimed tiers are the only stored state
 * (star_pass_progress / star_pass_claims). Pure: no I/O — src/lib/
 * starPass.ts owns earning xp and claiming tier rewards.
 *
 * XP is earned from the engagement the build already has: completing a
 * Daily Alignment quest (XP_PER_DAILY_QUEST) and completing an Arc step
 * (XP_PER_ARC_STEP), so the pass is a single spine the daily loop and the
 * Arcs both feed.
 */

export const XP_PER_DAILY_QUEST = 20;
export const XP_PER_ARC_STEP = 15;

export interface StarPassTier {
  tier: number;
  /** Cumulative XP to unlock this tier. */
  xpThreshold: number;
  /** Stardust granted when this tier's reward is claimed. */
  rewardStardust: number;
  label: string;
}

export interface StarPassSeason {
  id: string;
  name: string;
  tiers: StarPassTier[];
}

// Season 1. Ten tiers, thresholds escalating gently; rewards grow with
// the climb. Balance numbers — safe to retune without touching logic.
export const CURRENT_SEASON: StarPassSeason = {
  id: 'season-1',
  name: 'Season I · First Light',
  tiers: [
    { tier: 1, xpThreshold: 50, rewardStardust: 20, label: 'Stardust Cache I' },
    { tier: 2, xpThreshold: 120, rewardStardust: 25, label: 'Stardust Cache II' },
    { tier: 3, xpThreshold: 210, rewardStardust: 30, label: 'Stardust Cache III' },
    { tier: 4, xpThreshold: 320, rewardStardust: 40, label: 'Stardust Cache IV' },
    { tier: 5, xpThreshold: 450, rewardStardust: 50, label: 'Stardust Cache V' },
    { tier: 6, xpThreshold: 600, rewardStardust: 60, label: 'Stardust Cache VI' },
    { tier: 7, xpThreshold: 770, rewardStardust: 75, label: 'Stardust Cache VII' },
    { tier: 8, xpThreshold: 960, rewardStardust: 90, label: 'Stardust Cache VIII' },
    { tier: 9, xpThreshold: 1170, rewardStardust: 110, label: 'Stardust Cache IX' },
    { tier: 10, xpThreshold: 1400, rewardStardust: 150, label: 'Season Finale Cache' },
  ],
};

export interface TierView {
  tier: number;
  xpThreshold: number;
  rewardStardust: number;
  label: string;
  unlocked: boolean;
  claimed: boolean;
  /** Unlocked and not yet claimed — i.e. has a reward waiting. */
  claimable: boolean;
}

export interface StarPassStatus {
  seasonId: string;
  seasonName: string;
  xp: number;
  /** Highest unlocked tier number (0 if none yet). */
  currentTier: number;
  /** The next locked tier, or null at max. */
  nextTier: StarPassTier | null;
  xpIntoTier: number;
  xpForNextTier: number | null;
  fractionToNextTier: number;
  tiers: TierView[];
  claimableCount: number;
}

export function starPassStatus(
  xp: number,
  claimedTiers: ReadonlySet<number>,
  season: StarPassSeason = CURRENT_SEASON,
): StarPassStatus {
  const safeXp = Math.max(0, Math.floor(xp));

  const tiers: TierView[] = season.tiers.map((t) => {
    const unlocked = safeXp >= t.xpThreshold;
    const claimed = claimedTiers.has(t.tier);
    return { ...t, unlocked, claimed, claimable: unlocked && !claimed };
  });

  const currentTier = tiers.reduce((max, t) => (t.unlocked ? t.tier : max), 0);
  const nextTier = season.tiers.find((t) => safeXp < t.xpThreshold) ?? null;

  const prevThreshold = currentTier > 0 ? season.tiers[currentTier - 1]!.xpThreshold : 0;
  const xpIntoTier = safeXp - prevThreshold;
  const xpForNextTier = nextTier ? nextTier.xpThreshold - prevThreshold : null;

  return {
    seasonId: season.id,
    seasonName: season.name,
    xp: safeXp,
    currentTier,
    nextTier,
    xpIntoTier,
    xpForNextTier,
    fractionToNextTier: xpForNextTier && xpForNextTier > 0 ? Math.min(1, xpIntoTier / xpForNextTier) : 1,
    tiers,
    claimableCount: tiers.filter((t) => t.claimable).length,
  };
}

export function tierReward(tier: number, season: StarPassSeason = CURRENT_SEASON): StarPassTier | undefined {
  return season.tiers.find((t) => t.tier === tier);
}
