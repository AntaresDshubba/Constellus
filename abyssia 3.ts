/**
 * Abyssia — the Scorpio Base Layer world.
 *
 * This is the ONE zodiac world this phase implements (per this build's
 * scope: "One playable zodiac world only — Scorpio (Abyssia)"). Every
 * type this function returns (WorldDescriptor, BiomeDescriptor,
 * LandmarkDescriptor — src/types/world.ts) is the GENERAL shape later
 * phases will reuse for the other eleven signs; this file is where the
 * Scorpio-SPECIFIC content (theme, biome names, landmark lore) lives, so
 * adding sign #2 later means adding a sibling file here, not changing
 * this function's contract.
 *
 * Thematic grounding: Scorpio is a fixed water sign, associated with
 * depth, transformation, and what lies beneath the surface — Abyssia is
 * built around that: an ocean trench world of bioluminescent caverns,
 * obsidian spires, and tidal ruins, deliberately dark and vertical rather
 * than the bright/open feel a fire or air sign's world would have.
 *
 * Determinism: generateAbyssiaWorld(seed) is a pure function of its
 * seed string. The seed is derived once at first generation (typically
 * from the player's userId + zodiac sign) and stored permanently in
 * base_layer_worlds — see src/lib/worldGen/baseLayer.ts for where that
 * seed is created and the generated world persisted. Calling this
 * function twice with the same seed always produces the identical
 * WorldDescriptor.
 */

import { createSeededRandom, randomInRange } from './seededRandom';
import type { WorldDescriptor, BiomeDescriptor, LandmarkDescriptor } from '../../types/world';

const BIOME_THEMES: BiomeDescriptor['theme'][] = [
  'abyssal_trench', 'bioluminescent_cavern', 'obsidian_spire', 'tidal_ruins',
];

const LANDMARK_LORE: Array<{ name: string; description: string }> = [
  {
    name: 'The Sting Spire',
    description: 'A jagged obsidian formation said to mark where the trench first cracked open. Scorpio energy gathers thickest here.',
  },
  {
    name: 'Drowned Archive',
    description: 'Tidal ruins holding fragments of a civilization that learned too much, too fast, and paid for it.',
  },
  {
    name: 'The Molting Grotto',
    description: 'A bioluminescent cavern where the light pulses in slow waves — locals say it breathes in rhythm with something larger.',
  },
  {
    name: 'Undertow Threshold',
    description: 'The deepest known point in Abyssia. Pressure here is said to reveal what a person is actually made of.',
  },
];

/**
 * Generate the Abyssia world deterministically from a seed. Four biomes
 * arranged around a central point (rather than a line or grid), each
 * with its own sub-seed derived from the parent seed plus its index —
 * deriving sub-seeds this way means adding a fifth biome later doesn't
 * change the first four biomes' generated content, since each one's
 * sub-seed depends only on its own index, not the total count.
 */
export function generateAbyssiaWorld(seed: string): WorldDescriptor {
  const rng = createSeededRandom(seed);

  const biomes: BiomeDescriptor[] = BIOME_THEMES.map((theme, index) => {
    const angle = (index / BIOME_THEMES.length) * Math.PI * 2;
    const radius = randomInRange(rng, 18, 26);
    return {
      id: `abyssia-biome-${index}`,
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
      id: `abyssia-landmark-${index}`,
      name: lore.name,
      description: lore.description,
      position: [biome.position[0] + jitterX, 0.5, biome.position[2] + jitterZ],
    };
  });

  return {
    zodiacSign: 'scorpio',
    archetypeTheme: 'abyssal_depths',
    worldName: 'Abyssia',
    biomes,
    landmarks,
    // Scorpio is a water sign; deep teal-violet rather than a literal
    // ocean blue, to keep the "depth and transformation" theme distinct
    // from a generic underwater aesthetic.
    ambientColorHex: '#1a0d2e',
  };
}
