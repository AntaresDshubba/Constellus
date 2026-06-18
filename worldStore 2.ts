/**
 * World store.
 *
 * Holds the currently-active world's Base Layer, the composited Transit
 * Overlay, and the player's live position — the pieces every
 * R3F-rendering screen (src/screens/world) needs. Position updates from
 * player movement happen at high frequency (every frame); this store
 * still routes them through a normal Zustand setter for Phase 1's
 * scope, with the renderer reading position imperatively inside the
 * R3F frame loop rather than subscribing to this store's position field
 * for the actual mesh transform — see
 * src/nexus-render/r3f-backend/PlayerController.tsx for where that
 * split happens. The store's position value is the one src/hooks/
 * useWorldSave.ts periodically persists, not a per-frame render input.
 */

import { create } from 'zustand';
import type { BaseLayerWorldRow, OverlayCompositeResult } from '../types/world';

interface WorldStore {
  baseLayer: BaseLayerWorldRow | null;
  overlay: OverlayCompositeResult | null;
  playerPosition: [number, number, number];
  loading: boolean;
  setBaseLayer: (baseLayer: BaseLayerWorldRow | null) => void;
  setOverlay: (overlay: OverlayCompositeResult | null) => void;
  setPlayerPosition: (position: [number, number, number]) => void;
  setLoading: (loading: boolean) => void;
}

export const useWorldStore = create<WorldStore>((set) => ({
  baseLayer: null,
  overlay: null,
  playerPosition: [0, 1, 0],
  loading: true,
  setBaseLayer: (baseLayer) => set({ baseLayer }),
  setOverlay: (overlay) => set({ overlay }),
  setPlayerPosition: (playerPosition) => set({ playerPosition }),
  setLoading: (loading) => set({ loading }),
}));
