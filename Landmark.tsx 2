/**
 * Landmark.
 *
 * Authored content (name + lore), not procedurally generated — the four
 * Abyssia landmarks are written once in src/lib/worldGen/abyssia.ts and
 * rendered identically every time. The `pulsing` prop is the visible
 * effect of a Transit Overlay 'pulse_landmark' operation
 * (src/lib/worldGen/transitOverlay.ts): a tense transit day makes this
 * landmark visibly breathe, independent of anything stored in the Base
 * Layer itself.
 *
 * Tapping a landmark toggles a lore label via drei's <Html>, which
 * projects a real DOM element at the landmark's screen position — this
 * is deliberately a DOM overlay, not in-scene 3D text, since legible
 * text at arbitrary camera distance is what HTML does well and a 3D
 * text mesh does poorly without a dedicated font-rendering pipeline this
 * phase doesn't need.
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Mesh } from 'three';
import type { LandmarkDescriptor } from '../../types/world';

interface LandmarkProps {
  landmark: LandmarkDescriptor;
  pulsing: boolean;
}

export function Landmark({ landmark, pulsing }: LandmarkProps) {
  const meshRef = useRef<Mesh>(null);
  const [showLore, setShowLore] = useState(false);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (pulsing) {
      const scale = 1 + Math.sin(clock.elapsedTime * 2.5) * 0.15;
      meshRef.current.scale.setScalar(scale);
    } else {
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <group position={landmark.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          setShowLore((v) => !v);
        }}
      >
        <octahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial
          color={pulsing ? '#ff6b6b' : '#e0aaff'}
          emissive={pulsing ? '#ff6b6b' : '#9d4edd'}
          emissiveIntensity={0.6}
        />
      </mesh>

      {showLore && (
        <Html position={[0, 1.2, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(10,5,20,0.9)', color: '#e6e6f0', padding: '8px 12px',
              borderRadius: 6, fontFamily: 'sans-serif', fontSize: 12, width: 180, textAlign: 'center',
              border: '1px solid #7b2cbf',
            }}
          >
            <strong>{landmark.name}</strong>
            <p style={{ margin: '4px 0 0', opacity: 0.85 }}>{landmark.description}</p>
          </div>
        </Html>
      )}
    </group>
  );
}
