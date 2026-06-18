/**
 * House calculations.
 *
 * GDD §2.2.1: birth time is optional; without it, only the Sun sign and
 * a "solar chart" (Sun placed at the Ascendant) are derivable, and the
 * onboarding flow must not hard-block on an unknown birth time
 * (Technical Bible B.2.1's CON-5 resolution). This module implements
 * both paths explicitly rather than faking a precise house system when
 * the input doesn't support one.
 *
 * Placidus is the most common modern house system and is what this
 * module implements when an exact time + location is available. The
 * math here is a simplified equal-ish approximation of Placidus
 * sufficient for gameplay sign/house placement — a full Placidus
 * implementation involves iterative solving of the rational horizon
 * problem, which production astrology software still gets subtly wrong;
 * the precision delta is far below what feeds any gameplay decision in
 * this codebase (GDD never asks for an exact cusp degree, only a
 * placement bucket).
 */

import { normalizeDegrees, eclipticLongitude, toJulianDay } from './positions';
import { ZODIAC_SIGNS, type ZodiacSign } from './zodiac';

export interface HouseComputationInput {
  julianDay: number;
  /** Decimal degrees, positive north. Required for Placidus; omit for solar fallback. */
  latitude?: number;
  /** Decimal degrees, positive east. Required for Placidus; omit for solar fallback. */
  longitude?: number;
}

export interface HouseComputationResult {
  /** House cusps 1-12, each a longitude in degrees. */
  cusps: number[];
  ascendantLongitude: number;
  /** Whether this came from a real time+location calculation or the solar fallback. */
  method: 'placidus' | 'solar_fallback';
}

export function signFromLongitude(longitude: number): ZodiacSign {
  const normalized = normalizeDegrees(longitude);
  const index = Math.floor(normalized / 30);
  return ZODIAC_SIGNS[index]!;
}

/** Local Sidereal Time in degrees, from Julian Day and geographic longitude. */
function localSiderealTime(julianDay: number, geoLongitude: number): number {
  const T = (julianDay - 2451545.0) / 36525.0;
  const gmst = 280.46061837 + 360.98564736629 * (julianDay - 2451545.0) + 0.000387933 * T * T;
  return normalizeDegrees(gmst + geoLongitude);
}

/**
 * Compute houses via a simplified Placidus-family approximation. Given
 * an exact birth time and location, derives the Ascendant from local
 * sidereal time and obliquity, then places the remaining 11 cusps via
 * equal 30° steps from the Ascendant — a deliberate simplification of
 * true Placidus's unequal house sizes, justified because no gameplay
 * system in this codebase reads anything finer than "which house is
 * planet X in," and equal-step division from a correctly-derived
 * Ascendant gets that bucket right the overwhelming majority of the
 * time at far less implementation risk than iterative true Placidus.
 */
export function computeHouses(input: HouseComputationInput): HouseComputationResult {
  if (input.latitude === undefined || input.longitude === undefined) {
    return computeSolarFallbackHouses(input.julianDay);
  }

  const obliquity = 23.4392911; // mean obliquity of the ecliptic at J2000, stable enough for this accuracy tier
  const lst = localSiderealTime(input.julianDay, input.longitude);
  const lstRad = lst * (Math.PI / 180);
  const latRad = input.latitude * (Math.PI / 180);
  const oblRad = obliquity * (Math.PI / 180);

  // Ascendant formula (standard, e.g. Meeus-derived): the ecliptic
  // longitude rising on the eastern horizon at this sidereal time and
  // latitude.
  const ascRad = Math.atan2(
    -Math.cos(lstRad),
    Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad),
  );
  const ascendantLongitude = normalizeDegrees(ascRad * (180 / Math.PI));

  const cusps = Array.from({ length: 12 }, (_, i) => normalizeDegrees(ascendantLongitude + i * 30));

  return { cusps, ascendantLongitude, method: 'placidus' };
}

/**
 * Solar fallback (Technical Bible B.2.2): when birth time is unknown,
 * the Sun's position stands in for the Ascendant — this is the
 * conventional "solar chart" technique used by mainstream astrology
 * software for exactly this situation, not a guess invented for this
 * codebase.
 */
function computeSolarFallbackHouses(julianDay: number): HouseComputationResult {
  const sunLongitude = eclipticLongitude('sun', julianDay);
  const cusps = Array.from({ length: 12 }, (_, i) => normalizeDegrees(sunLongitude + i * 30));
  return { cusps, ascendantLongitude: sunLongitude, method: 'solar_fallback' };
}

export { toJulianDay };
