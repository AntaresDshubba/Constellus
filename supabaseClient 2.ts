/**
 * Supabase client.
 *
 * A single client instance for the whole app. The anon key used here is
 * safe to ship in client code by design — Supabase's security model is
 * Row Level Security policies (see supabase/migrations), evaluated by
 * Postgres itself against the authenticated user's auth.uid(), not
 * secrecy of this key. Every table this app touches has RLS enabled with
 * explicit per-table policies; there is no table a signed-in user can
 * read or write outside what its policies allow, regardless of what the
 * client code asks for.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in your Supabase project values.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
