/**
 * Natal chart assembly.
 *
 * This is THE function every other part of the system calls to get a
 * chart. Nothing above this module ever calls eclipticLongitude,
 * computeHouses, or computeAspects directly — they call computeNatalChart,
 * which composes those primitives the same way every time.
 *
 * Determinism: given identical inputs, this function returns
 * byte-identical output, every time, on every machine. There is no
 * Date.now(), no Math.random(), no I/O in this file. The only inputs are
 * the birth data the player provided at onboarding. This matters because
 * the chart is what every later procedural system (world generation,
 * Daily Alignment, quest eligibility) seeds from — if it weren't
 * deterministic, "regenerate my world" would silently produce a
 * different universe.
 */

import { PLANETS, eclipticLongitude, isRetrograde, normalizeDegrees, toJulianDay } from './positions';
import { computeHouses, signFromLongitude } from './houses';
import { computeAspects } from './aspects';
import { SIGN_ELEMENT, SIGN_MODALITY, type ZodiacSign } from './zodiac';
import type { EphemerisBody } from './positions';
import type { ChartAspect } from './aspects';

export interface NatalChartInput {
  /** YYYY-MM-DD, in the birth location's local calendar date. */
  birthDate: string;
  /** HH:MM 24-hour, local time. Undefined => solar house fallback (Bible B.2.2). */
  birthTime?: string;
  /** IANA timezone name, used to convert local time to UTC for the Julian Day calculation. */
  birthTimezone: string;
  /** Decimal degrees. Omit (with consent declined) for the timezone-only fallback. */
  birthLat?: number;
  birthLng?: number;
}

export interface PlanetPlacement {
  planet: EphemerisBody;
  /** Ecliptic longitude in degrees, 0-360. The raw astronomical fact. */
  longitude: number;
  sign: ZodiacSign;
  degreeInSign: number;
  house: number | null;
  retrograde: boolean;
}

export interface ElementalBalance {
  fire: number;
  earth: number;
  air: number;
  water: number;
}

export interface ModalBalance {
  cardinal: number;
  fixed: number;
  mutable: number;
}

export type HouseResolutionState = 'fully_resolved' | 'provisional_solar';

export interface ResolvedBirthMoment {
  julianDay: number;
  utcIso: string;
}

export interface NatalChart {
  planets: PlanetPlacement[];
  houseCusps: number[];
  ascendantLongitude: number;
  aspects: ChartAspect[];
  elementalBalance: ElementalBalance;
  modalBalance: ModalBalance;
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  risingSign: ZodiacSign | null;
  houseResolutionState: HouseResolutionState;
  resolvedBirthMoment: ResolvedBirthMoment;
}

/**
 * Convert a local civil time + IANA timezone into UTC, without relying
 * on the host environment's own local timezone (which would make this
 * function's output depend on WHERE it runs, breaking determinism for a
 * server or a different player's browser). Uses Intl's timezone offset
 * resolution, which is correct across DST transitions.
 */
function localToUtc(dateStr: string, timeStr: string, timezone: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // Construct a UTC guess, then correct by the timezone's actual offset
  // at that moment (DST-aware) using Intl.
  const utcGuess = new Date(Date.UTC(year!, month! - 1, day!, hour!, minute!));
  const offsetMinutes = getTimezoneOffsetMinutes(utcGuess, timezone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

function getTimezoneOffsetMinutes(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return (asUtc - date.getTime()) / 60_000;
}

/**
 * Resolve a player's birth data into a single deterministic moment in
 * time (Julian Day + UTC ISO string). Exported separately from
 * computeNatalChart so callers needing just the resolved moment (e.g.
 * for a "your birth moment in UTC" display) don't need a full chart
 * computation.
 */
export function resolveBirthMoment(input: NatalChartInput): ResolvedBirthMoment {
  const birthTime = input.birthTime ?? '12:00'; // GDD §2.2.1: noon is the conventional unknown-time default for Sun-sign-only charts
  const utcDate = localToUtc(input.birthDate, birthTime, input.birthTimezone);
  const julianDay = toJulianDay(
    utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate(),
    utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60,
  );
  return { julianDay, utcIso: utcDate.toISOString() };
}

function computeElementalBalance(placements: PlanetPlacement[]): ElementalBalance {
  const balance: ElementalBalance = { fire: 0, earth: 0, air: 0, water: 0 };
  for (const p of placements) {
    balance[SIGN_ELEMENT[p.sign]] += 1;
  }
  return balance;
}

function computeModalBalance(placements: PlanetPlacement[]): ModalBalance {
  const balance: ModalBalance = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of placements) {
    balance[SIGN_MODALITY[p.sign]] += 1;
  }
  return balance;
}

function findHouseForLongitude(longitude: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i]!;
    const end = cusps[(i + 1) % 12]!;
    const span = normalizeDegrees(end - start) || 360;
    const offset = normalizeDegrees(longitude - start);
    if (offset < span) return i + 1;
  }
  return 12; // unreachable in practice; safe fallback
}

/**
 * Compute a full natal chart from birth data. The single deterministic
 * entry point — see file header.
 */
export function computeNatalChart(input: NatalChartInput): NatalChart {
  const { julianDay } = resolveBirthMoment(input);
  const hasPreciseLocation = input.birthLat !== undefined && input.birthLng !== undefined;

  const houses = computeHouses({
    julianDay,
    latitude: input.birthLat,
    longitude: input.birthLng,
  });

  const planets: PlanetPlacement[] = PLANETS.map((planet) => {
    const longitude = eclipticLongitude(planet, julianDay);
    const sign = signFromLongitude(longitude);
    const degreeInSign = normalizeDegrees(longitude) % 30;
    const house = hasPreciseLocation || houses.method === 'solar_fallback'
      ? findHouseForLongitude(longitude, houses.cusps)
      : null;
    return {
      planet,
      longitude,
      sign,
      degreeInSign,
      house,
      retrograde: isRetrograde(planet, julianDay),
    };
  });

  const aspects = computeAspects(planets.map((p) => ({ planet: p.planet, longitude: p.longitude })));

  const sunPlacement = planets.find((p) => p.planet === 'sun')!;
  const moonPlacement = planets.find((p) => p.planet === 'moon')!;

  return {
    planets,
    houseCusps: houses.cusps,
    ascendantLongitude: houses.ascendantLongitude,
    aspects,
    elementalBalance: computeElementalBalance(planets),
    modalBalance: computeModalBalance(planets),
    sunSign: sunPlacement.sign,
    moonSign: moonPlacement.sign,
    risingSign: houses.method === 'placidus' ? signFromLongitude(houses.ascendantLongitude) : null,
    houseResolutionState: houses.method === 'placidus' ? 'fully_resolved' : 'provisional_solar',
    resolvedBirthMoment: resolveBirthMoment(input),
  };
}
