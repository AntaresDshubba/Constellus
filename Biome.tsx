/**
 * Biome.
 *
 * Renders one biome's procedural geometry based on its theme. Each
 * theme gets a distinct, simple geometric treatment — this phase's
 * scope is "four visually distinguishable areas a player can navigate
 * between," not high-fidelity environment art. The biome's own seed
 * (BiomeDescriptor.seed) drives small per-biome variation (height,
 * scale) deterministically, so the same biome looks the same every time
 * it's loaded.
 */

import { useMemo } from 'react';
import { createSeededRandom, randomInRange } from '../../lib/worldGen/seededRandom';
import type { BiomeDescriptor } from '../../types/world';

const THEME_COLORS: Record<BiomeDescriptor['theme'], string> = {
  abyssal_trench: '#0d1b2a',
  bioluminescent_cavern: '#1b4332',
  obsidian_spire: '#10002b',
  tidal_ruins: '#1d3461',
};

const THEME_ACCENT: Record<BiomeDescriptor['theme'], string> = {
  abyssal_trench: '#415a77',
  bioluminescent_cavern: '#52e89e',
  obsidian_spire: '#7b2cbf',
  tidal_ruins: '#3a86ff',
};

interface BiomeProps {
  biome: BiomeDescriptor;
  showCalmMarker: boolean;
}

export function Biome({ biome, showCalmMarker }: BiomeProps) {
  const rng = useMemo(() => createSeededRandom(biome.seed), [biome.seed]);
  const height = useMemo(() => randomInRange(rng, 2.5, 5), [rng]);
  const radius = useMemo(() => randomInRange(rng, 1.8, 3.2), [rng]);

  return (
    <group position={biome.position}>
      {biome.theme === 'obsidian_spire' ? (
        <mesh position={[0, height / 2, 0]} castShadow>
          <coneGeometry args={[radius, height, 6]} />
          <meshStandardMaterial color={THEME_COLORS[biome.theme]} metalness={0.6} roughness={0.3} />
        </mesh>
      ) : (
        <mesh position={[0, height / 2, 0]} castShadow>
          <cylinderGeometry args={[radius, radius * 1.3, height, 8]} />
          <meshStandardMaterial
            color={THEME_COLORS[biome.theme]}
            emissive={biome.theme === 'bioluminescent_cavern' ? THEME_ACCENT[biome.theme] : '#000000'}
            emissiveIntensity={biome.theme === 'bioluminescent_cavern' ? 0.4 : 0}
            metalness={0.2}
            roughness={0.7}
          />
        </mesh>
      )}

      <pointLight color={THEME_ACCENT[biome.theme]} intensity={0.6} distance={12} position={[0, height, 0]} />

      {showCalmMarker && (
        <mesh position={[0, height + 1.5, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
        </mesh>
      )}
    </group>
  );
}
