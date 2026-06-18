/**
 * WebGL context-loss detection and recovery (R3F flavor).
 *
 * Carries over the same real platform concern the original raw-Three.js
 * foundation's context-recovery module addressed: iOS Safari enforces a
 * per-tab WebGL memory budget and will fire 'webglcontextlost' under
 * memory pressure — a platform behavior, not a symptom of an
 * unoptimized scene, and one that must be handled explicitly rather
 * than left to crash the canvas to black.
 *
 * With R3F, the renderer's canvas is owned by <Canvas> rather than
 * constructed manually, so this module attaches its listeners via the
 * `gl` (WebGLRenderer) handed to <Canvas>'s onCreated callback — see
 * ../r3f-backend/WorldCanvas.tsx for where that wiring happens. The
 * actual GPU-resource rebuild on restore is handled automatically by
 * R3F/Three.js re-uploading the scene graph's resources; this module's
 * job is purely detecting the event and giving the rest of the app
 * (via React state) a hook to show a "reconnecting" indicator and pause
 * gameplay input around it.
 */

export interface ContextRecoveryCallbacks {
  onContextLost: () => void;
  onContextRestored: () => void;
}

export interface ContextRecoveryHandle {
  detach: () => void;
}

/**
 * Attach context-loss/restore listeners to a canvas element. Called
 * exactly once, from WorldCanvas's onCreated, never from individual
 * gameplay components — this is what makes the protection structural
 * rather than a convention someone could forget to add to a new screen.
 */
export function attachContextRecovery(
  canvas: HTMLCanvasElement,
  callbacks: ContextRecoveryCallbacks,
): ContextRecoveryHandle {
  const handleLost = (event: Event) => {
    // preventDefault is REQUIRED by the WebGL spec for the context to
    // be eligible for restoration at all; without this, the browser
    // treats the loss as permanent and 'webglcontextrestored' never
    // fires.
    event.preventDefault();
    console.warn('[nexus-render] WebGL context lost, pausing and awaiting restore');
    callbacks.onContextLost();
  };

  const handleRestored = () => {
    console.log('[nexus-render] WebGL context restored');
    callbacks.onContextRestored();
  };

  canvas.addEventListener('webglcontextlost', handleLost, false);
  canvas.addEventListener('webglcontextrestored', handleRestored, false);

  return {
    detach() {
      canvas.removeEventListener('webglcontextlost', handleLost, false);
      canvas.removeEventListener('webglcontextrestored', handleRestored, false);
    },
  };
}
