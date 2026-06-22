/**
 * Base Layer orchestration.
 *
 * Technical Bible B.8.2: the Base Layer is generated ONCE per (player,
 * world) and never regenerated — regenerating would change a player's
 * world out from under them. getOrGenerateBaseLayerWorld enforces this:
 * it checks for an existing row first and only calls the deterministic
 * generator (./abyssia.ts) on a true first visit.
 *
 * This phase only ever calls this with zodiacSign='scorpio', since
 * Abyssia is the one playable world — but the function itself doesn't
 * hardcode that, so Phase 4 adding the other eleven signs is a matter of
 * adding their generator files and a switch branch here, not changing
 * this orchestration function's shape.
 */

import { supabase } from '../supabaseClient';
import { generateAbyssiaWorld } from './abyssia';
import type { BaseLayerWorldRow, WorldDescriptor } from '../../types/world';
import type { ZodiacSign } from '../../types/astrology';

function generateWorldForSign(seed: string, sign: ZodiacSign): WorldDescriptor {
  switch (sign) {
    case 'scorpio':
      return generateAbyssiaWorld(seed);
    default:
      throw new Error(
        `No world generator implemented for ${sign} yet — this build only implements Scorpio (Abyssia). ` +
        'Adding a new sign means adding a sibling generator file under src/lib/worldGen/ and a case here.',
      );
  }
}

 * All twelve signs are generatable: generateWorld (./generateWorld.ts)
 * combines the per-sign content profile (./signWorlds.ts) with the seed,
 * so this orchestration function is sign-agnostic — it persists whatever
 * world the deterministic generator returns, once, and never regenerates.
 */

import { supabase } from '../supabaseClient';
import { generateWorld } from './generateWorld';
import type { BaseLayerWorldRow } from '../../types/world';
import type { ZodiacSign } from '../../types/astrology';

export async function getOrGenerateBaseLayerWorld(zodiacSign: ZodiacSign): Promise<BaseLayerWorldRow> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error('Cannot generate a Base Layer world without an active session');

  const { data: existing, error: selectError } = await supabase
    .from('base_layer_worlds')
    .select('*')
    .eq('user_id', userId)
    .eq('zodiac_sign', zodiacSign)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;

  // First visit: derive a stable seed from (userId, sign) — NOT from
  // Date.now() or anything time-dependent, since the seed itself must
  // be reproducible if this row is ever lost and needs reconstruction,
  // and because the seed is what makes generateWorldForSign's output
  // depend only on who the player is, not when they happened to visit.
  const seed = `${userId}:${zodiacSign}`;
  const worldDescriptor = generateWorldForSign(seed, zodiacSign);
  // and because the seed is what makes generateWorld's output
  // depend only on who the player is, not when they happened to visit.
  const seed = `${userId}:${zodiacSign}`;
  const worldDescriptor = generateWorld(seed, zodiacSign);

  const { data: inserted, error: insertError } = await supabase
    .from('base_layer_worlds')
    .insert({ user_id: userId, zodiac_sign: zodiacSign, seed, world_json: worldDescriptor })
    .select()
    .single();
  if (insertError) throw insertError;
  return inserted;
}
