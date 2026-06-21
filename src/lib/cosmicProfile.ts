/**
 * Cosmic Profile data access.
 *
 * The chart computation itself happens HERE, client-side, by calling
 * @ephemeris's computeNatalChart — there is no server-side compute step
 * in this build (unlike the Fastify foundation's chart.service.ts). This
 * is safe because computeNatalChart is pure and deterministic (see its
 * header comment): the client computing it produces the exact same
 * result a server would, and Supabase's RLS policies on cosmic_profiles
 * (insert-own-only, no update) prevent a player from writing a forged
 * chart for anyone but themselves, even though the computation runs in
 * their own browser.
 */

import { supabase } from './supabaseClient';
import { computeNatalChart } from '@ephemeris/natal';
import type { CreateCosmicProfileInput, CosmicProfileRow } from '../types/cosmicProfile';

export async function createCosmicProfile(input: CreateCosmicProfileInput): Promise<CosmicProfileRow> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error('Cannot create a cosmic profile without an active session');

  const chart = computeNatalChart({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    birthTimezone: input.birthTimezone,
    birthLat: input.locationPrecision === 'precise' ? input.birthLat : undefined,
    birthLng: input.locationPrecision === 'precise' ? input.birthLng : undefined,
  });

  const row = {
    user_id: userId,
    birth_date: input.birthDate,
    birth_time: input.birthTime ?? null,
    birth_timezone: input.birthTimezone,
    birth_lat: input.locationPrecision === 'precise' ? input.birthLat ?? null : null,
    birth_lng: input.locationPrecision === 'precise' ? input.birthLng ?? null : null,
    chart_json: chart,
    sun_sign: chart.sunSign,
    moon_sign: chart.moonSign,
    rising_sign: chart.risingSign,
    house_resolution_state: chart.houseResolutionState,
    personality_tags: input.personalityTags ?? [],
    concern_tags: input.concernTags ?? [],
    goal_tags: input.goalTags ?? [],
  };

  const { data, error } = await supabase.from('cosmic_profiles').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function getMyCosmicProfile(): Promise<CosmicProfileRow | null> {
  const { data, error } = await supabase.from('cosmic_profiles').select('*').maybeSingle();
  if (error) throw error;
  return data;
}
