/* Every sound is synthesised on the spot with Web Audio: no files to load. */
import { useSettings } from '../state/settings.ts';

let ac: AudioContext | null = null;
let master: GainNode | null = null;

function ctx(): AudioContext | null {
  if (!ac) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ac = new C();
    master = ac.createGain();
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  master!.gain.value = useSettings.getState().volume * 0.5;
  return ac;
}

/** browsers start audio only after a gesture */
export function unlockAudio() { ctx(); }

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, at = 0, slide = 0) {
  const a = ctx();
  if (!a || !master || useSettings.getState().volume <= 0) return;
  const t = a.currentTime + at;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.2, at = 0, hp = 800) {
  const a = ctx();
  if (!a || !master || useSettings.getState().volume <= 0) return;
  const t = a.currentTime + at;
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf;
  f.type = 'highpass';
  f.frequency.value = hp;
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export type Sfx = 'click' | 'chip' | 'win' | 'big' | 'lose' | 'tick' | 'coin' | 'card' | 'dice' | 'boom' | 'bell' | 'ticket' | 'step' | 'lift' | 'shark' | 'alarm' | 'buy' | 'quack';

export function sfx(k: Sfx) {
  switch (k) {
    case 'click': tone(900, 0.05, 'square', 0.08); break;
    case 'chip': tone(2200, 0.04, 'triangle', 0.15); tone(1700, 0.05, 'triangle', 0.1, 0.03); break;
    case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.22, i * 0.08)); break;
    case 'big': [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.3, 'square', 0.12, i * 0.07)); noise(0.6, 0.05, 0.3, 4000); break;
    case 'lose': tone(300, 0.35, 'sawtooth', 0.12, 0, 0.5); break;
    case 'tick': tone(1400, 0.02, 'square', 0.05); break;
    case 'coin': tone(1800, 0.08, 'square', 0.1); tone(2600, 0.2, 'square', 0.08, 0.06); break;
    case 'card': noise(0.06, 0.15, 0, 2500); break;
    case 'dice': for (let i = 0; i < 4; i++) noise(0.04, 0.2, i * 0.07, 1500); break;
    case 'boom': noise(0.8, 0.5, 0, 60); tone(80, 0.6, 'sawtooth', 0.3, 0, 0.3); break;
    case 'bell': [0, 0.25, 0.5].forEach(t => tone(1320, 0.5, 'sine', 0.25, t)); break;
    case 'ticket': tone(1200, 0.1, 'triangle', 0.2); tone(1600, 0.2, 'triangle', 0.2, 0.08); break;
    case 'step': noise(0.03, 0.04, 0, 300); break;
    case 'lift': tone(660, 0.15, 'sine', 0.2); tone(880, 0.3, 'sine', 0.2, 0.15); break;
    case 'shark': tone(110, 0.5, 'sawtooth', 0.2, 0, 0.8); tone(98, 0.6, 'sawtooth', 0.2, 0.4, 0.7); break;
    case 'alarm': tone(880, 0.12, 'square', 0.1); break;
    case 'buy': tone(700, 0.06, 'square', 0.1); tone(1400, 0.12, 'square', 0.1, 0.05); break;
    case 'quack': tone(500, 0.12, 'sawtooth', 0.12, 0, 0.6); break;
  }
}
