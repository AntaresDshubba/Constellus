/**
 * WorldCanvas.
 *
 * The one place <Canvas> from @react-three/fiber is instantiated for
 * world rendering. Every world-rendering screen renders THIS component
 * with a WorldSceneDescriptor, never a bare <Canvas> of its own — this
 * is what makes context-loss recovery (useContextRecovery) and the
 * mobile-appropriate renderer settings below apply uniformly, the same
 * structural guarantee the original NexusRender design made.
 */

import { Canvas } from '@react-three/fiber';
import { Suspense, type ReactNode } from 'react';
import { useContextRecovery } from '../core/useContextRecovery';
import { WorldScene } from './WorldScene';
import { PlayerController } from './PlayerController';
import { OrbitTouchZone } from './OrbitTouchZone';
import { VirtualJoystick } from './VirtualJoystick';
import type { WorldSceneDescriptor } from '../core/NexusRender';

interface WorldCanvasProps {
  descriptor: WorldSceneDescriptor;
  children?: ReactNode;
}

export function WorldCanvas({ descriptor, children }: WorldCanvasProps) {
  const { reconnecting, onCanvasCreated } = useContextRecovery();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        onCreated={onCanvasCreated}
        // dpr capped at 2 rather than the device's true pixel ratio —
        // GDD-style mobile performance budget; an uncapped dpr on a
        // high-density phone screen multiplies fragment shader cost for
        // a visual improvement well past what a moving 3D scene needs.
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        camera={{ fov: 60, near: 0.1, far: 200, position: [0, 6, 14] }}
      >
        <Suspense fallback={null}>
          <WorldScene descriptor={descriptor} />
          <PlayerController />
          {children}
        </Suspense>
      </Canvas>

      {/* Touch UI is a DOM overlay above the canvas, not part of the
          R3F scene graph — OrbitTouchZone covers the full area for
          drag-to-look, VirtualJoystick sits on top of it in z-order for
          movement, matching the standard mobile dual-control scheme. */}
      <OrbitTouchZone />
      <VirtualJoystick />

      {reconnecting && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(5,5,10,0.85)', color: '#e6e6f0', fontFamily: 'sans-serif', pointerEvents: 'none',
          }}
        >
          Reconnecting the stars…
        </div>
      )}
    </div>
  );
}
