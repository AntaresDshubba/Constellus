/**
 * Auth.
 *
 * Thin wrapper over Supabase Auth. Supabase handles password/OTP/OAuth
 * issuance and verification entirely — there is no custom JWT signing
 * anywhere in this codebase (contrast the earlier Fastify-based
 * foundation, which had to implement apps/server/src/lib/tokens.ts by
 * hand). This file exists only to give the rest of the app a small,
 * typed surface rather than calling supabase.auth.* directly from every
 * component.
 *
 * Email OTP (a one-time passcode emailed to the player, no password to
 * remember or leak) is used here as the sign-in method, consistent with
 * Technical Bible B.9's "passwordless email" requirement.
 */

import { supabase } from './supabaseClient';
import type { AgeGroup } from '../types/identity';

export async function signUpOrSignInWithEmail(email: string, ageGroup: AgeGroup): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // age_group travels in user metadata so the handle_new_user()
      // trigger (supabase/migrations/001) can read it when creating the
      // profiles row in the same transaction as auth.users — see that
      // migration's trigger for the other half of this.
      data: { age_group: ageGroup },
      // Supabase's default email sends a magic LINK (editing it to send a
      // 6-digit code requires custom SMTP). So support the link: send the
      // player back to wherever this app is actually running, not the
      // project's default Site URL. This origin must be in the Supabase
      // redirect allowlist (Auth -> URL Configuration). detectSessionInUrl
      // (on by default in supabaseClient) then establishes the session
      // from the returned URL, and OnboardingScreen resumes at birth data.
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  if (error) throw error;
}

export async function verifyOtp(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
