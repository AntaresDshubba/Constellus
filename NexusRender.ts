/**
 * NexusRender — the renderer-agnostic contract (R3F flavor).
 *
 * In the earlier raw-Three.js foundation, NexusRender was an imperative
 * class-based interface (mount/dispose/loadWorld). With React Three
 * Fiber, the renderer IS React — there is no separate imperative handle
 * to mount onto a canvas, since <Canvas> owns that lifecycle. What
 * carries over from the original design is the PRINCIPLE: gameplay
 * screens should depend on a small, stable contract for "what does a
 * world look like," not directly on `three` or `@react-three/fiber`
 * internals scattered through every component.
 *
 * This file defines that contract as data shapes + a small set of hooks
 * (../hooks), not a class. WorldSceneDescriptor is intentionally the
 * SAME kind of renderer-agnostic shape the original design used: it
 * describes WHAT to draw (biomes, landmarks, ambient color), and the R3F
 * scene components (../r3f-backend) are responsible for turning that
 * into actual Three.js objects via React's reconciler. If a different
 * rendering approach were ever needed, this descriptor shape would not
 * need to change — only ../r3f-backend would.
 */

import type { BiomeDescriptor, LandmarkDescriptor, OverlayOperation } from '../../types/world';

export interface WorldSceneDescriptor {
  archetypeTheme: string;
  ambientColorHex: string;
  biomes: BiomeDescriptor[];
  landmarks: LandmarkDescriptor[];
  activeOverlayOperations: OverlayOperation[];
}

export type QualityTier = 'minimal' | 'standard' | 'high';

/**
 * Renderer lifecycle events a screen might care about, independent of
 * any specific Three.js API. Context-loss is the one event Phase 1
 * actually wires end-to-end (../context-recovery); 'frame-budget-
 * exceeded' is reserved for a future device-capability/quality-scaling
 * feature this phase does not implement.
 */
export type NexusRenderEvent = 'context-lost' | 'context-restored';
