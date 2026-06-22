/**
 * Per-sign world content profiles.
 *
 * This is where the SIGN-SPECIFIC content for all twelve zodiac worlds
 * lives — world name, theme, the four biome archetypes that make it up,
 * its ambient color, and its four authored landmarks. The GENERIC
 * generation algorithm that turns a profile + a seed into a deterministic
 * WorldDescriptor lives in ./generateWorld.ts; this file holds only the
 * content, so adding richer content for a sign never touches the
 * generation logic and vice versa.
 *
 * Thematic grounding: each world is built from the sign's traditional
 * associations — its element (fire/earth/air/water), its ruling planet,
 * and its symbol — exactly the way Scorpio's Abyssia was (a fixed-water
 * world of depth and transformation). Scorpio's profile here reproduces
 * the original Abyssia content byte-for-byte (same `abyssia-` id prefix,
 * same biomes and landmarks in the same order), so worlds already
 * generated and persisted for Scorpio players are unaffected and newly
 * generated ones are identical to before.
 */

import type { BiomeTheme, WorldDescriptor } from '../../types/world';
import type { ZodiacSign } from '../../types/astrology';

export interface SignWorldProfile {
  worldName: WorldDescriptor['worldName'];
  archetypeTheme: WorldDescriptor['archetypeTheme'];
  ambientColorHex: WorldDescriptor['ambientColorHex'];
  /** Prefix for generated biome/landmark ids. Scorpio MUST stay 'abyssia'. */
  idPrefix: string;
  /** Exactly four biome archetypes, in placement order. */
  biomeThemes: [BiomeTheme, BiomeTheme, BiomeTheme, BiomeTheme];
  /** Four authored landmarks, in placement order. */
  landmarks: [LandmarkLore, LandmarkLore, LandmarkLore, LandmarkLore];
}

interface LandmarkLore {
  name: string;
  description: string;
}

export const SIGN_WORLD_PROFILES: Record<ZodiacSign, SignWorldProfile> = {
  // ── Fire ──────────────────────────────────────────────────────
  aries: {
    worldName: 'Ignisar',
    archetypeTheme: 'forge_of_beginnings',
    ambientColorHex: '#2a0d0a',
    idPrefix: 'ignisar',
    biomeThemes: ['molten_caldera', 'ember_plain', 'ashen_ridge', 'ignis_spire'],
    landmarks: [
      { name: 'The First Spark', description: 'A perpetual flame at the world’s heart, said to be the first fire that ever dared to burn. Aries energy ignites here.' },
      { name: 'Charging Grounds', description: 'A scorched plain that still trembles underfoot from those who ran headlong into the unknown and never looked back.' },
      { name: 'The Ram’s Horn', description: 'A spire of cooled lava curved like a horn, struck by travelers seeking the nerve to begin again.' },
      { name: 'Ember Vigil', description: 'Where the boldest come to test what they are willing to risk. The fire only answers those who move first.' },
    ],
  },
  leo: {
    worldName: 'Solhaven',
    archetypeTheme: 'radiant_pride',
    ambientColorHex: '#2a1e08',
    idPrefix: 'solhaven',
    biomeThemes: ['savanna_expanse', 'sunscorched_dune', 'ember_plain', 'ignis_spire'],
    landmarks: [
      { name: 'The Sunthrone', description: 'A golden spire that catches the light no matter the hour. Leo stands tallest in its glow.' },
      { name: 'The Great Mane', description: 'Rolling savanna gold as a lion’s coat, where the bold come simply to be seen.' },
      { name: 'Amphitheater of Suns', description: 'A natural stage scorched by countless performances. Here the world itself is the audience.' },
      { name: 'Pridelands Vigil', description: 'Where warmth is given freely and loyalty repaid in kind. None who are welcomed here are forgotten.' },
    ],
  },
  sagittarius: {
    worldName: 'Farreach',
    archetypeTheme: 'far_horizon',
    ambientColorHex: '#2a1a08',
    idPrefix: 'farreach',
    biomeThemes: ['savanna_expanse', 'highland_crag', 'ember_plain', 'windswept_mesa'],
    landmarks: [
      { name: 'The Aimed Arrow', description: 'A crag split clean by a single loosed shaft that never came down. Sagittarius aims past the horizon.' },
      { name: 'Wanderer’s Rise', description: 'A high ridge from which every road is visible at once, and not one of them leads home.' },
      { name: 'The Open Road', description: 'A plain that stretches further the longer you walk it. Freedom, here, is the only destination.' },
      { name: 'Beacon of the Beyond', description: 'A windswept mesa where seekers light fires for the next traveler. The journey matters more than the arriving.' },
    ],
  },

  // ── Earth ─────────────────────────────────────────────────────
  taurus: {
    worldName: 'Verdania',
    archetypeTheme: 'verdant_steadfast',
    ambientColorHex: '#11240f',
    idPrefix: 'verdania',
    biomeThemes: ['verdant_meadow', 'stone_terrace', 'mossen_grove', 'tilled_field'],
    landmarks: [
      { name: 'The Unmoved Stone', description: 'A boulder no force has ever shifted. Taurus patience is carved into its stillness.' },
      { name: 'Orchard Eternal', description: 'Groves that fruit in every season, tended by no one and never once barren.' },
      { name: 'The Slow Terrace', description: 'Stone steps worn smooth by centuries of unhurried feet. Nothing here is ever rushed.' },
      { name: 'Hearth of Plenty', description: 'A field that has never failed a harvest. Comfort and abundance gather thick in its soil.' },
    ],
  },
  virgo: {
    worldName: 'Messaria',
    archetypeTheme: 'ordered_harvest',
    ambientColorHex: '#15240f',
    idPrefix: 'messaria',
    biomeThemes: ['tilled_field', 'verdant_meadow', 'crystal_hollow', 'mossen_grove'],
    landmarks: [
      { name: 'The Sorted Fields', description: 'Furrows aligned to a precision no hand should manage, yet here they are. Nothing in Virgo is left to chance.' },
      { name: 'Apothecary Hollow', description: 'A crystal grotto where every remedy is catalogued and every herb has its proper place.' },
      { name: 'The Measured Grove', description: 'Trees grown in exact rows and pruned to a quiet perfection. Order, here, is a kind of devotion.' },
      { name: 'Threshing Stone', description: 'Where the useful is parted from the waste. Virgo’s gift is knowing the difference.' },
    ],
  },
  capricorn: {
    worldName: 'Aldekarn',
    archetypeTheme: 'ascendant_summit',
    ambientColorHex: '#14171c',
    idPrefix: 'aldekarn',
    biomeThemes: ['highland_crag', 'stone_terrace', 'glacier_shelf', 'crystal_hollow'],
    landmarks: [
      { name: 'The Long Ascent', description: 'A stair carved into the mountain’s face, each step the work of a lifetime. Capricorn climbs regardless.' },
      { name: 'Saturn’s Watch', description: 'A summit where time moves slower and patience is the only currency that spends.' },
      { name: 'The Earned Summit', description: 'The highest point in Aldekarn. None arrive here who did not climb.' },
      { name: 'Foundation Stone', description: 'A terrace built to outlast everything around it. What is raised here is raised to endure.' },
    ],
  },

  // ── Air ───────────────────────────────────────────────────────
  gemini: {
    worldName: 'Zephyra',
    archetypeTheme: 'twin_winds',
    ambientColorHex: '#0d2630',
    idPrefix: 'zephyra',
    biomeThemes: ['windswept_mesa', 'echo_canyon', 'cloud_terrace', 'gale_spire'],
    landmarks: [
      { name: 'The Twin Pillars', description: 'Two identical spires that answer each other in echoes. Speak at one and the other replies in your own voice.' },
      { name: 'Whispering Span', description: 'A canyon where every word ever spoken still drifts on the wind, waiting to be overheard.' },
      { name: 'Crossroads of Tongues', description: 'Where a hundred winds meet and trade their stories. No traveler leaves knowing only what they came with.' },
      { name: 'The Quicksilver Arch', description: 'A gale-carved arch that hums with restless curiosity. Gemini’s mind never settles here, and neither will yours.' },
    ],
  },
  libra: {
    worldName: 'Aequora',
    archetypeTheme: 'balanced_airs',
    ambientColorHex: '#241225',
    idPrefix: 'aequora',
    biomeThemes: ['cloud_terrace', 'aurora_flat', 'skyreef', 'windswept_mesa'],
    landmarks: [
      { name: 'The Perfect Balance', description: 'Two floating terraces holding each other in eternal counterpoise. Tip one and the other answers.' },
      { name: 'Hall of Mirrors', description: 'An aurora-lit flat where every reflection is fairer than the last. Libra weighs them all.' },
      { name: 'The Concord Reef', description: 'A sky-reef where opposing winds meet and, against all odds, agree.' },
      { name: 'Scales of the Horizon', description: 'Where the world decides, daily, what is just. Travelers come to have their grievances weighed.' },
    ],
  },
  aquarius: {
    worldName: 'Aetheris',
    archetypeTheme: 'aurora_vision',
    ambientColorHex: '#0a1f2e',
    idPrefix: 'aetheris',
    biomeThemes: ['aurora_flat', 'gale_spire', 'skyreef', 'glacier_shelf'],
    landmarks: [
      { name: 'The Lightning Vessel', description: 'A spire that gathers the sky’s charge and pours it back as cold blue fire. Aquarius bears what others fear to hold.' },
      { name: 'Assembly of the Many', description: 'An aurora-lit flat where no single voice rises above the rest. The collective decides, or no one does.' },
      { name: 'The Future Reef', description: 'A sky-reef of forms no one has seen before. What is strange here is simply early.' },
      { name: 'Glacier of Distance', description: 'A pale shelf far from everything, where the visionary goes to see the whole at once.' },
    ],
  },

  // ── Water ─────────────────────────────────────────────────────
  cancer: {
    worldName: 'Lunara',
    archetypeTheme: 'tidal_hearth',
    ambientColorHex: '#0d1b2e',
    idPrefix: 'lunara',
    biomeThemes: ['mist_fen', 'tidal_ruins', 'bioluminescent_cavern', 'glacier_shelf'],
    landmarks: [
      { name: 'The Tidewatch Hearth', description: 'A sheltered hollow where a lantern has burned against every tide. The Moon’s pull is gentlest here.' },
      { name: 'Hall of Keeping', description: 'Drowned ruins where the water holds memories instead of washing them away.' },
      { name: 'The Cradle Pools', description: 'Bioluminescent shallows that glow softer whenever something needs protecting.' },
      { name: 'Mourning Shelf', description: 'A pale glacier ledge where the world remembers what it has lost, and refuses to let go.' },
    ],
  },
  // Scorpio / Abyssia — reproduces the original content exactly. Do not
  // alter the id prefix, biome order, or landmark text: existing worlds
  // were generated against precisely this and must stay reproducible.
  scorpio: {
    worldName: 'Abyssia',
    archetypeTheme: 'abyssal_depths',
    ambientColorHex: '#1a0d2e',
    idPrefix: 'abyssia',
    biomeThemes: ['abyssal_trench', 'bioluminescent_cavern', 'obsidian_spire', 'tidal_ruins'],
    landmarks: [
      { name: 'The Sting Spire', description: 'A jagged obsidian formation said to mark where the trench first cracked open. Scorpio energy gathers thickest here.' },
      { name: 'Drowned Archive', description: 'Tidal ruins holding fragments of a civilization that learned too much, too fast, and paid for it.' },
      { name: 'The Molting Grotto', description: 'A bioluminescent cavern where the light pulses in slow waves — locals say it breathes in rhythm with something larger.' },
      { name: 'Undertow Threshold', description: 'The deepest known point in Abyssia. Pressure here is said to reveal what a person is actually made of.' },
    ],
  },
  pisces: {
    worldName: 'Dreamtide',
    archetypeTheme: 'dreaming_tide',
    ambientColorHex: '#0d1f2e',
    idPrefix: 'dreamtide',
    biomeThemes: ['mist_fen', 'bioluminescent_cavern', 'tidal_ruins', 'abyssal_trench'],
    landmarks: [
      { name: 'The Dissolving Shore', description: 'Where the line between water and air gives up entirely. Pisces does not mind the blur.' },
      { name: 'Cathedral of Dreams', description: 'A bioluminescent cavern where sleeping thoughts drift loose and glow. Reach for one and it becomes yours.' },
      { name: 'The Mercy Pools', description: 'Tidal ruins that hold no grudges. Whatever you bring here, the water forgives.' },
      { name: 'Veil’s Edge', description: 'The deepest mist in Dreamtide, where the self thins to nothing and, briefly, touches everything.' },
    ],
  },
};
