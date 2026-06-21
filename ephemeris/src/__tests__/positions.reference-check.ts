/**
 * Reference cross-check against a published ephemeris.
 *
 * Run with: npm run verify:ephemeris
 *
 * Reference values are sign placements read from a published 1990
 * ephemeris table (signsbystars.com, July 1990), cross-checked manually
 * during this engine's original development. Checks SIGN placement only
 * (not exact degree), since that is the precision this engine's
 * low-order truncation tier is verified to — see ../../README.md.
 */

import { eclipticLongitude, toJulianDay, normalizeDegrees } from '../positions';
import type { EphemerisBody } from '../positions';

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

function signOf(longitude: number): string {
  return SIGNS[Math.floor(normalizeDegrees(longitude) / 30)]!;
}

interface ReferenceCase {
  label: string;
  julianDay: number;
  expected: Partial<Record<EphemerisBody, string>>;
}

// Slow bodies only (Sun, Saturn, Uranus, Neptune, Pluto), since their
// sign rarely changes within a month, making them a robust cross-check
// against a once-per-month reference table. Mercury and Mars are
// intentionally NOT asserted here, per the README's disclosed
// limitation for fast inner-planet bodies.
const REFERENCE_CASES: ReferenceCase[] = [
  {
    label: '1990-07-15: slow-moving bodies vs. published ephemeris',
    julianDay: toJulianDay(1990, 7, 15, 12.0),
    expected: {
      sun: 'Cancer',
      saturn: 'Capricorn',
      uranus: 'Capricorn',
      neptune: 'Capricorn',
      pluto: 'Scorpio',
    },
  },
];

let failures = 0;

for (const testCase of REFERENCE_CASES) {
  console.log(`\n${testCase.label}`);
  for (const [body, expectedSign] of Object.entries(testCase.expected)) {
    const longitude = eclipticLongitude(body as EphemerisBody, testCase.julianDay);
    const actualSign = signOf(longitude);
    const pass = actualSign === expectedSign;
    if (!pass) failures++;
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${body.padEnd(10)} expected=${expectedSign.padEnd(11)} actual=${actualSign} (${longitude.toFixed(2)}°)`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} reference check(s) FAILED. Do not ship a positions.ts change that fails this script.`);
  process.exit(1);
} else {
  console.log('\nAll reference checks passed.');
}
