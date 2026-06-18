/**
 * Zodiac constants.
 *
 * This is the one place the twelve sign names, their order, and their
 * element/modality groupings are defined. Both the ephemeris engine
 * (sign-from-longitude lookups) and the app's gameplay types
 * (src/types/astrology.ts re-exports from here) depend on this file,
 * never the other way around — ephemeris stays a self-contained,
 * zero-app-dependency package this way, consistent with how it's
 * licensed and audited independently (see ../README.md).
 */

export const ZODIAC_SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;
export type ZodiacSign = typeof ZODIAC_SIGNS[number];

export const ELEMENTS = ['fire', 'earth', 'air', 'water'] as const;
export type Element = typeof ELEMENTS[number];

export const MODALITIES = ['cardinal', 'fixed', 'mutable'] as const;
export type Modality = typeof MODALITIES[number];

export const SIGN_ELEMENT: Record<ZodiacSign, Element> = {
  aries: 'fire', leo: 'fire', sagittarius: 'fire',
  taurus: 'earth', virgo: 'earth', capricorn: 'earth',
  gemini: 'air', libra: 'air', aquarius: 'air',
  cancer: 'water', scorpio: 'water', pisces: 'water',
};

export const SIGN_MODALITY: Record<ZodiacSign, Modality> = {
  aries: 'cardinal', cancer: 'cardinal', libra: 'cardinal', capricorn: 'cardinal',
  taurus: 'fixed', leo: 'fixed', scorpio: 'fixed', aquarius: 'fixed',
  gemini: 'mutable', virgo: 'mutable', sagittarius: 'mutable', pisces: 'mutable',
};
