/**
 * Auth store.
 *
 * Mirrors the current Supabase session. This store is populated by
 * src/hooks/useAuthSession.ts (which subscribes to
 * supabase.auth.onAuthStateChange), never written to directly from a
 * component — components read this store, they don't mutate it.
 */

import { create } from 'zustand';
import type { ProfileRow } from '../types/identity';

interface AuthStore {
  userId: string | null;
  email: string | null;
  profile: ProfileRow | null;
  sessionLoading: boolean;
  /** Whether session_started has already been tracked for this app load — see useSessionTracking.ts for why this lives here rather than in a component ref (AuthGate remounts on every route navigation, which would otherwise reset a local ref). */
  sessionTracked: boolean;
  setSession: (userId: string | null, email: string | null) => void;
  setProfile: (profile: ProfileRow | null) => void;
  setSessionLoading: (loading: boolean) => void;
  markSessionTracked: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  userId: null,
  email: null,
  profile: null,
  sessionLoading: true,
  sessionTracked: false,
  setSession: (userId, email) => set({ userId, email }),
  setProfile: (profile) => set({ profile }),
  setSessionLoading: (sessionLoading) => set({ sessionLoading }),
  markSessionTracked: () => set({ sessionTracked: true }),
}));
