/**
 * Currency ledger data access.
 *
 * earnCurrency is the only write path — see
 * supabase/migrations/006's header for why this is append-only. There
 * is deliberately no spendCurrency in this phase (nothing to spend on
 * yet); when one is added later, it should insert a NEGATIVE amount
 * row, never mutate or delete an existing one.
 */

import { supabase } from './supabaseClient';

export interface EarnCurrencyInput {
  amount: number;
  reason: string;
  refId?: string;
}

export async function earnCurrency(input: EarnCurrencyInput): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error('Cannot earn currency without an active session');

  const { error } = await supabase.from('currency_ledger').insert({
    user_id: userId,
    amount: input.amount,
    reason: input.reason,
    ref_id: input.refId ?? null,
  });
  if (error) throw error;
}

export async function getMyBalance(): Promise<number> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return 0;

  const { data, error } = await supabase
    .from('currency_balances')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.balance ?? 0;
}
