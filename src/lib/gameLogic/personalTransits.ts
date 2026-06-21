/**
 * Personal transit comparison.
 *
 * The "lazy comparison" half of Technical Bible B.8.4: the global
 * transit snapshot (src/lib/worldGen/transitOverlay.ts) is the same for
 * every player, computed once; comparing it against any ONE player's
 * natal chart is cheap and player-specific, so it happens on read, not
 * pushed/precomputed per player. This is a pure function — no Supabase
 * calls, no Date.now() — so it can be called identically from a
 * request-time path and, if a batch precompute job is ever added later,
 * from that job too, without either path risking disagreement.
 */

import { computeCrossAspects } from '@ephemeris/aspects';
import { PLANETS } from '@ephemeris/positions';
import type { ChartAspect } from '@ephemeris/aspects';
import type { NatalChart } from '../../types/astrology';
import type { TransitSnapshotRow } from '../../types/world';

/**
 * Compare today's transiting planets against a natal chart's
 * placements. Returns cross-aspects where planetA is always the
 * TRANSITING body and planetB is always the NATAL body (per
 * computeCrossAspects's documented ordering), so callers can read
 * "transiting Mars square natal Sun" directly off the result without
 * re-deriving which side is which.
 */
export function computePersonalTransitAspects(
  chart: NatalChart,
  snapshot: TransitSnapshotRow,
): ChartAspect[] {
  const transitPlacements = PLANETS.map((planet) => ({
    planet,
    longitude: snapshot.positions_json[planet] ?? 0,
  }));
  const natalPlacements = chart.planets.map((p) => ({ planet: p.planet, longitude: p.longitude }));

  return computeCrossAspects(transitPlacements, natalPlacements);
}
