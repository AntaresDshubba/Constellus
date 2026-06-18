/**
 * useAuthSession.
 *
 * The one place this app subscribes to Supabase's auth state. Mounted
 * once, at the app root (src/app/App.tsx), and populates authStore for
 * every other component to read. This hook also loads the profile row
 * once a session exists, since "is there a session" and "does that
 * session's profile exist yet" are both needed before AuthGate
 * (src/app/AuthGate.tsx) can decide where to route the player.
 */

import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getMyProfile } from '../lib/profile';
import { useAuthStore } from '../state/authStore';

export function useAuthSession(): void {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setSessionLoading = useAuthStore((s) => s.setSessionLoading);

  useEffect(() => {
    async function loadProfileForSession(userId: string | null) {
      if (!userId) {
        setProfile(null);
        return;
      }
      try {
        const profile = await getMyProfile();
        setProfile(profile);
      } catch {
        // A transient failure here shouldn't crash the app — AuthGate
        // will simply see profile=null and route to onboarding, which
        // is the safe default; the profile read is retried naturally
        // on the next auth state change or page load.
        setProfile(null);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      setSession(user?.id ?? null, user?.email ?? null);
      loadProfileForSession(user?.id ?? null).finally(() => setSessionLoading(false));
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setSession(user?.id ?? null, user?.email ?? null);
      void loadProfileForSession(user?.id ?? null);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
