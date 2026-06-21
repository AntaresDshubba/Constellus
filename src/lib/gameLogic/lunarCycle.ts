/**
 * Lunar cycle phases.
 *
 * GDD §"Lunar Cycle": the moon's phase shapes the day's tone and rewards
 * across five named phases — Seed (new moon), Growth (waxing),
 * Bloom (toward full, rewards peak), Harvest (waning gibbous), and
 * Rest (waning crescent, quiet/reflective).
 *
 * The input is the SAME `lunar_phase_fraction` already computed and
 * cached in every transit_snapshots row (src/lib/worldGen/transitOverlay.ts:
 * elongation between Sun and Moon, 0 = new, 0.5 = full, →1 = back to new).
 * There is no second moon computation anywhere — this is a pure mapping
 * from that one cached fact to a phase, its illuminated fraction, its
 * thematic emphasis, and a reward multiplier the Daily Alignment uses.
 */

export type LunarPhase = 'seed' | 'growth' | 'bloom' | 'harvest' | 'rest';

export interface LunarPhaseInfo {
  phase: LunarPhase;
  name: string;
  /** Illuminated fraction of the disc, 0..100 (0 = new, 100 = full). */
  illuminationPct: number;
  /** One-line emphasis for the phase, surfaced to the player. */
  emphasis: string;
  /** Multiplier applied to the Daily Alignment quest reward; peaks at Bloom. */
  rewardMultiplier: number;
}

const PHASE_META: Record<LunarPhase, Omit<LunarPhaseInfo, 'illuminationPct'>> = {
  seed: { phase: 'seed', name: 'New Moon · Seed', emphasis: 'A quiet beginning — set intentions; new mysteries stir.', rewardMultiplier: 1.0 },
  growth: { phase: 'growth', name: 'Waxing · Growth', emphasis: 'Momentum builds — what you tend now begins to grow.', rewardMultiplier: 1.1 },
  bloom: { phase: 'bloom', name: 'Full Moon · Bloom', emphasis: 'Peak energy — all rewards are at their fullest.', rewardMultiplier: 1.25 },
  harvest: { phase: 'harvest', name: 'Waning · Harvest', emphasis: 'Time to gather — collect what the cycle has grown.', rewardMultiplier: 1.15 },
  rest: { phase: 'rest', name: 'Waning Crescent · Rest', emphasis: 'A reflective lull — lore deepens; prepare for the next cycle.', rewardMultiplier: 1.0 },
};

function phaseFromFraction(fraction: number): LunarPhase {
  // Normalize defensively into [0, 1); the eight standard lunar octants
  // collapse onto the GDD's five phases. New moon owns the wrap-around
  // window on both ends.
  const f = ((fraction % 1) + 1) % 1;
  if (f < 0.0625 || f >= 0.9375) return 'seed';   // new moon
  if (f < 0.3125) return 'growth';                // waxing crescent + first quarter
  if (f < 0.5625) return 'bloom';                 // waxing gibbous + full
  if (f < 0.8125) return 'harvest';               // waning gibbous + last quarter
  return 'rest';                                  // waning crescent
}

export function lunarPhaseFromFraction(fraction: number): LunarPhaseInfo {
  const f = ((fraction % 1) + 1) % 1;
  // Illuminated fraction of the disc from the phase angle (elongation).
  const illuminationPct = Math.round(((1 - Math.cos(f * 2 * Math.PI)) / 2) * 100);
  return { ...PHASE_META[phaseFromFraction(f)], illuminationPct };
}
