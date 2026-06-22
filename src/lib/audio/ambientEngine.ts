/**
 * Procedural ambient audio engine (Web Audio API).
 *
 * Sounds a world's WorldAudioProfile (src/lib/gameLogic/worldAudio.ts) as
 * a soft, slowly-evolving modal pad: one oscillator per voice through a
 * shared low-pass filter, with a slow LFO drifting the cutoff so the bed
 * breathes rather than sitting static. There is no recorded audio — every
 * sound is synthesized at runtime, so there are no assets to ship.
 *
 * All Web Audio lives here (the I/O boundary); the music theory is pure
 * and upstream. Browser autoplay policy means an AudioContext only makes
 * sound after a user gesture, so play() is always reached via a user
 * toggle (see useWorldAudio) and resumes a suspended context. Everything
 * is feature-detected and guarded, so a browser without Web Audio (or an
 * SSR context) simply gets a silent no-op engine rather than an error.
 */

import type { WorldAudioProfile } from '../gameLogic/worldAudio';

export interface AmbientEngine {
  play(profile: WorldAudioProfile): void;
  stop(): void;
  dispose(): void;
}

const MASTER_GAIN = 0.06; // intentionally quiet — an ambient bed, not a focus
const FADE_SECONDS = 1.5;

export function createAmbientEngine(): AmbientEngine {
  const Ctx: typeof AudioContext | undefined =
    typeof window !== 'undefined'
      ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;

  // No Web Audio available: hand back a silent no-op so callers need no
  // special-casing.
  if (!Ctx) {
    return { play: () => {}, stop: () => {}, dispose: () => {} };
  }

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let filter: BiquadFilterNode | null = null;
  let lfo: OscillatorNode | null = null;
  let lfoGain: GainNode | null = null;
  let voices: OscillatorNode[] = [];

  function ensureContext() {
    if (!ctx) {
      ctx = new Ctx!();
      master = ctx.createGain();
      master.gain.value = 0;
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.7;
      filter.connect(master);
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  }

  function stopVoices(fade: number) {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + fade);

    const toStop = voices;
    const lfoToStop = lfo;
    voices = [];
    lfo = null;
    lfoGain = null;
    window.setTimeout(() => {
      for (const v of toStop) {
        try { v.stop(); v.disconnect(); } catch { /* already stopped */ }
      }
      try { lfoToStop?.stop(); lfoToStop?.disconnect(); } catch { /* already stopped */ }
    }, Math.ceil(fade * 1000) + 50);
  }

  function play(profile: WorldAudioProfile) {
    ensureContext();
    if (!ctx || !master || !filter) return;
    // Fade out anything currently sounding, then build the new bed.
    stopVoices(FADE_SECONDS * 0.5);

    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(profile.filterHz, now);

    // Slow LFO drifting the filter cutoff so the pad breathes.
    lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    lfoGain = ctx.createGain();
    lfoGain.gain.value = profile.filterHz * 0.35;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    voices = profile.voiceHz.map((hz, i) => {
      const osc = ctx!.createOscillator();
      osc.type = profile.waveform;
      osc.frequency.value = hz;
      // Tiny per-voice detune for warmth (chorus), deterministic-ish by index.
      osc.detune.value = (i - profile.voiceHz.length / 2) * 4;
      const voiceGain = ctx!.createGain();
      // The sub-octave drone (first voice) sits louder; upper triad softer.
      voiceGain.gain.value = i === 0 ? 0.5 : 0.32;
      osc.connect(voiceGain);
      voiceGain.connect(filter!);
      osc.start();
      return osc;
    });

    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(MASTER_GAIN, now + FADE_SECONDS);
  }

  function stop() {
    stopVoices(FADE_SECONDS);
  }

  function dispose() {
    stopVoices(0.05);
    const toClose = ctx;
    ctx = null;
    master = null;
    filter = null;
    window.setTimeout(() => { try { void toClose?.close(); } catch { /* noop */ } }, 300);
  }

  return { play, stop, dispose };
}
