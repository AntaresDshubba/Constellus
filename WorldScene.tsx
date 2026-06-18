/**
 * WorldScene.
 *
 * Translates a WorldSceneDescriptor (renderer-agnostic data) into actual
 * R3F/Three.js elements. This is the ONE place that does that
 * translation — gameplay/world-gen code (src/lib/worldGen) never
 * imports `three` or `@react-three/fiber` itself, it only produces
 * descriptors for this component to render.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { Biome } from './Biome';
import { Landmark } from './Landmark';
import type { WorldSceneDescriptor } from '../core/NexusRender';

interface WorldSceneProps {
  descriptor: WorldSceneDescriptor;
}

export function WorldScene({ descriptor }: WorldSceneProps) {
  const ambientColor = useMemo(() => new THREE.Color(descriptor.ambientColorHex), [descriptor.ambientColorHex]);

  // Transit Overlay tint operation: a 'tint_ambient' operation shifts
  // the fog/ambient color toward its payload's target hex, blended
  // rather than replacing it outright, so the Base Layer's identity is
  // still visible underneath today's transit weather.
  const tintOp = descriptor.activeOverlayOperations.find((op) => op.type === 'tint_ambient');
  const effectiveColor = useMemo(() => {
    if (!tintOp || typeof tintOp.payload.towardHex !== 'string') return ambientColor;
    const target = new THREE.Color(tintOp.payload.towardHex);
    return ambientColor.clone().lerp(target, 0.4);
  }, [ambientColor, tintOp]);

  const pulsingLandmarkId = descriptor.activeOverlayOperations.find((op) => op.type === 'pulse_landmark')?.payload
    .landmarkId as string | undefined;
  const calmMarkerBiomeId = descriptor.activeOverlayOperations.find((op) => op.type === 'spawn_marker')
    ?.targetBiomeId;

  return (
    <>
      <color attach="background" args={[effectiveColor]} />
      <fog attach="fog" args={[effectiveColor, 10, 90]} />

      <ambientLight intensity={0.35} color="#9aa5ff" />
      <directionalLight position={[10, 20, 10]} intensity={0.6} color="#cfd6ff" />
      {/* A second, dim warm light from below — Abyssia's bioluminescence is the implied light source, not a sun. */}
      <pointLight position={[0, -2, 0]} intensity={0.8} color="#3ddc97" distance={40} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[60, 64]} />
        <meshStandardMaterial color={effectiveColor.clone().multiplyScalar(0.6)} />
      </mesh>

      {descriptor.biomes.map((biome) => (
        <Biome key={biome.id} biome={biome} showCalmMarker={biome.id === calmMarkerBiomeId} />
      ))}

      {descriptor.landmarks.map((landmark) => (
        <Landmark key={landmark.id} landmark={landmark} pulsing={landmark.id === pulsingLandmarkId} />
      ))}
    </>
  );
}
