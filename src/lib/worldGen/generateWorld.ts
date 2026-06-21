/**
 * Deterministic world generation.
 *
 * Turns a (seed, sign) pair into a WorldDescriptor by combining the
 * sign's content profile (./signWorlds.ts) with the seeded RNG. This is
 * a pure function of its inputs: calling it twice with the same seed and
 * sign always produces the identical WorldDescriptor, which is what lets
 * the Base Layer be generated once and stored permanently (Technical
 * Bible B.8.2 — see ./baseLayer.ts for the persistence boundary).
 *
 * The algorithm here is the original Abyssia generator generalized over
 * the profile: four biomes arranged around a central point, each with its
 * own sub-seed derived from the parent seed plus its index (so the set of
 * biomes a world has can grow later without changing the earlier ones'
 * generated content), and four landmarks jittered around those biomes.
 * The RNG call order is unchanged from the original Scorpio-only
 * generator, so Scorpio's profile produces byte-identical output to what
 * was generated before this was generalized.
 */

import { createSeededRandom, randomInRange } from './seededRandom';
import { SIGN_WORLD_PROFILES } from './signWorlds';
import type { WorldDescriptor, BiomeDescriptor, LandmarkDescriptor } from '../../types/world';
import type { ZodiacSign } from '../../types/astrology';

export function generateWorld(seed: string, sign: ZodiacSign): WorldDescriptor {
  const profile = SIGN_WORLD_PROFILES[sign];
  const rng = createSeededRandom(seed);

  const biomes: BiomeDescriptor[] = profile.biomeThemes.map((theme, index) => {
    const angle = (index / profile.biomeThemes.length) * Math.PI * 2;
    const radius = randomInRange(rng, 18, 26);
    return {
      id: `${profile.idPrefix}-biome-${index}`,
      theme,
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
      seed: `${seed}:biome:${index}`,
    };
  });

  const landmarks: LandmarkDescriptor[] = profile.landmarks.map((lore, index) => {
    const biome = biomes[index % biomes.length]!;
    const jitterX = randomInRange(rng, -4, 4);
    const jitterZ = randomInRange(rng, -4, 4);
    return {
      id: `${profile.idPrefix}-landmark-${index}`,
      name: lore.name,
      description: lore.description,
      position: [biome.position[0] + jitterX, 0.5, biome.position[2] + jitterZ],
    };
  });

  return {
    zodiacSign: sign,
    archetypeTheme: profile.archetypeTheme,
    worldName: profile.worldName,
    biomes,
    landmarks,
    ambientColorHex: profile.ambientColorHex,
  };
}
