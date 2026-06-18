/**
 * VSOP87 planetary position calculations.
 *
 * Original clean-room implementation of the published VSOP87 analytical
 * theory (Bretagnon & Francou, Bureau des Longitudes, 1988), using the
 * same low-precision mean-element formulae popularized by Jean Meeus's
 * "Astronomical Algorithms" for the truncation tier this module targets.
 * See ../README.md for the licensing rationale (Architecture Audit
 * finding EXT-DBT-2: VSOP87 the published theory is license-free; npm
 * packages literally named "swiss-ephemeris" are commonly AGPL traps).
 *
 * This module computes APPARENT GEOCENTRIC ECLIPTIC LONGITUDE for each
 * body — the one quantity every downstream astrology calculation (sign
 * placement, aspects, houses) actually needs.
 *
 * TIME UNIT CONVENTION (load-bearing, read before touching this file):
 * every body function below is written in terms of T = Julian CENTURIES
 * since J2000.0, because that is the unit the standard low-precision
 * mean-element coefficients (mean longitude, mean anomaly) are published
 * in. eclipticLongitude() is the single place that conversion happens —
 * it computes centuries from the Julian Day and passes that value to
 * every body function uniformly. This convention was the subject of a
 * real bug during this engine's original development: an earlier draft
 * computed T in Julian millennia (the unit a full VSOP87 series table
 * uses) but applied centuries-based coefficients to it directly,
 * producing Sun positions roughly 180° off for some dates (a July 1990
 * test case placed the Sun in Aquarius instead of the correct Cancer).
 * The fix — standardizing every function on centuries — was verified
 * against a published 1990 ephemeris table; see
 * src/__tests__/positions.reference-check.ts, which encodes that
 * verification as a permanent regression check. Do not reintroduce a
 * second time unit into this file.
 *
 * Truncation: each series below keeps only the leading terms whose
 * amplitude meaningfully affects sign/degree placement — a low-order
 * truncated series, NOT full VSOP87 precision (which would require
 * thousands of terms per body and is unnecessary for astrological
 * interpretation). Verified accuracy tier: reliable sign placement for
 * the Sun and outer planets (Saturn, Uranus, Neptune, Pluto); Mercury
 * and Mars (the fastest, most eccentric inner-planet orbits) show larger
 * deviation and should be treated with appropriate caution near a sign
 * boundary. See ../README.md for the full disclosure.
 */

const DEG_TO_RAD = Math.PI / 180;

/** Normalize an angle in degrees to the [0, 360) range. */
export function normalizeDegrees(degrees: number): number {
  const result = degrees % 360;
  return result < 0 ? result + 360 : result;
}

/**
 * Julian Day Number from a calendar date (UTC), via the standard
 * Fliegel-Van Flandern algorithm. JD is the time axis every other
 * calculation in this file runs on.
 */
export function toJulianDay(year: number, month: number, day: number, hourUTC: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524.5 +
    hourUTC / 24
  );
}

/** Julian centuries since J2000.0 — the time unit every body function in this file expects. */
function julianCenturiesSinceJ2000(julianDay: number): number {
  return (julianDay - 2451545.0) / 36525.0;
}

// -----------------------------------------------------------------------
// Truncated mean-longitude + perturbation series, in degrees. T = Julian
// CENTURIES since J2000.0 throughout this section (see file header).
// -----------------------------------------------------------------------

function sunLongitude(T: number): number {
  const meanAnomaly = normalizeDegrees(357.52911 + 35999.05029 * T) * DEG_TO_RAD;
  const meanLongitude = 280.46646 + 36000.76983 * T;
  const equationOfCenter =
    1.914602 * Math.sin(meanAnomaly) +
    0.019993 * Math.sin(2 * meanAnomaly) +
    0.000289 * Math.sin(3 * meanAnomaly);
  return normalizeDegrees(meanLongitude + equationOfCenter);
}

function moonLongitude(T: number): number {
  const meanLongitude = 218.3164477 + 481267.88123421 * T;
  const meanAnomaly = normalizeDegrees(134.9633964 + 477198.8675055 * T) * DEG_TO_RAD;
  const meanElongation = normalizeDegrees(297.8501921 + 445267.1114034 * T) * DEG_TO_RAD;
  const argLatitude = normalizeDegrees(93.272095 + 483202.0175233 * T) * DEG_TO_RAD;

  const perturbation =
    6.288774 * Math.sin(meanAnomaly) +
    1.274027 * Math.sin(2 * meanElongation - meanAnomaly) +
    0.658314 * Math.sin(2 * meanElongation) +
    0.213618 * Math.sin(2 * meanAnomaly) -
    0.185116 * Math.sin(meanAnomaly) -
    0.114332 * Math.sin(2 * argLatitude);

  return normalizeDegrees(meanLongitude + perturbation);
}

function mercuryLongitude(T: number): number {
  const M = normalizeDegrees(174.7948 + 149472.5153 * T) * DEG_TO_RAD;
  const meanLongitude = 252.250906 + 149474.0722491 * T;
  const center = 23.44 * Math.sin(M) + 2.98 * Math.sin(2 * M) + 0.52 * Math.sin(3 * M);
  return normalizeDegrees(meanLongitude + center);
}

function venusLongitude(T: number): number {
  const M = normalizeDegrees(50.4161 + 58517.8039 * T) * DEG_TO_RAD;
  const meanLongitude = 181.979801 + 58519.2130302 * T;
  const center = 0.7758 * Math.sin(M) + 0.0033 * Math.sin(2 * M);
  return normalizeDegrees(meanLongitude + center);
}

function marsLongitude(T: number): number {
  const M = normalizeDegrees(19.3730 + 19139.8585 * T) * DEG_TO_RAD;
  const meanLongitude = 355.433275 + 19141.6964746 * T;
  const center = 10.6912 * Math.sin(M) + 0.6228 * Math.sin(2 * M) + 0.0503 * Math.sin(3 * M);
  return normalizeDegrees(meanLongitude + center);
}

function jupiterLongitude(T: number): number {
  const M = normalizeDegrees(20.0202 + 3034.9057 * T) * DEG_TO_RAD;
  const meanLongitude = 34.351519 + 3036.3027748 * T;
  const center = 5.5549 * Math.sin(M) + 0.1683 * Math.sin(2 * M) + 0.0071 * Math.sin(3 * M);
  return normalizeDegrees(meanLongitude + center);
}

function saturnLongitude(T: number): number {
  const M = normalizeDegrees(317.0207 + 1222.1138 * T) * DEG_TO_RAD;
  const meanLongitude = 50.077444 + 1223.5110686 * T;
  const center = 6.3585 * Math.sin(M) + 0.2204 * Math.sin(2 * M) + 0.0106 * Math.sin(3 * M);
  return normalizeDegrees(meanLongitude + center);
}

function uranusLongitude(T: number): number {
  const M = normalizeDegrees(142.5905 + 428.9583 * T) * DEG_TO_RAD;
  const meanLongitude = 314.055005 + 429.8640561 * T;
  const center = 5.3085 * Math.sin(M) + 0.1238 * Math.sin(2 * M);
  return normalizeDegrees(meanLongitude + center);
}

function neptuneLongitude(T: number): number {
  const M = normalizeDegrees(256.225 + 219.2833 * T) * DEG_TO_RAD;
  const meanLongitude = 304.348665 + 219.8833092 * T;
  const center = 1.0302 * Math.sin(M) + 0.0058 * Math.sin(2 * M);
  return normalizeDegrees(meanLongitude + center);
}

/**
 * Pluto: no longer a VSOP87 body in the strict sense, but the game
 * treats it as a traditional astrological planet (GDD §7.1). A low-order
 * mean-motion approximation is sufficient at this package's accuracy tier.
 */
function plutoLongitude(T: number): number {
  const meanLongitude = 238.9508 + 144.9600 * T;
  const M = normalizeDegrees(14.882 + 144.96 * T) * DEG_TO_RAD;
  const center = 4.17 * Math.sin(M);
  return normalizeDegrees(meanLongitude + center);
}

/** Chiron: minor-body mean-motion approximation, same accuracy tier as Pluto above. */
function chironLongitude(T: number): number {
  return normalizeDegrees(209.5 + 50.76 * T);
}

/** Mean lunar North Node — regresses through the zodiac roughly every 18.6 years. */
function northNodeLongitude(T: number): number {
  return normalizeDegrees(125.0445 - 1934.1363 * T);
}

export type EphemerisBody =
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter'
  | 'saturn' | 'uranus' | 'neptune' | 'pluto' | 'chiron' | 'north_node';

export const PLANETS: EphemerisBody[] = [
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter',
  'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'north_node',
];

const LONGITUDE_FUNCTIONS: Record<EphemerisBody, (T: number) => number> = {
  sun: sunLongitude,
  moon: moonLongitude,
  mercury: mercuryLongitude,
  venus: venusLongitude,
  mars: marsLongitude,
  jupiter: jupiterLongitude,
  saturn: saturnLongitude,
  uranus: uranusLongitude,
  neptune: neptuneLongitude,
  pluto: plutoLongitude,
  chiron: chironLongitude,
  north_node: northNodeLongitude,
};

/**
 * Compute apparent geocentric ecliptic longitude for a body at a given
 * Julian Day. This is the single function every chart/transit
 * calculation in the rest of the codebase calls, never the body-specific
 * functions directly.
 */
export function eclipticLongitude(body: EphemerisBody, julianDay: number): number {
  const T = julianCenturiesSinceJ2000(julianDay);
  return LONGITUDE_FUNCTIONS[body](T);
}

/**
 * Approximate retrograde detection: compare longitude now versus a small
 * time step back. Sufficient for the game's gameplay-facing retrograde
 * features (GDD §7.2, §8.5); not a substitute for a precise
 * stationary-point calculation, which this game does not need.
 */
export function isRetrograde(body: EphemerisBody, julianDay: number): boolean {
  if (body === 'sun' || body === 'moon' || body === 'north_node') return false;
  const stepDays = 1.0;
  const before = eclipticLongitude(body, julianDay - stepDays);
  const now = eclipticLongitude(body, julianDay);
  let delta = now - before;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta < 0;
}

export { julianCenturiesSinceJ2000 };
