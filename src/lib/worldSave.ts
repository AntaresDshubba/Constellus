/**
 * Save system data access.
 *
 * One row per (user, world), upserted on every save rather than
 * inserted fresh each time — supabase/migrations/004's primary key is
 * (user_id, zodiac_sign), so an upsert is the natural fit: the first
 * save creates the row, every later save in the same world overwrites
 * the same row's position/progress fields.
 *
 * Save frequency/triggering (autosave interval, save-on-pause, etc.) is
 * a UI-layer concern handled by the caller (see
 * src/hooks/useWorldSave.ts) — this file only knows how to read and
 * write one save record, not when that should happen.
 */

import { supabase } from './supabaseClient';
import type { WorldSaveRow } from '../types/world';
import type { ZodiacSign } from '../types/astrology';

export async function getWorldSave(zodiacSign: ZodiacSign): Promise<WorldSaveRow | null> {
  const { data, error } = await supabase
    .from('world_saves')
    .select('*')
    .eq('zodiac_sign', zodiacSign)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface SaveWorldStateInput {
  zodiacSign: ZodiacSign;
  position: [number, number, number];
  progress: Record<string, unknown>;
}

export async function saveWorldState(input: SaveWorldStateInput): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error('Cannot save world state without an active session');

  const { error } = await supabase.from('world_saves').upsert({
    user_id: userId,
    zodiac_sign: input.zodiacSign,
    position_x: input.position[0],
    position_y: input.position[1],
    position_z: input.position[2],
    progress_json: input.progress,
  });
  if (error) throw error;
}
