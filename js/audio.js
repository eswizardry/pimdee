// Tiny WebAudio key feedback — a rising triangle blip on a hit, a dull square
// thud on a miss. Ported from the design doc's `beep()`.

import * as store from './store.js';

let ac = null;
const ctx = () => {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
};

export function blip(ok, combo = 0) {
  if (!store.get().sound) return;
  const a = ctx();
  if (!a) return;
  try {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = ok ? 'triangle' : 'square';
    o.frequency.value = ok ? 880 + Math.min(combo, 12) * 24 : 180;
    g.gain.value = 0.035;
    o.connect(g);
    g.connect(a.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + (ok ? 0.06 : 0.12));
    o.stop(a.currentTime + 0.14);
  } catch { /* autoplay policy */ }
}

export function chord(freqs = [523, 659, 784], dur = 0.5) {
  if (!store.get().sound) return;
  const a = ctx();
  if (!a) return;
  try {
    freqs.forEach((f, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.value = 0.0001;
      o.connect(g); g.connect(a.destination);
      const t = a.currentTime + i * 0.06;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  } catch { /* ignore */ }
}

export function buzz(ms = 20) {
  if (store.get().haptics && navigator.vibrate) navigator.vibrate(ms);
}
