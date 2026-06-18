/**
 * Momentum.
 *
 * Built INSTEAD OF a streak mechanic, not as a streak with softer
 * framing — the actual behavioral difference, not just the name, is
 * what matters here:
 *
 * - A punitive streak resets to ZERO the moment a single day is missed,
 *   no matter how long the streak was. This product should never ship
 *   that, even temporarily.
 * - Momentum instead DECAYS gradually on a missed day (a flat amount,
 *   not all of it), and a small bank of "protected" days absorbs a
 *   short gap (e.g. one bad week) with NO decay at all. Missing one day
 *   after a long history of engagement costs little; missing many days
 *   in a row costs more, but always gradually, never in one cliff-edge
 *   reset.
 *
 * This is a pure function of (stored state, current date) — there is no
 * background job ticking momentum down over time. Each time momentum is
 * read or updated, recalculateMomentum() catches it up to the present
 * based on how many days have actually passed since last_engaged_date,
 * which means the math is correct whether the player checks in daily or
 * returns after a month away, with no scheduled process required.
 */

import type { MomentumRow } from '../../types/progression';

const MAX_MOMENTUM = 100;
const ENGAGEMENT_GAIN = 8;
const DECAY_PER_MISSED_DAY = 4; // flat amount lost per unprotected missed day, not a percentage — keeps the math simple and predictable for the player
const CONSECUTIVE_DAYS_TO_EARN_PROTECTED_DAY = 7;
const MAX_PROTECTED_DAYS = 3;

export interface MomentumState {
  currentValue: number;
  protectedDaysLeft: number;
  lastEngagedDate: string | null; // YYYY-MM-DD
  /** Consecutive days engaged with no gap, used only to grant protected days back — never decays the player's currentValue itself. */
  consecutiveEngagedDays: number;
}

function daysBetween(earlier: string, later: string): number {
  const a = new Date(`${earlier}T00:00:00Z`).getTime();
  const b = new Date(`${later}T00:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Catch up a stored Momentum state to the given "today" date, applying
 * decay for any missed days since last_engaged_date — but NOT recording
 * today's engagement itself (see recordEngagement for that). Called
 * before any read of momentum that the player will see, so a player who
 * has been away always sees an accurate, already-decayed value rather
 * than a stale one that only updates the next time they engage.
 */
export function recalculateMomentum(state: MomentumState, today: string): MomentumState {
  if (!state.lastEngagedDate) return state; // never engaged yet; nothing to decay

  const missedDays = daysBetween(state.lastEngagedDate, today) - 1; // the day of last engagement itself doesn't count as missed
  if (missedDays <= 0) return state;

  let protectedRemaining = state.protectedDaysLeft;
  let unprotectedMissedDays = missedDays;
  if (protectedRemaining > 0) {
    const absorbed = Math.min(protectedRemaining, missedDays);
    protectedRemaining -= absorbed;
    unprotectedMissedDays -= absorbed;
  }

  const decayed = Math.max(0, state.currentValue - unprotectedMissedDays * DECAY_PER_MISSED_DAY);

  return {
    currentValue: decayed,
    protectedDaysLeft: protectedRemaining,
    lastEngagedDate: state.lastEngagedDate, // unchanged — only recordEngagement advances this
    consecutiveEngagedDays: 0, // any missed day breaks the consecutive-engagement count used to earn NEW protected days, even though it does not reset currentValue itself
  };
}

/**
 * Record that the player engaged with the Daily Minimum loop today.
 * Should be called AFTER recalculateMomentum has already caught the
 * state up to today, so the gain applies to an accurate baseline rather
 * than stacking on top of stale decay.
 */
export function recordEngagement(state: MomentumState, today: string): MomentumState {
  const isConsecutiveDay = state.lastEngagedDate !== null && daysBetween(state.lastEngagedDate, today) === 1;
  const consecutiveEngagedDays = isConsecutiveDay ? state.consecutiveEngagedDays + 1 : 1;

  // Earn one protected day back for every full week of consecutive
  // engagement, capped — this is what lets a player who has been
  // consistent "bank" some slack for a future gap, rather than
  // protected days being a one-time-only grant.
  const earnedProtectedDay = consecutiveEngagedDays > 0 && consecutiveEngagedDays % CONSECUTIVE_DAYS_TO_EARN_PROTECTED_DAY === 0;

  return {
    currentValue: Math.min(MAX_MOMENTUM, state.currentValue + ENGAGEMENT_GAIN),
    protectedDaysLeft: earnedProtectedDay
      ? Math.min(MAX_PROTECTED_DAYS, state.protectedDaysLeft + 1)
      : state.protectedDaysLeft,
    lastEngagedDate: today,
    consecutiveEngagedDays,
  };
}

export function momentumStateFromRow(row: MomentumRow): MomentumState {
  return {
    currentValue: row.current_value,
    protectedDaysLeft: row.protected_days_left,
    lastEngagedDate: row.last_engaged_date,
    consecutiveEngagedDays: row.consecutive_engaged_days,
  };
}
