// Progress store. Everything lives in one localStorage key so a run is
// resumable across reloads; both languages roll into one combined score.

import { chapters, chapter, drillCount, typedDrillCount } from './content.js';
import { thaiLayoutId } from './layouts.js';

/**
 * Progress is kept per *layout* for Thai, not just per language: Kedmanee and
 * Pattachote put the letters in different places, so a cleared drill, a ghost
 * and a per-key miss rate mean nothing when carried across. Screens keep asking
 * for 'th' and get whichever track is active.
 */
export const track = (lang) =>
  (lang === 'th' ? (thaiLayoutId() === 'pattachote' ? 'th_pat' : 'th') : 'en');

const KEY = 'tuktype.v1';
const today = () => new Date().toISOString().slice(0, 10);

const blankLang = () => ({
  chapter: 1,
  drill: 0,
  cleared: [],          // "chapter:drill" strings
  points: 0,
  bestWpm: 0,
  bestAcc: 0,
  runs: 0,
  history: [],          // [{day, wpm, acc, points}]
});

const blank = () => ({
  v: 1,
  onboarded: false,
  name: 'พ',
  layout: 'kedmanee',
  langs: ['th', 'en'],
  sound: true,
  haptics: true,
  showKeyboard: true,
  dense: false,
  dailyGoal: 5,
  streak: { count: 0, best: 0, last: null },
  day: { date: today(), runs: 0, seconds: 0 },
  progress: { th: blankLang(), th_pat: blankLang(), en: blankLang() },
  ghosts: {},           // "th:3:4" -> best wpm for that drill
  stars: {},            // "th:3:4" -> best star count 1..5
  keyStats: { th: {}, th_pat: {}, en: {} },
  arcade: { high: 0, level: 1 },
  lastRun: null,
});

function migrate(raw) {
  const base = blank();
  if (!raw || raw.v !== 1) return base;
  const s = { ...base, ...raw };
  s.progress = {
    th: { ...blankLang(), ...(raw.progress?.th || {}) },
    th_pat: { ...blankLang(), ...(raw.progress?.th_pat || {}) },
    en: { ...blankLang(), ...(raw.progress?.en || {}) },
  };
  s.streak = { ...base.streak, ...(raw.streak || {}) };
  s.day = { ...base.day, ...(raw.day || {}) };
  s.keyStats = {
    th: raw.keyStats?.th || {},
    th_pat: raw.keyStats?.th_pat || {},
    en: raw.keyStats?.en || {},
  };
  s.stars = raw.stars || {};
  s.arcade = { ...base.arcade, ...(raw.arcade || {}) };
  return s;
}

let state;
try {
  state = migrate(JSON.parse(localStorage.getItem(KEY) || 'null'));
} catch {
  state = blank();
}

const subs = new Set();
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  subs.forEach((fn) => fn(state));
}

export const get = () => state;
/** The progress record for a language, resolved through the active layout. */
export const progressOf = (lang) => state.progress[track(lang)];
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export function update(fn) { fn(state); persist(); }
export function reset() { state = blank(); persist(); }

/** Roll the day/streak counters forward if the calendar day changed. */
export function rollDay() {
  const d = today();
  if (state.day.date === d) return;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (state.day.runs > 0) {
    // yesterday counted — extend or start the streak
    state.streak.count = state.streak.last === yesterday || state.streak.last === state.day.date
      ? state.streak.count : state.streak.count;
  }
  if (state.streak.last && state.streak.last !== yesterday && state.streak.last !== d) {
    state.streak.count = 0;
  }
  state.day = { date: d, runs: 0, seconds: 0 };
  persist();
}

function creditStreak() {
  const d = today();
  if (state.streak.last === d) return;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  state.streak.count = state.streak.last === yesterday ? state.streak.count + 1 : 1;
  state.streak.last = d;
  state.streak.best = Math.max(state.streak.best, state.streak.count);
}

export const combinedScore = () => progressOf('th').points + progressOf('en').points;

export const TIERS = [
  { at: 0, th: 'ผู้เริ่มต้น', en: 'Beginner' },
  { at: 150, th: 'นักพิมพ์ฝึกหัด', en: 'Apprentice' },
  { at: 400, th: 'นักพิมพ์คล่อง', en: 'Fluent Typist' },
  { at: 800, th: 'นักพิมพ์สองภาษา', en: 'Bilingual Typist' },
  { at: 1600, th: 'ยอดนักพิมพ์', en: 'Master Typist' },
];

export function tier() {
  const s = combinedScore();
  let i = 0;
  TIERS.forEach((t, ix) => { if (s >= t.at) i = ix; });
  return { ...TIERS[i], index: i + 1 };
}

export const isCleared = (lang, ch, drill) =>
  progressOf(lang).cleared.includes(`${ch}:${drill}`);

export const chapterProgress = (lang, ch) => {
  const total = drillCount(lang, ch);
  const done = progressOf(lang).cleared.filter((k) => k.startsWith(`${ch}:`)).length;
  return { done, total, complete: done >= total };
};

export const chapterState = (lang, ch) => {
  const p = progressOf(lang);
  if (chapterProgress(lang, ch).complete) return 'done';
  if (ch === p.chapter) return 'current';
  if (ch < p.chapter) return 'partial';
  if (ch === p.chapter + 1) return 'next';
  return 'locked';
};

export const ghostKey = (lang, ch, drill) => `${track(lang)}:${ch}:${drill}`;
export const ghostWpm = (lang, ch, drill) => state.ghosts[ghostKey(lang, ch, drill)] || 0;

// ── Stars ──────────────────────────────────────────────────────────────────
// Accuracy gates every tier, speed only decides how far up you go. You cannot
// buy a 5 by typing fast and sloppy — which is the whole point, since sloppy
// fast typing is the habit a tutor exists to prevent.
export const PASS_ACCURACY = 85;
const STAR_TIERS = [
  { stars: 5, acc: 98, speed: 1.0 },
  { stars: 4, acc: 95, speed: 0.8 },
  { stars: 3, acc: 92, speed: 0.6 },
  { stars: 2, acc: 88, speed: 0.4 },
  { stars: 1, acc: PASS_ACCURACY, speed: 0 },
];

export const goalWpm = (lang, ch) => chapter(lang, ch).goalWpm || 25;

/** 0 = failed the drill; 1..5 otherwise. */
export function starsFor({ lang, chapterId, wpm, acc }) {
  const goal = goalWpm(lang, chapterId);
  const ratio = goal > 0 ? wpm / goal : 0;
  for (const t of STAR_TIERS) {
    if (acc >= t.acc && ratio >= t.speed) return t.stars;
  }
  return 0;
}

export const starsAt = (lang, ch, drill) => state.stars[ghostKey(lang, ch, drill)] || 0;

/** Stars earned in a chapter, and the most it could hold. Tips carry no stars. */
export function chapterStars(lang, ch) {
  const total = drillCount(lang, ch);
  let earned = 0;
  for (let d = 0; d < total; d++) earned += starsAt(lang, ch, d);
  const max = typedDrillCount(lang, ch) * 5;
  return { earned, max, mastered: max > 0 && earned === max };
}

/**
 * Acknowledge a teaching card. It clears like a drill so the cursor moves on,
 * but earns no stars and no points — you did not type anything.
 */
export function commitTip({ lang, chapterId, drill }) {
  rollDay();
  const p = progressOf(lang);
  if (!isCleared(lang, chapterId, drill)) p.cleared.push(`${chapterId}:${drill}`);
  const total = drillCount(lang, chapterId);
  const next = drill + 1;
  if (next >= total) {
    p.chapter = Math.min(chapters(lang).length, chapterId + 1);
    p.drill = 0;
  } else if (chapterId === p.chapter) {
    p.drill = Math.max(p.drill, next);
  }
  persist();
  return { next: next < total ? next : null };
}

export const totalStars = () =>
  Object.values(state.stars).reduce((a, n) => a + n, 0);

/** Points for a completed drill: speed x accuracy, with a first-clear bonus. */
export function scoreRun({ wpm, acc, chapterId, drill, lang }) {
  const base = Math.round((wpm * (acc / 100) * (acc / 100)) / 2);
  const first = isCleared(lang, chapterId, drill) ? 0 : 10 + chapterId * 2;
  return Math.max(1, base) + first;
}

/** Commit a finished drill and advance the cursor. Returns a result summary. */
export function commitRun({ lang, chapterId, drill, wpm, acc, seconds, combo, samples, keyHits, keyMisses }) {
  rollDay();
  const p = progressOf(lang);
  const gk = ghostKey(lang, chapterId, drill);
  const prevGhost = state.ghosts[gk] || 0;
  const points = scoreRun({ wpm, acc, chapterId, drill, lang });
  const firstClear = !isCleared(lang, chapterId, drill);
  const stars = starsFor({ lang, chapterId, wpm, acc });
  const prevStars = starsAt(lang, chapterId, drill);
  const passed = stars > 0;

  if (passed) {
    if (firstClear) p.cleared.push(`${chapterId}:${drill}`);
    const total = drillCount(lang, chapterId);
    const nextDrill = drill + 1;
    if (nextDrill >= total) {
      const maxCh = chapters(lang).length;
      p.chapter = Math.min(maxCh, chapterId + 1);
      p.drill = 0;
    } else if (chapterId === p.chapter) {
      p.drill = Math.max(p.drill, nextDrill);
    }
  }

  p.points += passed ? points : Math.round(points / 3);
  p.runs += 1;
  p.bestWpm = Math.max(p.bestWpm, wpm);
  p.bestAcc = Math.max(p.bestAcc, acc);
  p.history.push({ day: today(), wpm, acc, points });
  if (p.history.length > 200) p.history.shift();

  // Only a run that actually passed can set the ghost, or you could "beat your
  // best" by hammering keys at 200 wpm and 40% accuracy.
  if (passed && wpm > prevGhost) state.ghosts[gk] = wpm;
  // Stars only ever go up: a lazy replay cannot take away a 5 you already earned.
  if (stars > prevStars) state.stars[gk] = stars;

  // keyHits/keyMisses arrive bucketed by layout, so a latin key inside a Thai
  // boss drill lands on the QWERTY heatmap where it belongs.
  ['th', 'en'].forEach((l) => {
    const ks = state.keyStats[track(l)];
    Object.entries((keyHits || {})[l] || {}).forEach(([k, n]) => {
      ks[k] = ks[k] || { hit: 0, miss: 0 };
      ks[k].hit += n;
    });
    Object.entries((keyMisses || {})[l] || {}).forEach(([k, n]) => {
      ks[k] = ks[k] || { hit: 0, miss: 0 };
      ks[k].miss += n;
    });
  });

  state.day.runs += 1;
  state.day.seconds += Math.round(seconds);
  noteSession(seconds);
  creditStreak();

  state.lastRun = {
    lang, chapterId, drill, wpm, acc, seconds, combo, samples,
    points: passed ? points : Math.round(points / 3),
    passed, firstClear,
    stars, prevStars, newBestStars: stars > prevStars,
    goal: goalWpm(lang, chapterId),
    ghost: prevGhost,
    beatGhost: passed && prevGhost > 0 && wpm > prevGhost,
    at: Date.now(),
  };
  persist();
  return state.lastRun;
}

/**
 * Weakest keys by miss rate, for the home tile and the practice heatmap.
 * A key you miss 2 times in 120 is not a weak key, so require both a real
 * sample and a miss rate worth coaching about.
 */
const WEAK_RATE = 0.08;
export function weakKeys(lang, n = 5) {
  const ks = state.keyStats[track(lang)] || {};
  return Object.entries(ks)
    .map(([id, v]) => ({ id, ...v, rate: v.miss / Math.max(1, v.hit + v.miss), total: v.hit + v.miss }))
    .filter((k) => k.total >= 6 && k.miss >= 2 && k.rate >= WEAK_RATE)
    .sort((a, b) => b.rate - a.rate || b.miss - a.miss)
    .slice(0, n);
}

/** Last 7 days of points, for the home sparkline. */
export function weekPoints(lang) {
  const days = [...Array(7)].map((_, i) =>
    new Date(Date.now() - (6 - i) * 864e5).toISOString().slice(0, 10));
  const hist = lang ? progressOf(lang).history
    : [...progressOf('th').history, ...progressOf('en').history];
  return days.map((d) => hist.filter((h) => h.day === d).reduce((a, h) => a + h.points, 0));
}

export const avgOf = (lang, field) => {
  const h = progressOf(lang).history.slice(-10);
  if (!h.length) return 0;
  return Math.round(h.reduce((a, x) => a + x[field], 0) / h.length);
};

/**
 * A Dynamic Practice run. It trains weak keys rather than a chapter, so it
 * earns points and feeds the key stats but never clears a drill, moves the
 * chapter cursor, or sets a ghost.
 */
export function commitDynamic({ lang, wpm, acc, seconds, combo, samples, keyHits, keyMisses }) {
  rollDay();
  const p = progressOf(lang);
  const passed = acc >= PASS_ACCURACY;
  const points = Math.max(1, Math.round((wpm * (acc / 100) * (acc / 100)) / 2));

  p.points += passed ? points : Math.round(points / 3);
  p.runs += 1;
  p.bestWpm = Math.max(p.bestWpm, wpm);
  p.history.push({ day: today(), wpm, acc, points });
  if (p.history.length > 200) p.history.shift();

  ['th', 'en'].forEach((l) => {
    const ks = state.keyStats[track(l)];
    Object.entries((keyHits || {})[l] || {}).forEach(([k, n]) => {
      ks[k] = ks[k] || { hit: 0, miss: 0 }; ks[k].hit += n;
    });
    Object.entries((keyMisses || {})[l] || {}).forEach(([k, n]) => {
      ks[k] = ks[k] || { hit: 0, miss: 0 }; ks[k].miss += n;
    });
  });

  state.day.runs += 1;
  state.day.seconds += Math.round(seconds);
  noteSession(seconds);
  creditStreak();

  state.lastRun = {
    lang, chapterId: null, drill: null, dynamic: true,
    wpm, acc, seconds, combo, samples,
    points: passed ? points : Math.round(points / 3),
    passed, stars: 0, ghost: 0, beatGhost: false,
    at: Date.now(),
  };
  persist();
  return state.lastRun;
}

// ── Backup ─────────────────────────────────────────────────────────────────
// Progress lives only in this browser's localStorage, so one cleared cache or
// one new machine loses everything. These two make it portable.

export const exportJSON = () => JSON.stringify(state, null, 2);

/**
 * Replace all progress with a previously exported file. Validates before
 * overwriting — importing a wrong file should fail loudly, not half-apply.
 * Returns { ok } or { ok: false, reason }.
 */
export function importJSON(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { return { ok: false, reason: 'ไฟล์ไม่ใช่ JSON ที่อ่านได้' }; }
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'ไฟล์ว่างหรือรูปแบบไม่ถูกต้อง' };
  if (raw.v !== 1) return { ok: false, reason: `ไฟล์เวอร์ชัน ${raw.v ?? '?'} ไม่ตรงกับเวอร์ชัน 1` };
  if (!raw.progress || typeof raw.progress !== 'object') return { ok: false, reason: 'ไม่พบข้อมูลความคืบหน้าในไฟล์' };
  state = migrate(raw);
  persist();
  return { ok: true };
}

// ── Session pacing ─────────────────────────────────────────────────────────
// Deliberately not persisted: a "session" is this sitting at the keyboard, and
// it should start fresh when you come back tomorrow.
const SESSION_SECONDS = 12 * 60;
const SESSION_DRILLS = 12;
let session = { drills: 0, seconds: 0, suggested: false };

function noteSession(seconds) {
  session.drills += 1;
  session.seconds += Math.max(0, seconds || 0);
}

/** True once per session when the learner has been at it long enough. */
export function shouldSuggestBreak() {
  if (session.suggested) return false;
  return session.seconds >= SESSION_SECONDS || session.drills >= SESSION_DRILLS;
}

export function ackBreak() {
  session = { drills: 0, seconds: 0, suggested: false };
}

/** Mark the prompt as shown so it does not reappear on every results screen. */
export function breakSuggested() { session.suggested = true; }

export const sessionStats = () => ({ ...session });

export function recordArcade(score, level) {
  state.arcade.high = Math.max(state.arcade.high, score);
  state.arcade.level = Math.max(state.arcade.level, level);
  state.day.runs += 1;
  creditStreak();
  persist();
}

rollDay();
