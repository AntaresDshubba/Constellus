/**
 * StarMapScreen.
 *
 * Wraps StarMapScene in its own lightweight <Canvas> — deliberately NOT
 * WorldCanvas, since the star map isn't a WorldSceneDescriptor (it has
 * no biomes/landmarks/overlay, just twelve fixed star positions) and
 * doesn't need the mobile movement controls a playable world does. It
 * still gets the same context-recovery treatment via useContextRecovery
 * directly, since context loss is a platform risk for ANY WebGL canvas,
 * not just world screens.
 */

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrbitControls } from '@react-three/drei';
import { useContextRecovery } from '../../nexus-render/core/useContextRecovery';
import { StarMapScene } from '../../nexus-render/r3f-backend/StarMapScene';
import { useCosmicProfile } from '../../hooks/useCosmicProfile';

export function StarMapScreen() {
  const navigate = useNavigate();
  const { profile, loading } = useCosmicProfile();
  const { reconnecting, onCanvasCreated } = useContextRecovery();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas onCreated={onCanvasCreated} dpr={[1, 2]} camera={{ fov: 55, position: [0, 8, 30] }}>
        <Suspense fallback={null}>
          {!loading && (
            <StarMapScene
              sunSign={profile?.sun_sign ?? null}
              onSelectSign={(sign) => navigate(`/world/${sign}`)}
            />
          )}
        </Suspense>
        {/* Mouse/trackpad orbit for desktop testing; touch users can
            also drag to orbit since OrbitControls handles single-finger
            touch natively. A dedicated joystick isn't needed here since
            there's no player to move around — only the camera moves. */}
        <OrbitControls enablePan={false} minDistance={15} maxDistance={50} />
      </Canvas>

      <div style={{ position: 'absolute', top: 16, left: 16, color: '#e6e6f0', fontFamily: 'sans-serif' }}>
        <h2 style={{ margin: 0 }}>The Star Map</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.8 }}>All twelve worlds are open. Tap any star to enter — your Sun sign glows gold.</p>
      </div>

      {reconnecting && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(5,5,10,0.85)', color: '#e6e6f0', fontFamily: 'sans-serif',
          }}
        >
          Reconnecting the stars…
        </div>
      )}
    </div>
  );
}
