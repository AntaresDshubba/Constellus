/**
 * useSessionTracking.
 *
 * Two responsibilities:
 * 1. Fire session_started exactly once per authenticated app load.
 * 2. Capture a start timestamp and reliably fire session_ended (with
 *    real elapsed duration) whenever a continuous foreground stretch
 *    ends — page hide, tab backgrounded, or app closed. One app load
 *    can produce multiple session_ended events if the player
 *    backgrounds and resumes the tab; each one measures one
 *    continuous foreground window, not cumulative wall-clock time
 *    since the app was first opened — see the visibilitychange
 *    handler below for why that distinction matters for the metric.
 *
 * This is what makes "Daily Minimum session length against the 3-5
 * minute target" (Architecture Audit Phase 3 exit criterion) something
 * that can be read out of real data instead of only observed live.
 *
 * Uses authStore's `sessionTracked` flag rather than a local component
 * ref for the start event: AuthGate (the consumer of this hook) is
 * mounted fresh by React Router on every protected-route navigation
 * (Star Map -> World -> Nexus are three separate <AuthGate> elements,
 * not one persistent instance — see src/app/App.tsx), so a plain
 * useRef here would reset on every navigation and massively over-count
 * sessions as "page visits." The Zustand store survives across that
 * remounting, which is exactly the property the start-tracking needs.
 *
 * The end-tracking listeners, by contrast, ARE attached fresh on every
 * mount and removed on every unmount — that's correct here, since what
 * matters is that exactly one set of listeners is active at any given
 * moment, not that the same listener instance persists. Using
 * 'visibilitychange' (hidden) and 'pagehide' together, rather than only
 * 'beforeunload', is deliberate: iOS Safari does not reliably fire
 * beforeunload at all, especially when a tab is backgrounded rather
 * than closed outright, which is the common case for a mobile game.
 */

import { useEffect, useRef } from 'react';
import { trackEvent, trackEventViaBeacon } from '../lib/analytics';
import { useAuthStore } from '../state/authStore';

export function useSessionTracking(userId: string | null): void {
  const sessionTracked = useAuthStore((s) => s.sessionTracked);
  const markSessionTracked = useAuthStore((s) => s.markSessionTracked);
  const sessionStartedAt = useRef<number | null>(null);
  const endedAlreadySent = useRef(false);

  useEffect(() => {
    if (userId && !sessionTracked) {
      markSessionTracked();
      sessionStartedAt.current = Date.now();
      void trackEvent('session_started');
    }
  }, [userId, sessionTracked, markSessionTracked]);

  useEffect(() => {
    if (!userId) return;

    function sendSessionEnded() {
      if (endedAlreadySent.current || sessionStartedAt.current === null) return;
      endedAlreadySent.current = true;
      const durationSeconds = Math.round((Date.now() - sessionStartedAt.current) / 1000);
      trackEventViaBeacon('session_ended', { userId, durationSeconds });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        sendSessionEnded();
      } else if (document.visibilityState === 'visible' && endedAlreadySent.current) {
        // The player backgrounded the tab and came back — rather than
        // leaving sessionStartedAt pointing at the ORIGINAL app-load
        // time (which would make every subsequent session_ended report
        // an ever-growing, mostly-backgrounded duration that doesn't
        // reflect real engaged time), start a fresh window here. This
        // means one app load can produce multiple session_ended
        // events, each measuring one continuous foreground stretch —
        // which is the actual quantity "Daily Minimum session length"
        // is meant to capture, not wall-clock time since the tab was
        // first opened.
        sessionStartedAt.current = Date.now();
        endedAlreadySent.current = false;
      }
    }

    window.addEventListener('pagehide', sendSessionEnded);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', sendSessionEnded);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);
}
