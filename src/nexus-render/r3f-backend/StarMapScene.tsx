/**
 * StarMapScene.
 *
 * Renders all twelve zodiac signs as points arranged in a circle (their
 * natural ordering, not an arbitrary layout), each one a star a player
 * can see, identify by name, and enter — all twelve worlds are now
 * playable. The player's own Sun sign is still highlighted distinctly
 * (larger, gold), since making that legible at a glance is the whole
 * point of a chart-seeded star map; it's just no longer the only one
 * that can be entered.
 */

import { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import { ZODIAC_SIGNS } from '../../types/astrology';
import type { ZodiacSign } from '../../types/astrology';

interface StarMapSceneProps {
  sunSign: ZodiacSign | null;
  onSelectSign: (sign: ZodiacSign) => void;
  /** Current Zodiac Mastery tier per world, for the per-star badge. Worlds not yet visited are simply absent. */
  masteryTierBySign?: Partial<Record<ZodiacSign, number>>;
  /** Member signs of each constellation the player has drawn — rendered as lines connecting their stars. */
  drawnConstellationSigns?: ZodiacSign[][];
}

const SIGN_DISPLAY_NAME: Record<ZodiacSign, string> = {
  aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer',
  leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio',
  sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
};

export function StarMapScene({ sunSign, onSelectSign, masteryTierBySign = {}, drawnConstellationSigns = [] }: StarMapSceneProps) {
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

  const positionBySign = useMemo(() => {
    const map = {} as Record<ZodiacSign, [number, number, number]>;
    for (const { sign, position } of starPositions) map[sign] = position;
    return map;
  }, [starPositions]);

  return (
    <>
      <color attach="background" args={['#05050f']} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={1.2} color="#e0d4ff" />

      {/* Drawn constellations: a polyline through each one's member stars,
          rendered under the stars so the star spheres sit on top. */}
      {drawnConstellationSigns.map((signs, i) => (
        <Line
          key={`constellation-${i}`}
          points={signs.map((s) => positionBySign[s])}
          color="#9d4edd"
          lineWidth={1.5}
          transparent
          opacity={0.55}
        />
      ))}

      {starPositions.map(({ sign, position }) => {
        // Every sign is enterable now; the Sun sign just gets the
        // distinct gold, larger-star treatment so it still reads as
        // "yours" at a glance.
        const isSunSign = sign === sunSign;

        return (
          <group key={sign} position={position}>
            <mesh
              onClick={() => onSelectSign(sign)}
              scale={isSunSign ? 1.6 : 1.3}
            >
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial
                color={isSunSign ? '#ffd60a' : '#9d4edd'}
                emissive={isSunSign ? '#ffd60a' : '#9d4edd'}
                emissiveIntensity={isSunSign ? 1.2 : 1.0}
              />
            </mesh>

            <Html position={[0, 1, 0]} center distanceFactor={18} style={{ pointerEvents: 'none' }}>
              <div
                style={{
                  color: isSunSign ? '#ffd60a' : '#e0aaff',
                  fontFamily: 'sans-serif', fontSize: 13, fontWeight: 700,
                  whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,0,0,0.8)',
                }}
              >
                {SIGN_DISPLAY_NAME[sign]}
                {isSunSign ? ' ★ (Your Sun)' : ' (Enter)'}
                {masteryTierBySign[sign] !== undefined && (
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 400, opacity: 0.8 }}>
                    Mastery Tier {masteryTierBySign[sign]}
                  </span>
                )}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
