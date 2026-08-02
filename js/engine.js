// Typing engine shared by the practice and lyrics screens.
//
// One keystroke = one codepoint, which is exactly right for Kedmanee: Thai tone
// marks and above/below vowels each have their own key. Errors do not block
// progress (you type on and see the red cell), matching the design doc.

import { lookupAny, clusters } from './layouts.js';

export class Engine extends EventTarget {
  constructor(text, lang) {
    super();
    this.reset(text, lang);
  }

  reset(text = this.text, lang = this.lang) {
    this.text = text;
    this.lang = lang;
    this.chars = [...text];
    this.clusters = clusters(text);
    this.typed = [];
    this.times = [];
    this.wrongAt = new Set();
    this.errors = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.t0 = null;
    this.tEnd = null;
    this.samples = [];
    this.keyHits = { th: {}, en: {} };
    this.keyMisses = { th: {}, en: {} };
    this.finished = false;
    this.emit();
  }

  get done() { return this.typed.length; }
  get total() { return this.chars.length; }
  get progress() { return this.total ? this.typed.length / this.total : 0; }

  get seconds() {
    if (!this.t0) return 0;
    return ((this.tEnd || Date.now()) - this.t0) / 1000;
  }

  /**
   * Live speed. Suppressed for the first moments of a run, where dividing by a
   * near-zero elapsed time produces a meaningless four-digit number in the HUD.
   * The recorded result uses `finalWpm`, which has no such guard.
   */
  get wpm() {
    const s = this.seconds;
    if (s < 0.6) return 0;
    return this.finalWpm;
  }

  get finalWpm() {
    const s = this.seconds;
    if (s <= 0) return 0;
    return Math.max(0, Math.round((this.typed.length / 5) / (s / 60)));
  }

  get accuracy() {
    const n = this.typed.length;
    if (!n) return 100;
    return Math.max(0, Math.round(((n - this.errors) / n) * 100));
  }

  /**
   * Speed over the last `window` keystrokes rather than from t0. The cumulative
   * figure is useless in the opening second of a run; this is what the results
   * chart plots.
   */
  rollingWpm(window = 8) {
    const n = this.times.length;
    if (n < 2) return 0;
    const k = Math.min(window, n - 1);
    const minutes = (this.times[n - 1] - this.times[n - 1 - k]) / 60000;
    if (minutes <= 0) return 0;
    return Math.round((k / 5) / minutes);
  }

  /** Codepoint the learner should press next, or null at the end. */
  get nextChar() { return this.chars[this.typed.length] ?? null; }

  /** Physical key, shift state and owning layout for the next character. */
  get nextKey() {
    const ch = this.nextChar;
    return ch === null ? null : lookupAny(this.lang, ch);
  }

  /** Was the most recent keystroke wrong? */
  get lastWrong() {
    const i = this.typed.length - 1;
    return i >= 0 && this.wrongAt.has(i);
  }

  /** Index of the cluster containing the caret. */
  get cursorCluster() {
    const i = this.typed.length;
    for (let c = 0; c < this.clusters.length; c++) {
      if (i < this.clusters[c].end) return c;
    }
    return this.clusters.length;
  }

  backspace() {
    if (this.finished || !this.typed.length) return;
    const i = this.typed.length - 1;
    if (this.wrongAt.has(i)) { this.wrongAt.delete(i); this.errors--; }
    this.typed.pop();
    this.times.pop();
    this.combo = 0;
    this.emit();
  }

  /** Feed one character. Returns {ok, finished} or null when ignored. */
  press(ch) {
    if (this.finished || this.typed.length >= this.chars.length) return null;
    const i = this.typed.length;
    const expected = this.chars[i];
    const ok = ch === expected;
    const now = Date.now();
    if (!this.t0) this.t0 = now;
    this.times.push(now);

    this.typed.push(ch);
    const key = lookupAny(this.lang, expected);
    // Key stats are per-layout, so a latin key inside a Thai drill is credited
    // to the QWERTY map rather than polluting the Kedmanee heatmap.
    const id = key ? key.id : expected;
    const bucket = key ? key.lang : this.lang;
    if (ok) {
      this.keyHits[bucket][id] = (this.keyHits[bucket][id] || 0) + 1;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
    } else {
      this.keyMisses[bucket][id] = (this.keyMisses[bucket][id] || 0) + 1;
      this.wrongAt.add(i);
      this.errors++;
      this.combo = 0;
    }

    this.samples.push({ at: this.seconds, wpm: this.rollingWpm(), ok });

    if (this.typed.length >= this.chars.length) {
      this.finished = true;
      this.tEnd = Date.now();
    }
    this.emit();
    return { ok, finished: this.finished };
  }

  /** Down-sample the keystroke trace into `n` bars for the results chart. */
  chartBars(n = 16) {
    if (!this.samples.length) return [];
    const out = [];
    const per = this.samples.length / n;
    for (let i = 0; i < n; i++) {
      const slice = this.samples.slice(Math.floor(i * per), Math.max(Math.floor((i + 1) * per), Math.floor(i * per) + 1));
      if (!slice.length) continue;
      out.push({
        wpm: Math.round(slice.reduce((a, s) => a + s.wpm, 0) / slice.length),
        err: slice.some((s) => !s.ok),
      });
    }
    return out;
  }

  summary() {
    return {
      wpm: this.finalWpm,
      acc: this.accuracy,
      seconds: this.seconds,
      combo: this.bestCombo,
      samples: this.chartBars(16),
      keyHits: this.keyHits,
      keyMisses: this.keyMisses,
    };
  }

  emit() { this.dispatchEvent(new Event('change')); }
}

/**
 * Should this keydown be treated as a character?
 * Filters out modifiers, F-keys, arrows and browser shortcuts.
 */
export function isTypingKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  return [...e.key].length === 1;
}
