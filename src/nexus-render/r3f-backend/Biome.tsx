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
import type { BiomeDescriptor, BiomeTheme } from '../../types/world';

interface BiomeVisual {
  /** Base mesh color. */
  color: string;
  /** Point-light + emissive color, the biome's "glow". */
  accent: string;
  /** 'spire' renders a tall cone; 'mound' a broad cylinder. */
  shape: 'spire' | 'mound';
  /** Whether the mesh itself glows (uses accent as emissive). */
  emissive: boolean;
}

// One visual per biome theme. Keyed by the full BiomeTheme union, so the
// type checker guarantees every theme any world can produce has a visual
// here (add a theme in src/types/world.ts without one and this fails to
// compile). The four original Scorpio themes keep their exact look.
const BIOME_VISUALS: Record<BiomeTheme, BiomeVisual> = {
  // Water.
  abyssal_trench: { color: '#0d1b2a', accent: '#415a77', shape: 'mound', emissive: false },
  bioluminescent_cavern: { color: '#1b4332', accent: '#52e89e', shape: 'mound', emissive: true },
  obsidian_spire: { color: '#10002b', accent: '#7b2cbf', shape: 'spire', emissive: false },
  tidal_ruins: { color: '#1d3461', accent: '#3a86ff', shape: 'mound', emissive: false },
  mist_fen: { color: '#15302e', accent: '#6fb3a8', shape: 'mound', emissive: false },
  glacier_shelf: { color: '#1b3a4b', accent: '#a8e0ff', shape: 'mound', emissive: false },
  // Fire.
  molten_caldera: { color: '#3a0d05', accent: '#ff6b1a', shape: 'mound', emissive: true },
  ember_plain: { color: '#2e1208', accent: '#e8662a', shape: 'mound', emissive: false },
  ashen_ridge: { color: '#241a18', accent: '#8a6f63', shape: 'spire', emissive: false },
  ignis_spire: { color: '#2a0a08', accent: '#ff3b3b', shape: 'spire', emissive: true },
  sunscorched_dune: { color: '#3a2a12', accent: '#e8b54a', shape: 'mound', emissive: false },
  savanna_expanse: { color: '#2e2810', accent: '#c8a13a', shape: 'mound', emissive: false },
  // Earth.
  verdant_meadow: { color: '#16300f', accent: '#6fdc4a', shape: 'mound', emissive: false },
  stone_terrace: { color: '#23231f', accent: '#8a8a7a', shape: 'mound', emissive: false },
  crystal_hollow: { color: '#1a2433', accent: '#7ad0ff', shape: 'spire', emissive: true },
  mossen_grove: { color: '#12281a', accent: '#4ab87a', shape: 'mound', emissive: false },
  highland_crag: { color: '#1f2329', accent: '#9aa6b3', shape: 'spire', emissive: false },
  tilled_field: { color: '#2a2010', accent: '#b89a4a', shape: 'mound', emissive: false },
  // Air.
  windswept_mesa: { color: '#2a1f24', accent: '#d8a8c0', shape: 'mound', emissive: false },
  cloud_terrace: { color: '#1f2633', accent: '#bcd0ff', shape: 'mound', emissive: false },
  gale_spire: { color: '#1a2230', accent: '#8ab0ff', shape: 'spire', emissive: false },
  aurora_flat: { color: '#12222e', accent: '#5affc8', shape: 'mound', emissive: true },
  echo_canyon: { color: '#241f2a', accent: '#a89ad0', shape: 'mound', emissive: false },
  skyreef: { color: '#152834', accent: '#7ad0e8', shape: 'mound', emissive: true },
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
  const visual = BIOME_VISUALS[biome.theme];

  // Deterministic detail cluster scattered around the central mesh, so a
  // biome reads as a place rather than a lone shape. Seeded from a
  // dedicated sub-seed so tuning the cluster never shifts the main mesh
  // (and vice versa), keeping the Base Layer byte-stable. Spires get
  // sharp shards; mounds get faceted stones.
  const props = useMemo(() => {
    const prng = createSeededRandom(`${biome.seed}:props`);
    const count = 5 + Math.floor(prng() * 4); // 5–8
    return Array.from({ length: count }, () => {
      const angle = prng() * Math.PI * 2;
      const dist = radius * 1.2 + prng() * radius * 1.4;
      const scale = 0.3 + prng() * 0.6;
      return {
        position: [Math.cos(angle) * dist, scale * 0.6, Math.sin(angle) * dist] as [number, number, number],
        scale,
        rotation: prng() * Math.PI * 2,
      };
    });
  }, [biome.seed, radius]);

  return (
    <group position={biome.position}>
      {visual.shape === 'spire' ? (
        <mesh position={[0, height / 2, 0]} castShadow>
          <coneGeometry args={[radius, height, 6]} />
          <meshStandardMaterial
            color={visual.color}
            emissive={visual.emissive ? visual.accent : '#000000'}
            emissiveIntensity={visual.emissive ? 0.4 : 0}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      ) : (
        <mesh position={[0, height / 2, 0]} castShadow>
          <cylinderGeometry args={[radius, radius * 1.3, height, 8]} />
          <meshStandardMaterial
            color={THEME_COLORS[biome.theme]}
            emissive={biome.theme === 'bioluminescent_cavern' ? THEME_ACCENT[biome.theme] : '#000000'}
            emissiveIntensity={biome.theme === 'bioluminescent_cavern' ? 0.4 : 0}
            color={visual.color}
            emissive={visual.emissive ? visual.accent : '#000000'}
            emissiveIntensity={visual.emissive ? 0.4 : 0}
            metalness={0.2}
            roughness={0.7}
          />
        </mesh>
      )}

      <pointLight color={THEME_ACCENT[biome.theme]} intensity={0.6} distance={12} position={[0, height, 0]} />
      {/* Detail cluster: small shards (spire) or faceted stones (mound). */}
      {props.map((p, i) => (
        <mesh key={i} position={p.position} rotation={[0, p.rotation, 0]} castShadow>
          {visual.shape === 'spire'
            ? <coneGeometry args={[p.scale * 0.4, p.scale * 1.6, 5]} />
            : <icosahedronGeometry args={[p.scale * 0.6, 0]} />}
          <meshStandardMaterial
            color={visual.accent}
            emissive={visual.emissive ? visual.accent : '#000000'}
            emissiveIntensity={visual.emissive ? 0.3 : 0}
            metalness={visual.shape === 'spire' ? 0.5 : 0.2}
            roughness={visual.shape === 'spire' ? 0.35 : 0.8}
          />
        </mesh>
      ))}

      <pointLight color={visual.accent} intensity={0.6} distance={12} position={[0, height, 0]} />

      {showCalmMarker && (
        <mesh position={[0, height + 1.5, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
        </mesh>
      )}
    </group>
  );
}
