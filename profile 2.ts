/**
 * Profile data access.
 *
 * Every function here operates on "the current user's own profile" —
 * there is no function that takes an arbitrary userId parameter, since
 * RLS would reject any cross-user read/write anyway and a function
 * signature that implied otherwise would be misleading.
 */

import { supabase } from './supabaseClient';
import type { ProfileRow } from '../types/identity';

export async function getMyProfile(): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw error;
  return data;
}

export async function markOnboardingComplete(): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error('Cannot mark onboarding complete without an active session');

  const { error } = await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', userId);
  if (error) throw error;
}
