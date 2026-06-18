/**
 * StarMapScene.
 *
 * Renders all twelve zodiac signs as points arranged in a circle (their
 * natural ordering, not an arbitrary layout), each one a star a player
 * can see and identify by name, but only Scorpio is actually enterable
 * in this build — every other sign renders as a dim, non-interactive
 * star, an honest reflection of this phase's scope rather than hiding
 * the other eleven signs entirely. The player's own Sun sign is
 * highlighted distinctly, since making that legible at a glance is the
 * whole point of a chart-seeded star map.
 */

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { ZODIAC_SIGNS } from '../../types/astrology';
import type { ZodiacSign } from '../../types/astrology';

interface StarMapSceneProps {
  sunSign: ZodiacSign | null;
  enterableSign: ZodiacSign;
  onSelectEnterable: () => void;
}

const SIGN_DISPLAY_NAME: Record<ZodiacSign, string> = {
  aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer',
  leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio',
  sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
};

export function StarMapScene({ sunSign, enterableSign, onSelectEnterable }: StarMapSceneProps) {
  const starPositions = useMemo(
    () =>
      ZODIAC_SIGNS.map((sign, index) => {
        const angle = (index / ZODIAC_SIGNS.length) * Math.PI * 2;
        const radius = 20;
        return {
          sign,
          position: [Math.cos(angle) * radius, Math.sin(index * 1.3) * 3, Math.sin(angle) * radius] as [number, number, number],
        };
      }),
    [],
  );

  return (
    <>
      <color attach="background" args={['#05050f']} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={1.2} color="#e0d4ff" />

      {starPositions.map(({ sign, position }) => {
        const isEnterable = sign === enterableSign;
        const isSunSign = sign === sunSign;

        return (
          <group key={sign} position={position}>
            <mesh
              onClick={isEnterable ? onSelectEnterable : undefined}
              scale={isSunSign ? 1.6 : isEnterable ? 1.3 : 1}
            >
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial
                color={isEnterable ? '#9d4edd' : isSunSign ? '#ffd60a' : '#3a3a55'}
                emissive={isEnterable ? '#9d4edd' : isSunSign ? '#ffd60a' : '#1a1a2e'}
                emissiveIntensity={isEnterable ? 1.0 : isSunSign ? 0.8 : 0.3}
              />
            </mesh>

            <Html position={[0, 1, 0]} center distanceFactor={18} style={{ pointerEvents: 'none' }}>
              <div
                style={{
                  color: isEnterable ? '#e0aaff' : isSunSign ? '#ffd60a' : '#6c6c8a',
                  fontFamily: 'sans-serif', fontSize: 13, fontWeight: isEnterable || isSunSign ? 700 : 400,
                  whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,0.8)',
                }}
              >
                {SIGN_DISPLAY_NAME[sign]}
                {isEnterable && ' (Enter)'}
                {isSunSign && !isEnterable && ' (Your Sun)'}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
