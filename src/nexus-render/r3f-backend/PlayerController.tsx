/**
 * PlayerController.
 *
 * Lives inside <Canvas> (rendered as a child alongside WorldScene in
 * WorldCanvas) and is the one component with a useFrame hook that reads
 * ./mobileInput.ts and moves the camera. This keeps ALL per-frame
 * imperative work in one place — WorldScene and Biome/Landmark stay
 * declarative R3F components with no frame-loop logic of their own.
 *
 * Movement model: a simple orbit-camera-relative walk. moveY (joystick
 * forward/back) translates along the camera's current forward
 * direction projected onto the ground plane; moveX strafes
 * perpendicular to it. Orbit drag rotates the camera around the player
 * position. This is intentionally simple (no acceleration curve,
 * collision, or terrain-following) — Phase 1's scope is "the player can
 * move around and look around," not a fully physical movement system.
 */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mobileInput, consumeOrbitDelta } from './mobileInput';
import { useWorldStore } from '../../state/worldStore';

const MOVE_SPEED = 6; // world units per second
const ORBIT_SENSITIVITY = 0.005;
const CAMERA_DISTANCE = 10;
const CAMERA_HEIGHT = 5;
const MIN_POLAR = 0.2;
const MAX_POLAR = Math.PI / 2 - 0.1;

export function PlayerController() {
  const { camera } = useThree();
  const azimuth = useRef(0);
  const polar = useRef(0.5);
  const playerPos = useRef(new THREE.Vector3(...useWorldStore.getState().playerPosition));
  const setPlayerPosition = useWorldStore((s) => s.setPlayerPosition);

  useFrame((_, delta) => {
    const orbit = consumeOrbitDelta();
    azimuth.current -= orbit.x * ORBIT_SENSITIVITY;
    polar.current = THREE.MathUtils.clamp(polar.current - orbit.y * ORBIT_SENSITIVITY, MIN_POLAR, MAX_POLAR);

    // Forward direction is derived from the camera's azimuth only (not
    // polar), so moving "forward" walks along the ground regardless of
    // how much the player has tilted the camera up/down — matching how
    // third-person mobile games conventionally decouple look pitch from
    // movement direction.
    const forward = new THREE.Vector3(Math.sin(azimuth.current), 0, Math.cos(azimuth.current));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    const moveDistance = MOVE_SPEED * delta;
    playerPos.current.addScaledVector(forward, mobileInput.moveY * moveDistance);
    playerPos.current.addScaledVector(right, mobileInput.moveX * moveDistance);

    // Orbit camera around the player at a fixed distance/height ratio
    // derived from the current polar angle.
    const horizontalDistance = CAMERA_DISTANCE * Math.cos(polar.current);
    const verticalOffset = CAMERA_HEIGHT + CAMERA_DISTANCE * Math.sin(polar.current);
    camera.position.set(
      playerPos.current.x - Math.sin(azimuth.current) * horizontalDistance,
      playerPos.current.y + verticalOffset,
      playerPos.current.z - Math.cos(azimuth.current) * horizontalDistance,
    );
    camera.lookAt(playerPos.current.x, playerPos.current.y + 1, playerPos.current.z);

    // Push position to the store every frame: Zustand setters are cheap
    // and nothing subscribes to playerPosition for 3D rendering (see
    // worldStore.ts's header note) — useWorldSave.ts reads it via
    // getState() on its own timer, not via a subscription, so this
    // frequent write does not itself cause extra renders anywhere.
    setPlayerPosition([playerPos.current.x, playerPos.current.y, playerPos.current.z]);
  });

  return null;
}
