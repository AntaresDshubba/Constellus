/**
 * World audio profiles — the pure music theory behind each world's
 * ambient identity.
 *
 * GDD §19.2 "World Audio Identities": each world has a harmonic mode tied
 * to its element (Fire → Lydian/Mixolydian for brightness and tension;
 * Water → Dorian/Aeolian for depth and melancholy), plus a signature
 * timbre. This build has no recorded-audio pipeline, so the "soundtrack"
 * is generated at runtime (src/lib/audio/ambientEngine.ts) from the
 * descriptor this module computes — a sustained modal pad whose mode,
 * root, timbre, and brightness come from the sign's element.
 *
 * Pure: no Web Audio, no I/O. Just maps a sign to the frequencies and
 * tone settings the engine should sound. Element comes from the ephemeris
 * vocabulary (SIGN_ELEMENT), so this never redefines the zodiac.
 */

import { SIGN_ELEMENT } from '../../types/astrology';
import type { Element, ZodiacSign } from '../../types/astrology';

export type Mode = 'ionian' | 'dorian' | 'aeolian' | 'lydian' | 'mixolydian';

// Semitone offsets from the root for each mode's seven scale degrees.
const MODE_INTERVALS: Record<Mode, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

interface ElementAudio {
  mode: Mode;
  /** Root frequency (Hz) of the pad. */
  rootHz: number;
  waveform: OscillatorType;
  /** Low-pass cutoff (Hz): lower = darker/heavier, higher = brighter/airier. */
  filterHz: number;
  description: string;
}

// Element → audio character. Fire/Water modes are the GDD's explicit
// choices; Earth and Air are assigned in the same spirit (Earth grounded
// and modal via Dorian; Air bright and open via Mixolydian/Lydian range).
const ELEMENT_AUDIO: Record<Element, ElementAudio> = {
  fire: { mode: 'lydian', rootHz: 146.83 /* D3 */, waveform: 'sawtooth', filterHz: 1200, description: 'Lydian — bright, with a restless edge' },
  earth: { mode: 'dorian', rootHz: 98.0 /* G2 */, waveform: 'triangle', filterHz: 700, description: 'Dorian — grounded and patient' },
  air: { mode: 'mixolydian', rootHz: 164.81 /* E3 */, waveform: 'sine', filterHz: 1700, description: 'Mixolydian — open and airy' },
  water: { mode: 'aeolian', rootHz: 110.0 /* A2 */, waveform: 'sine', filterHz: 560, description: 'Aeolian — deep and melancholy' },
};

export interface WorldAudioProfile {
  element: Element;
  mode: Mode;
  waveform: OscillatorType;
  filterHz: number;
  /** Sustained pad voices (Hz): a sub-octave drone plus a triad drawn from the mode. */
  voiceHz: number[];
  description: string;
}

export function semitoneToHz(rootHz: number, semitones: number): number {
  return rootHz * Math.pow(2, semitones / 12);
}

export function worldAudioProfile(sign: ZodiacSign): WorldAudioProfile {
  const element = SIGN_ELEMENT[sign];
  const cfg = ELEMENT_AUDIO[element];
  const scale = MODE_INTERVALS[cfg.mode];
  // Triad on scale degrees 1–3–5 (indices 0, 2, 4) gives the mode's own
  // major/minor color; a sub-octave root adds body.
  const triad = [scale[0]!, scale[2]!, scale[4]!].map((s) => semitoneToHz(cfg.rootHz, s));
  return {
    element,
    mode: cfg.mode,
    waveform: cfg.waveform,
    filterHz: cfg.filterHz,
    voiceHz: [cfg.rootHz / 2, ...triad],
    description: cfg.description,
  };
}
