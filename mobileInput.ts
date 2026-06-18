/**
 * Mobile input state.
 *
 * A plain mutable object, NOT a Zustand store — touch input needs to be
 * read every animation frame inside useFrame
 * (./PlayerController.tsx), and routing 60fps input through React
 * state/Zustand subscriptions would trigger unnecessary re-renders for
 * data that only the frame loop ever reads. The virtual joystick UI
 * (./VirtualJoystick.tsx) writes into this object on touch events; the
 * frame loop reads it imperatively. This is the same "high-frequency
 * data bypasses React's render cycle" pattern worldStore's header
 * comment describes for player position, applied one layer earlier.
 */

export interface MobileInputState {
  /** -1..1, joystick horizontal axis. */
  moveX: number;
  /** -1..1, joystick vertical axis (forward/back). */
  moveY: number;
  /** Accumulated camera-orbit drag delta since last frame read, in pixels. Reset to 0 after each read. */
  orbitDeltaX: number;
  orbitDeltaY: number;
}

export const mobileInput: MobileInputState = {
  moveX: 0,
  moveY: 0,
  orbitDeltaX: 0,
  orbitDeltaY: 0,
};

/** Called by the frame loop once per frame to consume the accumulated orbit delta. */
export function consumeOrbitDelta(): { x: number; y: number } {
  const delta = { x: mobileInput.orbitDeltaX, y: mobileInput.orbitDeltaY };
  mobileInput.orbitDeltaX = 0;
  mobileInput.orbitDeltaY = 0;
  return delta;
}
