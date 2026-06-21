/**
 * Analytics tracking.
 *
 * trackEvent is the ONE function every NORMAL instrumentation point in
 * this codebase calls — see grep for `trackEvent(` to find every place
 * an event actually fires, rather than each call site constructing its
 * own insert. Fire-and-forget by design: a dropped analytics call must
 * never surface as a user-visible error or block whatever gameplay
 * action it's attached to.
 *
 * trackEventViaBeacon is a SEPARATE path, used only by
 * useSessionTracking.ts for session_ended. It exists because
 * trackEvent goes through the Supabase JS client's internal fetch(),
 * which is not guaranteed to complete once a page is being unloaded or
 * backgrounded — exactly the moment session_ended needs to fire.
 * navigator.sendBeacon is the browser API built for that moment, but it
 * cannot attach a custom Authorization header, so it must hit
 * PostgREST's REST endpoint directly (bypassing the Supabase client)
 * and the receiving row must be one RLS already allows to insert with
 * a null user_id — see supabase/migrations/007's policy comment for
 * the full reasoning and why this is correctly scoped rather than a
 * general auth bypass.
 *
 * user_id is nullable (see migration 007) specifically so
 * onboarding_started can fire from the age-gate step, before a
 * Supabase Auth session exists at all — the funnel's true top is
 * "opened onboarding," not "signed in," and underreporting the
 * earliest drop-off point would make the funnel numbers misleading
 * about where players are actually leaving.
 */

import { supabase } from './supabaseClient';
import type { AnalyticsEventName } from '../types/analytics';

export async function trackEvent(eventName: AnalyticsEventName, properties: Record<string, unknown> = {}): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id ?? null;

    const { error } = await supabase.from('analytics_events').insert({
      user_id: userId,
      event_name: eventName,
      properties,
    });
    if (error) console.warn('[analytics] failed to track event', eventName, error);
  } catch (err) {
    console.warn('[analytics] failed to track event', eventName, err);
  }
}

/**
 * Send an analytics event via navigator.sendBeacon, for the one case
 * (session_ended) where the call happens during page unload/background
 * and a normal fetch-based insert risks being cancelled mid-flight.
 *
 * Always inserts with user_id: null (see migration 007's RLS policy —
 * this is the only shape an unauthenticated sendBeacon request can
 * satisfy). The real player's id is carried as `userId` inside
 * `properties` instead — informational only, useful for later manual
 * inspection of the row, but never relied on for access control or for
 * attributing the row to a specific player in any query this codebase
 * runs.
 *
 * Falls back to a no-op (not an error) if sendBeacon isn't available
 * (e.g. a non-browser test environment) — this path is best-effort by
 * nature, consistent with trackEvent's own fire-and-forget contract.
 */
export function trackEventViaBeacon(eventName: AnalyticsEventName, properties: Record<string, unknown> = {}): void {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return;

  // PostgREST's REST endpoint, hit directly rather than through the
  // Supabase client — sendBeacon cannot carry the client's normal
  // Authorization/apikey headers, so this request authenticates as the
  // anon role no matter what. The apikey query parameter is PostgREST's
  // documented way to identify the calling project even for anon
  // requests; it is NOT a substitute for the Authorization header and
  // does not grant authenticated-role access.
  const endpoint = `${supabaseUrl}/rest/v1/analytics_events?apikey=${encodeURIComponent(anonKey)}`;

  const body = JSON.stringify({
    user_id: null,
    event_name: eventName,
    properties,
  });

  try {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(endpoint, blob);
  } catch (err) {
    console.warn('[analytics] failed to send beacon event', eventName, err);
  }
}
