/**
 * Consent data access.
 *
 * recordConsent INSERTS a new row rather than updating an existing one
 * — consent_records is append-only by design (supabase/migrations/001's
 * comment explains why: an audit trail of what was granted/revoked and
 * when, never overwritten). getCurrentConsent reads the
 * current_consent VIEW, which already resolves "most recent row per
 * tier" so callers never have to do that resolution themselves.
 */

import { supabase } from './supabaseClient';
import type { ConsentTier, CurrentConsentRow } from '../types/identity';

export async function recordConsent(tier: ConsentTier, granted: boolean): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error('Cannot record consent without an active session');

  const { error } = await supabase.from('consent_records').insert({ user_id: userId, tier, granted });
  if (error) throw error;
}

export async function getCurrentConsent(): Promise<CurrentConsentRow[]> {
  const { data, error } = await supabase.from('current_consent').select('*');
  if (error) throw error;
  return data ?? [];
}
