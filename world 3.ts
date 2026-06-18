/**
 * World types.
 *
 * Mirrors supabase/migrations/003_base_layer_and_transit.sql. This
 * foundation implements exactly one zodiac sign's world (Scorpio /
 * Abyssia), but every type here is the GENERAL shape Phase 4's other
 * eleven worlds will reuse, not a Scorpio-specific structure — the only
 * Scorpio-specific content lives in src/lib/worldGen/abyssia.ts.
 */

import type { ZodiacSign } from './astrology';

export type BiomeTheme = 'abyssal_trench' | 'bioluminescent_cavern' | 'obsidian_spire' | 'tidal_ruins';

export interface BiomeDescriptor {
  id: string;
  theme: BiomeTheme;
  /** Position offset for this biome's content within the world, in world-space units. */
  position: [number, number, number];
  /** Deterministic sub-seed for this biome's procedural details, derived from the world seed. */
  seed: string;
}

export interface LandmarkDescriptor {
  id: string;
  name: string;
  position: [number, number, number];
  /** Narrative/lore snippet shown when the player approaches — authored content, not procedural. */
  description: string;
}

export interface WorldDescriptor {
  zodiacSign: ZodiacSign;
  archetypeTheme: string;
  worldName: string;
  biomes: BiomeDescriptor[];
  landmarks: LandmarkDescriptor[];
  /** Ambient color used for fog/lighting, derived from the sign's ruling element. */
  ambientColorHex: string;
}

// NOTE: Row types used inside Database (src/lib/database.types.ts) are
// declared with `type X = {...}` rather than `interface X {...}` even
// though they're otherwise identical — this is required, not stylistic.
// @supabase/supabase-js's generic type inference for .insert()/.update()
// silently collapses to `never` when a table's Row/Insert type is a
// named `interface` reference, but resolves correctly with a `type`
// alias of the exact same shape. Verified directly against this
// project's installed supabase-js version via a minimal isolated repro
// before adopting this convention — see git history /commit notes for
// that repro if this ever needs re-verifying against a future version.
export type BaseLayerWorldRow = {
  id: string;
  user_id: string;
  zodiac_sign: ZodiacSign;
  seed: string;
  world_json: WorldDescriptor;
  generated_at: string;
};

export type TransitSnapshotRow = {
  snapshot_date: string;
  positions_json: Record<string, number>;
  retrograde_bodies: string[];
  lunar_phase_fraction: number;
  computed_at: string;
};

export type OverlayOperationType = 'tint_ambient' | 'spawn_marker' | 'pulse_landmark';

export interface OverlayOperation {
  type: OverlayOperationType;
  targetBiomeId: string | null;
  payload: Record<string, unknown>;
}

export interface OverlayCompositeResult {
  appliedOperations: OverlayOperation[];
  snapshotDate: string;
}

export type WorldSaveRow = {
  user_id: string;
  zodiac_sign: ZodiacSign;
  position_x: number;
  position_y: number;
  position_z: number;
  progress_json: Record<string, unknown>;
  last_saved_at: string;
};
