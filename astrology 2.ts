/**
 * Astrology domain types.
 *
 * Re-exports the zodiac vocabulary from the ephemeris engine
 * (@ephemeris/zodiac) rather than redefining it — there is exactly one
 * place the twelve sign names and their element/modality groupings are
 * defined, and the app depends on ephemeris for it, never the reverse.
 */

export { ZODIAC_SIGNS, ELEMENTS, MODALITIES, SIGN_ELEMENT, SIGN_MODALITY } from '@ephemeris/zodiac';
export type { ZodiacSign, Element, Modality } from '@ephemeris/zodiac';
export type { EphemerisBody as Planet } from '@ephemeris/positions';
export type { AspectType, ChartAspect } from '@ephemeris/aspects';
export type {
  NatalChart, NatalChartInput, PlanetPlacement, ElementalBalance, ModalBalance,
  HouseResolutionState, ResolvedBirthMoment,
} from '@ephemeris/natal';
