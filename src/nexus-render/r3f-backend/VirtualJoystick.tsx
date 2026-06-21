/**
 * VirtualJoystick.
 *
 * A standard mobile-game movement control: a fixed-position base circle
 * with a draggable knob, clamped to a max radius, normalized to -1..1
 * on each axis and written into ./mobileInput.ts on every touch move.
 * This is a plain DOM overlay (not a 3D object) positioned over the
 * WorldCanvas — touch controls are a 2D UI concern layered on top of the
 * 3D scene, not part of the scene graph itself.
 */

import { useRef, useState } from 'react';
import { mobileInput } from './mobileInput';

const BASE_RADIUS = 50;
const KNOB_RADIUS = 22;

export function VirtualJoystick() {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const activeTouchId = useRef<number | null>(null);

  function updateFromTouch(clientX: number, clientY: number) {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > BASE_RADIUS) {
      dx = (dx / distance) * BASE_RADIUS;
      dy = (dy / distance) * BASE_RADIUS;
    }

    setKnobOffset({ x: dx, y: dy });
    mobileInput.moveX = dx / BASE_RADIUS;
    // Inverted: dragging the knob UP (negative screen Y) should mean
    // "move forward" (positive moveY), matching how a joystick's
    // forward direction is conventionally up on screen.
    mobileInput.moveY = -dy / BASE_RADIUS;
  }

  function reset() {
    activeTouchId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    mobileInput.moveX = 0;
    mobileInput.moveY = 0;
  }

  function handleTouchStart(e: React.TouchEvent) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch) return;
    activeTouchId.current = touch.identifier;
    updateFromTouch(touch.clientX, touch.clientY);
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    const touch = Array.from(e.changedTouches).find((t) => t.identifier === activeTouchId.current);
    if (!touch) return;
    updateFromTouch(touch.clientX, touch.clientY);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const stillActive = Array.from(e.touches).some((t) => t.identifier === activeTouchId.current);
    if (!stillActive) reset();
  }

  return (
    <div
      ref={baseRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        position: 'absolute', bottom: 32, left: 32,
        width: BASE_RADIUS * 2, height: BASE_RADIUS * 2,
        borderRadius: '50%', background: 'rgba(230,230,240,0.12)', border: '1px solid rgba(230,230,240,0.25)',
        touchAction: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: BASE_RADIUS - KNOB_RADIUS + knobOffset.x,
          top: BASE_RADIUS - KNOB_RADIUS + knobOffset.y,
          width: KNOB_RADIUS * 2, height: KNOB_RADIUS * 2,
          borderRadius: '50%', background: 'rgba(230,230,240,0.45)',
          transition: knobOffset.x === 0 && knobOffset.y === 0 ? 'left 0.15s, top 0.15s' : 'none',
        }}
      />
    </div>
  );
}
