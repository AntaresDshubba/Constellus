/**
 * Serpentaria — the hidden thirteenth world (post-launch).
 *
 * GDD live-service roadmap: "Serpentaria (hidden 13th world)." Ophiuchus,
 * the serpent-bearer left out of the twelve-sign wheel — a liminal,
 * void-edged place of wounding-and-healing, revealed only once a player
 * has walked all twelve worlds (completed every Arc / recovered every
 * Nexus Fragment).
 *
 * Deliberately NOT a zodiac sign: the ephemeris is a sealed twelve-sign,
 * 30°-each engine and must stay that way, so Serpentaria is a special
 * authored world, not a 13th entry in ZODIAC_SIGNS. It produces a
 * WorldSceneDescriptor directly (no zodiacSign, no base_layer_worlds row),
 * generated deterministically from a seed so it looks the same every
 * visit without being persisted — the same approach Synastry uses to
 * stay self-contained.
 *
 * Pure: no I/O. The unlock check and the userId-derived seed live in
 * src/lib/serpentaria.ts.
 */

import { createSeededRandom, randomInRange } from '../worldGen/seededRandom';
import type { BiomeDescriptor, LandmarkDescriptor, BiomeTheme } from '../../types/world';

export const SERPENTARIA_NAME = 'Serpentaria';
export const SERPENTARIA_ARCHETYPE = 'the_thirteenth';
// A near-black void with the faintest violet — outside the wheel, barely lit.
export const SERPENTARIA_AMBIENT = '#06040f';

// Biome archetypes evoking depth + strange light + the void's edge.
const BIOME_THEMES: [BiomeTheme, BiomeTheme, BiomeTheme, BiomeTheme] = [
  'obsidian_spire', 'abyssal_trench', 'aurora_flat', 'crystal_hollow',
];

const LANDMARK_LORE: Array<{ name: string; description: string }> = [
  { name: 'The Serpent’s Coil', description: 'A spiral of black stone with no beginning and no end. To walk it is to lose track of which way is in.' },
  { name: 'The Healer’s Vigil', description: 'Ophiuchus held the serpent and the cure both. Here, what wounds you and what mends you are the same thing.' },
  { name: 'The Unwritten Sign', description: 'The thirteenth, left out of the wheel. It remembers being forgotten, and does not forgive easily.' },
  { name: 'The Void’s Edge', description: 'Beyond this point the world simply stops being a world. Few look over; fewer look back.' },
];

export interface SerpentariaScene {
  worldName: string;
  archetypeTheme: string;
  ambientColorHex: string;
  biomes: BiomeDescriptor[];
  landmarks: LandmarkDescriptor[];
}

/**
 * Build Serpentaria's scene deterministically from a seed. Same layout
 * algorithm as the zodiac worlds (four biomes around a center, four
 * jittered landmarks), so it renders through the same scene components.
 */
export function generateSerpentariaScene(seed: string): SerpentariaScene {
  const rng = createSeededRandom(seed);

  const biomes: BiomeDescriptor[] = BIOME_THEMES.map((theme, index) => {
    const angle = (index / BIOME_THEMES.length) * Math.PI * 2;
    const radius = randomInRange(rng, 18, 26);
    return {
      id: `serpentaria-biome-${index}`,
      theme,
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
      seed: `${seed}:biome:${index}`,
    };
  });

  const landmarks: LandmarkDescriptor[] = LANDMARK_LORE.map((lore, index) => {
    const biome = biomes[index % biomes.length]!;
    const jitterX = randomInRange(rng, -4, 4);
    const jitterZ = randomInRange(rng, -4, 4);
    return {
      id: `serpentaria-landmark-${index}`,
      name: lore.name,
      description: lore.description,
      position: [biome.position[0] + jitterX, 0.5, biome.position[2] + jitterZ],
    };
  });

  return {
    worldName: SERPENTARIA_NAME,
    archetypeTheme: SERPENTARIA_ARCHETYPE,
    ambientColorHex: SERPENTARIA_AMBIENT,
    biomes,
    landmarks,
  };
}
