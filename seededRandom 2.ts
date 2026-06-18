/**
 * Seeded RNG.
 *
 * Mulberry32 — a small, fast, deterministic PRNG. Used everywhere this
 * codebase needs "random-looking but reproducible" values (biome
 * placement, landmark positions), since Base Layer worlds must generate
 * byte-identical content for the same seed every time (Technical Bible
 * B.8.2: the Base Layer is meant to be STABLE, not regenerated
 * differently on every load). Math.random() is never used in world
 * generation code for this reason.
 */

export function createSeededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return function next(): number {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const result = (h ^= h >>> 16) >>> 0;
    return result / 4294967296;
  };
}

/** Deterministic pick from a range [min, max), using the given RNG function. */
export function randomInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}
