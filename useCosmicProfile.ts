/**
 * useCosmicProfile.
 *
 * Loads the player's cosmic profile once a session exists, and exposes
 * a create function for the onboarding flow's final step. Mirrors the
 * result into cosmicProfileStore so any screen can read the chart
 * without each one independently querying Supabase.
 */

import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../state/authStore';
import { useCosmicProfileStore } from '../state/cosmicProfileStore';
import { getMyCosmicProfile, createCosmicProfile } from '../lib/cosmicProfile';
import type { CreateCosmicProfileInput } from '../types/cosmicProfile';

export function useCosmicProfile() {
  const userId = useAuthStore((s) => s.userId);
  const profile = useCosmicProfileStore((s) => s.profile);
  const loading = useCosmicProfileStore((s) => s.loading);
  const setProfile = useCosmicProfileStore((s) => s.setProfile);
  const setLoading = useCosmicProfileStore((s) => s.setLoading);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getMyCosmicProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [userId, setProfile, setLoading]);

  const create = useCallback(
    async (input: CreateCosmicProfileInput) => {
      const created = await createCosmicProfile(input);
      setProfile(created);
      return created;
    },
    [setProfile],
  );

  return { profile, loading, createCosmicProfile: create };
}
