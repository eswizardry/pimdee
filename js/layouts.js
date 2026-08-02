// Keyboard layouts + Thai text-cluster helpers.
//
// Thai (Kedmanee / เกษมณี) is a 4-level layout: every physical key carries an
// unshifted and a shifted glyph. Rows here are indexed against the matching
// QWERTY row, so `TH_ROWS[r][c]` is produced by the physical key `EN_ROWS[r][c]`.

export const EN_ROWS = ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'];
export const EN_SHIFT = ['~!@#$%^&*()_+', 'QWERTYUIOP{}|', 'ASDFGHJKL:"', 'ZXCVBNM<>?'];

export const TH_ROWS = ['_ๅ/-ภถุึคตจขช', 'ๆไำพะัีรนยบลฃ', 'ฟหกดเ้่าสวง', 'ผปแอิืทมใฝ'];
export const TH_SHIFT = ['%+๑๒๓๔ู฿๕๖๗๘๙', '๐"ฎฑธํ๊ณฯญฐ,ฅ', 'ฤฆฏโฌ็๋ษศซ.', '()ฉฮฺ์?ฒฬฦ'];

// Which finger owns each column, per row. 0=L pinky … 3=L index, 4=R index … 7=R pinky.
const FINGER_COLS = [
  [0, 0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7],
];
export const FINGER_COLORS = ['#A78BFA', '#7DD3FC', '#4ADE80', '#C8F75A', '#C8F75A', '#4ADE80', '#7DD3FC', '#A78BFA'];

// Pattachote (ปัตตะโชติ), transcribed from the `pat` variant in freedesktop's
// xkeyboard-config `symbols/th` — the same table X11 and Wayland ship. Converted
// from X11 keysym names programmatically rather than by hand, and checked: all
// four row lengths match QWERTY exactly, and the home row agrees with an
// independent published layout.
export const TH_PAT_ROWS = ['_=๒๓๔๕ู๗๘๙๐๑๖', '็ตยอร่ดมวแใฌๅ', '้ทงกัีานเไข', 'บปลหิคสะจพ'];
export const TH_PAT_SHIFT = ['฿+"/,?ุ_.()-%', '๊ฤๆญษึฝซถฒฯฦํ', '๋ธำณ์ืผชโฆฑ', 'ฎฏฐภฺศฮฟฉฬ'];

// ── Selectable Thai layouts ────────────────────────────────────────────────
export const THAI_LAYOUTS = {
  kedmanee: { name: 'KEDMANEE', label: 'เกษมณี · Kedmanee', rows: TH_ROWS, shift: TH_SHIFT },
  pattachote: { name: 'PATTACHOTE', label: 'ปัตตะโชติ · Pattachote', rows: TH_PAT_ROWS, shift: TH_PAT_SHIFT },
};

let activeThai = 'kedmanee';

/** Returns the layout actually in force, which may differ from what was asked. */
export function setThaiLayout(id) {
  if (THAI_LAYOUTS[id]) activeThai = id;
  return activeThai;
}
export const thaiLayoutId = () => activeThai;
const thaiLayout = () => THAI_LAYOUTS[activeThai];

const rowsFor = (lang) => (lang === 'th' ? thaiLayout().rows : EN_ROWS);
const shiftFor = (lang) => (lang === 'th' ? thaiLayout().shift : EN_SHIFT);

export const layoutName = (lang) => (lang === 'th' ? thaiLayout().name : 'QWERTY');

/** Rows of keycaps to render for a language. */
export function keyRows(lang) {
  const base = rowsFor(lang);
  const shift = shiftFor(lang);
  return base.map((row, r) => ({
    keys: [...row].map((glyph, c) => ({
      id: EN_ROWS[r][c],
      glyph,
      shiftGlyph: shift[r][c] || '',
      // On Thai caps the small legend is the latin key it sits on; on QWERTY it
      // is the shifted symbol.
      sub: lang === 'th' ? EN_ROWS[r][c] : shift[r][c] || '',
      fingerId: FINGER_COLS[r][c],
      finger: FINGER_COLORS[FINGER_COLS[r][c]],
    })),
  }));
}

/**
 * The keys one finger owns, top row downwards — the column it travels.
 * `rows` limits it to the rows a learner has met so far.
 */
export function fingerColumn(lang, fingerId, rows = [0, 1, 2, 3]) {
  const all = keyRows(lang);
  const out = [];
  for (const r of rows) {
    for (const k of all[r].keys) if (k.fingerId === fingerId) out.push(k.glyph);
  }
  return out;
}

// Finger ids, left to right across both hands. THUMB covers the space bar.
export const L_PINKY = 0, L_RING = 1, L_MIDDLE = 2, L_INDEX = 3;
export const R_INDEX = 4, R_MIDDLE = 5, R_RING = 6, R_PINKY = 7, THUMB = 8;

export const FINGER_NAMES = [
  { th: 'ก้อยซ้าย', en: 'left pinky' },
  { th: 'นางซ้าย', en: 'left ring' },
  { th: 'กลางซ้าย', en: 'left middle' },
  { th: 'ชี้ซ้าย', en: 'left index' },
  { th: 'ชี้ขวา', en: 'right index' },
  { th: 'กลางขวา', en: 'right middle' },
  { th: 'นางขวา', en: 'right ring' },
  { th: 'ก้อยขวา', en: 'right pinky' },
  { th: 'หัวแม่มือ', en: 'thumb' },
];

export const isLeftHand = (finger) => finger <= L_INDEX;

/**
 * Shift is pressed with the pinky of the hand *not* typing the character —
 * reaching for both with one hand is the habit touch-typing exists to prevent.
 */
export const shiftFingerFor = (finger) =>
  (finger === THUMB ? null : isLeftHand(finger) ? R_PINKY : L_PINKY);

/** Which physical key, shift state and finger produce `ch`. */
export function lookup(lang, ch) {
  if (ch === ' ') return { id: 'space', shift: false, finger: THUMB };
  const base = rowsFor(lang);
  const shift = shiftFor(lang);
  for (let r = 0; r < base.length; r++) {
    let i = base[r].indexOf(ch);
    if (i >= 0) return { id: EN_ROWS[r][i], shift: false, finger: FINGER_COLS[r][i] };
    i = shift[r].indexOf(ch);
    if (i >= 0) return { id: EN_ROWS[r][i], shift: true, finger: FINGER_COLS[r][i] };
  }
  return null;
}

/**
 * Like `lookup`, but falls back to the other layout. The bilingual boss drill
 * switches script mid-sentence, and the learner physically switches their input
 * method with it — so the panel has to follow. Returns the layout that owns the
 * character alongside the key.
 */
export function lookupAny(preferred, ch) {
  const other = preferred === 'th' ? 'en' : 'th';
  const first = lookup(preferred, ch);
  if (first) return { ...first, lang: preferred };
  const second = lookup(other, ch);
  return second ? { ...second, lang: other } : null;
}

/** Every glyph a chapter's key set can produce, for content validation. */
export function glyphsFor(lang) {
  const base = rowsFor(lang);
  const shift = shiftFor(lang);
  return new Set([...base.join(''), ...shift.join(''), ' ']);
}

// --- Thai combining marks -------------------------------------------------
// Above/below vowels and tone marks are separate codepoints that render on top
// of the preceding consonant. They are one keystroke each, but must be drawn
// attached to their base or the browser shows a dotted placeholder circle.
const COMBINING = new Set([
  'ั', // ั
  'ิ', 'ี', 'ึ', 'ื', // ิ ี ึ ื
  'ุ', 'ู', 'ฺ', // ุ ู ฺ
  '็', '่', '้', '๊', '๋', '์', 'ํ', '๎', // ็ ่ ้ ๊ ๋ ์ ํ ๎
]);

export const isCombining = (ch) => COMBINING.has(ch);

export const isLatinLetter = (ch) => /^[A-Za-z]$/.test(ch);
export const isThaiChar = (ch) => /[฀-๿]/.test(ch);

/**
 * Spot the commonest first-run failure: the drill wants Thai but the operating
 * system's input method is still on English (or the reverse). Pressing the right
 * *key* then produces the wrong *character*, and every keystroke reads as a
 * miss — which looks like the app is broken rather than like a setting.
 * Returns the script the learner should switch to, or null.
 */
export function wrongInputMethod(expected, got) {
  if (isThaiChar(expected) && isLatinLetter(got)) return 'th';
  if (isLatinLetter(expected) && isThaiChar(got)) return 'en';
  return null;
}

/**
 * How a single glyph should be drawn on a keycap. Combining marks have no
 * standalone form, so carry them on a dotted circle (U+25CC) — the same
 * convention Thai keyboards and dictionaries use.
 */
export const capGlyph = (ch) => (isCombining(ch) ? `◌${ch}` : ch);

/** The glyph a physical key produces in the active layout, ready to display. */
export function glyphForKey(lang, keyId) {
  for (let r = 0; r < EN_ROWS.length; r++) {
    const i = EN_ROWS[r].indexOf(keyId);
    if (i >= 0) return capGlyph(rowsFor(lang)[r][i]);
  }
  return keyId;
}

/**
 * Split text into display clusters. Each cluster is one or more codepoints that
 * must be rendered together; `start`/`end` index back into the raw string so the
 * typing engine can keep working one keystroke at a time.
 */
export function clusters(text) {
  const out = [];
  for (let i = 0; i < text.length; i++) {
    if (out.length && isCombining(text[i])) {
      const last = out[out.length - 1];
      last.text += text[i];
      last.end = i + 1;
    } else {
      out.push({ text: text[i], start: i, end: i + 1 });
    }
  }
  return out;
}
