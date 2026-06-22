/**
 * Transit Overlay framework.
 *
 * Technical Bible B.8.4: planetary positions on a given UTC date are
 * identical for every player, so they are computed and cached ONCE in
 * transit_snapshots, never per-user, never per-request. This file's
 * getGlobalTransitSnapshot is the only function that should ever call
 * computeGlobalTransitSnapshot — every other caller reads through this
 * cache.
 *
 * compositeOverlay is the second half: given a Base Layer world and
 * today's snapshot, derive a small set of OverlayOperations (ambient
 * tint, a spawned marker, a pulsing landmark) that the renderer applies
 * ON TOP OF the Base Layer's geometry without ever mutating the stored
 * world_json. This is "framework" in the literal sense for this phase —
 * Phase 1 implements the plumbing (cache, fetch-or-compute, a
 * deterministic compositing function) and a set of real operation types,
 * not the full richness of every possible transit effect; later phases
 * add more operation types without changing this shape.
 *
 * Operations come in two flavors. The retrograde-driven ones
 * (pulse_landmark / tint_ambient / spawn_marker) react to the day's
 * planetary motion. The two added later — lunar_glow and sign_resonance —
 * make the world reflect facts the snapshot already carries but the early
 * phase ignored: the Moon's phase (how much moonlight there is) and which
 * bodies are currently transiting THIS world's own zodiac sign (a
 * per-world "the sky is touching you today" highlight that changes as
 * planets move between signs).
 */

import { supabase } from '../supabaseClient';
import { PLANETS, eclipticLongitude, isRetrograde, toJulianDay } from '@ephemeris/positions';
import { signFromLongitude } from '@ephemeris/houses';
import type { TransitSnapshotRow, OverlayOperation, OverlayCompositeResult, WorldDescriptor } from '../../types/world';
import type { EphemerisBody } from '@ephemeris/positions';

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function computeMoonPhaseFraction(sunLongitude: number, moonLongitude: number): number {
  const elongation = ((moonLongitude - sunLongitude) % 360 + 360) % 360;
  return elongation / 360;
}

/**
 * Compute the day's planetary positions. Pure with respect to its date
 * input — exists separately from getGlobalTransitSnapshot so the pure
 * computation and the caching wrapper around it are testable/reasoned
 * about independently, mirroring the same split the ephemeris package
 * itself keeps between math and I/O.
 */
function computeSnapshotForDate(utcDate: string): Omit<TransitSnapshotRow, 'computed_at'> {
  const [year, month, day] = utcDate.split('-').map(Number) as [number, number, number];
  const julianDay = toJulianDay(year, month, day, 0);

  const positions: Record<string, number> = {};
  const retrogradeBodies: string[] = [];
  for (const planet of PLANETS) {
    positions[planet] = eclipticLongitude(planet, julianDay);
    if (isRetrograde(planet, julianDay)) retrogradeBodies.push(planet);
  }

  return {
    snapshot_date: utcDate,
    positions_json: positions,
    retrograde_bodies: retrogradeBodies,
    lunar_phase_fraction: computeMoonPhaseFraction(positions.sun!, positions.moon!),
  };
}

/**
 * Get today's global transit snapshot, computing and caching it only if
 * it doesn't already exist. Every player who calls this on the same UTC
 * date gets the same row — there is no per-user branch in this function
 * at all.
 */
export async function getGlobalTransitSnapshot(): Promise<TransitSnapshotRow> {
  const utcDate = todayUtcDateString();

  const { data: existing, error: selectError } = await supabase
    .from('transit_snapshots')
    .select('*')
    .eq('snapshot_date', utcDate)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;

  const computed = computeSnapshotForDate(utcDate);

  // Insert, tolerating a race with another client computing the same
  // date's snapshot concurrently — whichever insert lands first wins,
  // and the loser just re-reads rather than erroring, since both would
  // have computed the identical row anyway (computeSnapshotForDate is
  // pure).
  const { error: insertError } = await supabase.from('transit_snapshots').insert(computed);
  if (insertError && insertError.code !== '23505') { // 23505 = unique_violation; expected under a race, not a real failure
    throw insertError;
  }

  const { data: row, error: rereadError } = await supabase
    .from('transit_snapshots')
    .select('*')
    .eq('snapshot_date', utcDate)
    .single();
  if (rereadError) throw rereadError;
  return row;
}

const HARMONIOUS_BODIES: EphemerisBody[] = ['venus', 'jupiter'];
const TENSE_BODIES: EphemerisBody[] = ['mars', 'saturn', 'pluto'];

/**
 * Derive a small set of overlay operations from today's snapshot,
 * applied against a specific world. This phase's compositing rule is
 * intentionally simple and legible: a retrograde harmonious body tints
 * the ambient color toward warmth, a retrograde tense body pulses the
 * world's first landmark as a "something is stirring" signal, and a
 * non-retrograde day spawns a small ambient marker at the nearest biome
 * to the Moon's current zodiac position. This is a real, working
 * compositing function, not a placeholder — but the SET of operation
 * types it can produce is deliberately small for this phase; richer
 * transit storytelling is additive on top of this same OverlayOperation
 * shape, not a breaking change to it.
 */
export function compositeOverlay(world: WorldDescriptor, snapshot: TransitSnapshotRow): OverlayCompositeResult {
  const operations: OverlayOperation[] = [];

  const retrogradeHarmonious = HARMONIOUS_BODIES.filter((b) => snapshot.retrograde_bodies.includes(b));
  const retrogradeTense = TENSE_BODIES.filter((b) => snapshot.retrograde_bodies.includes(b));

  if (retrogradeTense.length > 0 && world.landmarks.length > 0) {
    operations.push({
      type: 'pulse_landmark',
      targetBiomeId: null,
      payload: { landmarkId: world.landmarks[0]!.id, bodies: retrogradeTense },
    });
  }

  if (retrogradeHarmonious.length > 0) {
    operations.push({
      type: 'tint_ambient',
      targetBiomeId: null,
      payload: { towardHex: '#3a1f4d', bodies: retrogradeHarmonious },
    });
  }

  if (retrogradeTense.length === 0 && retrogradeHarmonious.length === 0 && world.biomes.length > 0) {
    // A calm day: spawn a small marker at the world's first biome as a
    // gentle "today is unremarkable, and that's fine" signal, rather
    // than leaving the overlay empty — an empty overlay on a calm day
    // would look identical to a bug that failed to compute anything.
    operations.push({
      type: 'spawn_marker',
      targetBiomeId: world.biomes[0]!.id,
      payload: { markerKind: 'calm_day' },
    });
  }

  // Moonlight: how lit the world's sky is tracks the Moon's phase. The
  // illuminated fraction comes straight from the snapshot's cached
  // lunar_phase_fraction (0 = new → dark, 0.5 = full → brightest), so this
  // is the same moon the Lunar Cycle uses, reflected in the world itself.
  const illuminated = (1 - Math.cos(snapshot.lunar_phase_fraction * 2 * Math.PI)) / 2;
  operations.push({
    type: 'lunar_glow',
    targetBiomeId: null,
    payload: { intensity: Math.round(illuminated * 100) / 100, colorHex: '#cdd6ff' },
  });

  // Sign resonance: which bodies are currently transiting THIS world's
  // own sign. Changes day to day as planets move, and differs per world —
  // a real connection between the live sky and the place the player stands.
  const resonatingBodies = Object.entries(snapshot.positions_json)
    .filter(([, longitude]) => signFromLongitude(longitude) === world.zodiacSign)
    .map(([body]) => body);
  if (resonatingBodies.length > 0) {
    operations.push({
      type: 'sign_resonance',
      targetBiomeId: null,
      payload: { bodies: resonatingBodies, sign: world.zodiacSign },
    });
  }

  return { appliedOperations: operations, snapshotDate: snapshot.snapshot_date };
}
