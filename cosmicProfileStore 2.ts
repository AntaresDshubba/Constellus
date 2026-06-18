/**
 * Cosmic Profile store.
 *
 * Mirrors the player's natal chart once loaded. The chart never changes
 * after creation (cosmic_profiles has no UPDATE policy — see migration
 * 002), so this store is close to a true read-once cache with a single
 * write path: right after createCosmicProfile succeeds during
 * onboarding.
 */

import { create } from 'zustand';
import type { CosmicProfileRow } from '../types/cosmicProfile';

interface CosmicProfileStore {
  profile: CosmicProfileRow | null;
  loading: boolean;
  setProfile: (profile: CosmicProfileRow | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useCosmicProfileStore = create<CosmicProfileStore>((set) => ({
  profile: null,
  loading: true,
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}));
