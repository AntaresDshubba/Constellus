/**
 * OrbitTouchZone.
 *
 * A full-screen touch surface for camera look/orbit — standard mobile
 * dual-control scheme: left side moves (VirtualJoystick, a separate,
 * smaller absolutely-positioned element layered on top), the rest of
 * the screen drags to look around. Writes accumulated drag delta into
 * ./mobileInput.ts for PlayerController's frame loop to consume, the
 * same high-frequency-bypasses-React pattern as the joystick.
 *
 * Because the joystick is a separate, smaller element positioned on top
 * in z-order, the browser's own touch hit-testing naturally routes a
 * touch that starts on the joystick to the joystick's handlers and
 * everything else to this zone — no explicit stopPropagation
 * coordination between the two components is needed.
 */

import { useRef } from 'react';
import { mobileInput } from './mobileInput';

export function OrbitTouchZone() {
  const lastPosition = useRef<{ x: number; y: number } | null>(null);
  const activeTouchId = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.changedTouches[0];
    if (!touch || activeTouchId.current !== null) return;
    activeTouchId.current = touch.identifier;
    lastPosition.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchMove(e: React.TouchEvent) {
    const touch = Array.from(e.changedTouches).find((t) => t.identifier === activeTouchId.current);
    if (!touch || !lastPosition.current) return;

    const dx = touch.clientX - lastPosition.current.x;
    const dy = touch.clientY - lastPosition.current.y;
    mobileInput.orbitDeltaX += dx;
    mobileInput.orbitDeltaY += dy;
    lastPosition.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const stillActive = Array.from(e.touches).some((t) => t.identifier === activeTouchId.current);
    if (!stillActive) {
      activeTouchId.current = null;
      lastPosition.current = null;
    }
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
    />
  );
}
