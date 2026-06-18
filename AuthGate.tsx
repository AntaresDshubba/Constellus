/**
 * AuthGate.
 *
 * Decides, for every protected route, whether the player has a session
 * AND a cosmic profile (a completed chart) — if either is missing, they
 * are redirected to /onboarding rather than seeing a broken or empty
 * screen. This is the one place that decision is made; individual
 * screens never independently re-check "is there a session."
 *
 * useAuthSession is mounted HERE (not in App.tsx) so the auth
 * subscription only runs for protected routes — /onboarding itself
 * manages sign-in directly via src/lib/auth.ts and doesn't need this
 * gate's redirect logic applied to itself.
 */

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthSession } from '../hooks/useAuthSession';
import { useCosmicProfile } from '../hooks/useCosmicProfile';
import { useSessionTracking } from '../hooks/useSessionTracking';
import { useAuthStore } from '../state/authStore';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  useAuthSession();
  const userId = useAuthStore((s) => s.userId);
  const sessionLoading = useAuthStore((s) => s.sessionLoading);
  const { profile, loading: profileLoading } = useCosmicProfile();
  useSessionTracking(userId);

  if (sessionLoading || (userId && profileLoading)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#e6e6f0' }}>
        Loading…
      </div>
    );
  }

  if (!userId || !profile) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
