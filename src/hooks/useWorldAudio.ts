/**
 * useWorldAudio.
 *
 * Drives the procedural ambient engine for the world the player is in,
 * switching the modal pad whenever the sign changes. Off by default and
 * persisted in localStorage, so it respects browser autoplay policy (the
 * AudioContext only resumes inside the user gesture that toggles it on)
 * and never surprises a player with sound. Disposes the engine on unmount.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createAmbientEngine, type AmbientEngine } from '../lib/audio/ambientEngine';
import { worldAudioProfile } from '../lib/gameLogic/worldAudio';
import type { ZodiacSign } from '../types/astrology';

const STORAGE_KEY = 'astroverse:audio-enabled';

function readEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'on'; } catch { return false; }
}

export function useWorldAudio(sign: ZodiacSign) {
  const [enabled, setEnabled] = useState<boolean>(readEnabled);
  const engineRef = useRef<AmbientEngine | null>(null);

  useEffect(() => () => {
    engineRef.current?.dispose();
    engineRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) {
      engineRef.current?.stop();
      return;
    }
    if (!engineRef.current) engineRef.current = createAmbientEngine();
    engineRef.current.play(worldAudioProfile(sign));
  }, [enabled, sign]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off'); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  return { enabled, toggle, profile: worldAudioProfile(sign) };
}
