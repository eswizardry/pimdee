import {
  fingerColumn, isCombining, keyRows, thaiLayoutId, setThaiLayout, lookup,
  FINGER_NAMES, glyphsFor,
  L_PINKY, L_RING, L_MIDDLE, L_INDEX, R_INDEX, R_MIDDLE, R_RING, R_PINKY,
} from './layouts.js';

// Curriculum. 27 lessons per language, each introducing about two new keys, plus
// a bilingual boss at the end.
//
// The shape is deliberately borrowed from paper typing courses: a learner cannot
// build muscle memory for a whole keyboard row introduced at once, so keys arrive
// as mirrored pairs — the same finger on both hands — and each lesson repeats the
// new pair before mixing it with everything already known.
//
// A lesson definition carries only its new keys; the six parts are generated from
// them (see `buildParts`). Generation is deterministic — index arithmetic, never
// Math.random — because a ghost lap and a star rating have to mean the same thing
// on the next reload.

export const LESSON_COUNT = 27;
export const BOSS_ID = 28;

// `keys: '*'` means "every glyph of this layout not taught yet". The shift layer
// is a long tail of rarely-typed consonants, and spelling them out by hand would
// be both tedious and a standing invitation for a typo to lock real words out of
// the final lessons.
const REST = '*';

// ── Lesson tables ──────────────────────────────────────────────────────────
// Each entry is the *new* glyphs for that lesson, in the order the fingers meet
// them. Comments name the physical keys, since that is what the learner presses.

const KEDMANEE_DEFS = [
  // Home row — a=ฟ s=ห d=ก f=ด g=เ │ h=้ j=่ k=า l=ส ;=ว '=ง
  { id: 1, keys: 'กา', tip: 'home', name: 'นิ้วกลาง', en: 'middle fingers' },
  { id: 2, keys: 'ด่', tip: 'bumps', name: 'นิ้วชี้', en: 'index fingers' },
  { id: 3, keys: 'หส', name: 'นิ้วนาง', en: 'ring fingers' },
  { id: 4, keys: 'ฟว', name: 'นิ้วก้อย', en: 'pinky fingers' },
  { id: 5, keys: 'เ้', tip: 'eyesUp', name: 'นิ้วชี้เอื้อม', en: 'index reaches' },
  { id: 6, keys: 'ง', name: 'ทบทวนแป้นเหย้า', en: 'home row review' },
  // Top row — q=ๆ w=ไ e=ำ r=พ t=ะ y=ั u=ี i=ร o=น p=ย [=บ ]=ล \=ฃ
  { id: 7, keys: 'พี', name: 'แถวบน: นิ้วชี้', en: 'top row: index' },
  { id: 8, keys: 'ำร', name: 'แถวบน: นิ้วกลาง', en: 'top row: middle' },
  { id: 9, keys: 'ไน', name: 'แถวบน: นิ้วนาง', en: 'top row: ring' },
  { id: 10, keys: 'ๆย', name: 'แถวบน: นิ้วก้อย', en: 'top row: pinky' },
  { id: 11, keys: 'ะั', tip: 'accuracy', name: 'แถวบน: นิ้วชี้เอื้อม', en: 'top row: index reach' },
  { id: 12, keys: 'บลฃ', name: 'ทบทวนแถวบน', en: 'top row review' },
  // Bottom row — z=ผ x=ป c=แ v=อ b=ิ n=ื m=ท ,=ม .=ใ /=ฝ
  { id: 13, keys: 'อิ', name: 'แถวล่าง: นิ้วชี้', en: 'bottom row: index' },
  { id: 14, keys: 'แื', name: 'แถวล่าง: นิ้วกลาง', en: 'bottom row: middle' },
  { id: 15, keys: 'ปท', name: 'แถวล่าง: นิ้วนาง', en: 'bottom row: ring' },
  { id: 16, keys: 'ผม', tip: 'posture', name: 'แถวล่าง: นิ้วก้อย', en: 'bottom row: pinky' },
  { id: 17, keys: 'ใฝ', name: 'ทบทวนแถวล่าง', en: 'bottom row review' },
  // Number row — `=_ 1=ๅ 2=/ 3=- 4=ภ 5=ถ 6=ุ 7=ึ 8=ค 9=ต 0=จ -=ข ==ช
  { id: 18, keys: 'ภุ', name: 'แถวตัวเลข: นิ้วชี้', en: 'number row: index' },
  { id: 19, keys: 'ถึ', name: 'แถวตัวเลข: นิ้วชี้เอื้อม', en: 'number row: index reach' },
  { id: 20, keys: '-ค', words: ['คน', 'คุณ', 'คิด', 'ครับ', 'ครู', 'ค่ะ'], name: 'แถวตัวเลข: นิ้วกลาง', en: 'number row: middle' },
  { id: 21, keys: '/ต', words: ['ตา', 'ตัว', 'ต้น', 'ตอน', 'ตก', 'ติด'], name: 'แถวตัวเลข: นิ้วนาง', en: 'number row: ring' },
  { id: 22, keys: '_ๅจขช', words: ['จะ', 'ใจ', 'ขา', 'ข้าว', 'ชอบ', 'ช้าง', 'จาก', 'ขาย'], name: 'ทบทวนแถวตัวเลข', en: 'number row review' },
  // Shift layer
  { id: 23, keys: 'ํ๊็๋์ฺู', words: ['เป็น', 'ก็', 'เก็บ', 'เล็ก', 'ตุ๊กตา', 'สัตว์', 'ครู', 'ดู'], tip: 'shift', name: 'ชิฟต์: วรรณยุกต์', en: 'shift: tone marks' },
  {
    id: 24, keys: REST,
    words: ['ภาษา', 'ประเทศ', 'โรงเรียน', 'ขอบคุณ', 'ซื้อ', 'ญาติ', 'ธง', 'ศาล'],
    name: 'ชิฟต์: พยัญชนะที่เหลือ', en: 'shift: remaining letters',
  },
];

const PATTACHOTE_DEFS = [
  // Home row — a=้ s=ท d=ง f=ก g=ั │ h=ี j=า k=น l=เ ;=ไ '=ข
  { id: 1, keys: 'กา', tip: 'home', name: 'นิ้วชี้', en: 'index fingers' },
  { id: 2, keys: 'งน', tip: 'bumps', name: 'นิ้วกลาง', en: 'middle fingers' },
  { id: 3, keys: 'ทเ', name: 'นิ้วนาง', en: 'ring fingers' },
  { id: 4, keys: '้ไ', name: 'นิ้วก้อย', en: 'pinky fingers' },
  { id: 5, keys: 'ัี', tip: 'eyesUp', name: 'นิ้วชี้เอื้อม', en: 'index reaches' },
  { id: 6, keys: 'ข', name: 'ทบทวนแป้นเหย้า', en: 'home row review' },
  // Top row — q=็ w=ต e=ย r=อ t=ร y=่ u=ด i=ม o=ว p=แ [=ใ ]=ฌ \=ๅ
  { id: 7, keys: 'อ่', name: 'แถวบน: นิ้วชี้', en: 'top row: index' },
  { id: 8, keys: 'รด', name: 'แถวบน: นิ้วชี้เอื้อม', en: 'top row: index reach' },
  { id: 9, keys: 'ยม', name: 'แถวบน: นิ้วกลาง', en: 'top row: middle' },
  { id: 10, keys: 'ตว', name: 'แถวบน: นิ้วนาง', en: 'top row: ring' },
  { id: 11, keys: '็แ', tip: 'accuracy', name: 'แถวบน: นิ้วก้อย', en: 'top row: pinky' },
  { id: 12, keys: 'ใฌๅ', words: ['ใน', 'ใด', 'ใต้', 'ใย'], name: 'ทบทวนแถวบน', en: 'top row review' },
  // Bottom row — z=บ x=ป c=ล v=ห b=ิ n=ค m=ส ,=ะ .=จ /=พ
  { id: 13, keys: 'หค', name: 'แถวล่าง: นิ้วชี้', en: 'bottom row: index' },
  { id: 14, keys: 'ิส', name: 'แถวล่าง: นิ้วชี้เอื้อม', en: 'bottom row: index reach' },
  { id: 15, keys: 'ละ', name: 'แถวล่าง: นิ้วกลาง', en: 'bottom row: middle' },
  { id: 16, keys: 'ปจ', tip: 'posture', name: 'แถวล่าง: นิ้วนาง', en: 'bottom row: ring' },
  { id: 17, keys: 'บพ', name: 'ทบทวนแถวล่าง', en: 'bottom row review' },
  // Number row — `=_ 1== 2=๒ 3=๓ 4=๔ 5=๕ 6=ู 7=๗ 8=๘ 9=๙ 0=๐ -=๑ ==๖
  { id: 18, keys: '๔ู', words: ['๔๔', '๔ู', 'ดู', 'รู้', 'ครู'], name: 'แถวตัวเลข: นิ้วชี้', en: 'number row: index' },
  { id: 19, keys: '๕๗', words: ['๕๗', '๗๕', '๕๕๗', '๗๗๕', '๔๕๗'], name: 'แถวตัวเลข: นิ้วชี้เอื้อม', en: 'number row: index reach' },
  { id: 20, keys: '๓๘', words: ['๓๘', '๘๓', '๓๔๕', '๗๘๓', '๓๓๘'], name: 'แถวตัวเลข: นิ้วกลาง', en: 'number row: middle' },
  { id: 21, keys: '๒๙', words: ['๒๙', '๙๒', '๒๕๓๘', '๒๙๔๗', '๓๙๕'], name: 'แถวตัวเลข: นิ้วนาง', en: 'number row: ring' },
  { id: 22, keys: '_=๐๑๖', words: ['๑๐', '๑๐๐', '๒๕๖๘', '๑๙๖๐', '๖๐', '๑๐๑'], name: 'ทบทวนแถวตัวเลข', en: 'number row review' },
  // Shift layer
  { id: 23, keys: '๊๋์ํฺึืำ', words: ['ทำ', 'คำ', 'ดำ', 'มือ', 'ยืน', 'เมื่อ', 'ถึง'], tip: 'shift', name: 'ชิฟต์: วรรณยุกต์และสระ', en: 'shift: marks & vowels' },
  {
    id: 24, keys: REST,
    words: ['ภาษา', 'ประเทศ', 'โรงเรียน', 'ขอบคุณ', 'ซื้อ', 'ญาติ', 'ธง', 'ศาล'],
    name: 'ชิฟต์: พยัญชนะที่เหลือ', en: 'shift: remaining letters',
  },
];

const ENGLISH_DEFS = [
  { id: 1, keys: 'fj', tip: 'home', name: 'Index fingers', en: 'f and j' },
  { id: 2, keys: 'dk', tip: 'bumps', name: 'Middle fingers', en: 'd and k' },
  { id: 3, keys: 'sl', name: 'Ring fingers', en: 's and l' },
  { id: 4, keys: 'a;', name: 'Pinky fingers', en: 'a and ;' },
  { id: 5, keys: 'gh', tip: 'eyesUp', name: 'Index reaches', en: 'g and h' },
  { id: 6, keys: "'", name: 'Home row review', en: 'asdfg hjkl;' },
  { id: 7, keys: 'ru', name: 'Top row: index', en: 'r and u' },
  { id: 8, keys: 'ei', name: 'Top row: middle', en: 'e and i' },
  { id: 9, keys: 'wo', name: 'Top row: ring', en: 'w and o' },
  { id: 10, keys: 'qp', name: 'Top row: pinky', en: 'q and p' },
  { id: 11, keys: 'ty', tip: 'accuracy', name: 'Top row: index reach', en: 't and y' },
  { id: 12, keys: '[]\\', words: ['[a]', '[if]', '[the]', 'a\\b', '[quiet]'], name: 'Top row review', en: 'qwerty uiop' },
  { id: 13, keys: 'vn', name: 'Bottom row: index', en: 'v and n' },
  { id: 14, keys: 'bm', name: 'Bottom row: index reach', en: 'b and m' },
  { id: 15, keys: 'c,', name: 'Bottom row: middle', en: 'c and ,' },
  { id: 16, keys: 'x.', tip: 'posture', name: 'Bottom row: ring', en: 'x and .' },
  { id: 17, keys: 'z/', name: 'Bottom row review', en: 'zxcv bnm' },
  { id: 18, keys: '46', words: ['44', '66', '46', '64', '446', '664'], name: 'Number row: index', en: '4 and 6' },
  { id: 19, keys: '57', words: ['55', '77', '57', '75', '456', '567'], name: 'Number row: index reach', en: '5 and 7' },
  { id: 20, keys: '38', words: ['38', '83', '345', '678', '888', '333'], name: 'Number row: middle', en: '3 and 8' },
  { id: 21, keys: '29', words: ['29', '92', '234', '789', '299', '922'], name: 'Number row: ring', en: '2 and 9' },
  {
    id: 22, keys: '`10-=',
    words: ['10', '100', '1990', '2026', '12-34', '5=5', '1234567890'],
    name: 'Number row review', en: '1234567890',
  },
  {
    id: 23, keys: '!@#$%^&*()_+~', tip: 'shift',
    words: ['50%', '$40', '#7', 'a@b.com', '(new)', '2+2', 'x*y', 'read_me'],
    name: 'Shift: symbols', en: 'the number row, shifted',
  },
  {
    id: 24, keys: REST, mechanic: true,
    words: ['The', 'Monday', 'Bangkok', 'Thailand', 'English', 'Anna', 'River', 'Quick'],
    name: 'Shift: capitals', en: 'A to Z',
  },
];

// ── Word pools ─────────────────────────────────────────────────────────────
// Rather than hand-writing a word list per lesson — 81 lists that must each be
// proof-read against a growing key set — each curriculum gets one pool, and the
// generator picks the words a lesson can actually spell. Validity is then a
// property of the build, not of anyone's patience.

const TH_WORDS = [
  'กา', 'หา', 'สา', 'ดา', 'ว่า', 'ห้า', 'ฟ้า', 'เสา', 'เกา', 'เก่า', 'ก้าว', 'สาว',
  'วาด', 'ฟาด', 'กวาด', 'สาด', 'หาก', 'ห่า', 'ก่า', 'ด่า', 'ดาว', 'ส่ง', 'ห่าง',
  'ว่าง', 'เหงา', 'ฟาง', 'กวาง', 'งา', 'ทาง', 'ข้าง',
  'ทาง', 'เกา', 'เข้า', 'ข้าง', 'นาน', 'งาน', 'กัน', 'ทั้ง', 'เงา', 'ขัง', 'ทาน', 'เก้า',
  'เท้า', 'ก้าน', 'ทั้งนี้',
  'ดี', 'สี', 'พี่', 'พา', 'มี', 'รี', 'ที่', 'นี้', 'ปี', 'ผี',
  'รำ', 'ดำ', 'ทำ', 'กำ', 'คำ', 'น้ำ', 'จำ', 'ย้ำ', 'ซ้ำ',
  'ไก่', 'นา', 'ไหน', 'ไป', 'ไม่', 'ไว้', 'ใน', 'นาน', 'งาน', 'อ่าน',
  'ยา', 'ยาย', 'ย่า', 'ยาง', 'ยาก', 'ยิ้ม', 'ยืน',
  'กะ', 'ยัง', 'ดัง', 'ฟัง', 'วัน', 'นั่ง', 'ทั้ง', 'ตั้ง', 'หลัง', 'วัง',
  'บ้าน', 'ลง', 'บาง', 'ลาย', 'ไล่', 'บ่าย', 'ลม', 'บน', 'ลาก', 'บาท',
  'อ่าง', 'ดิน', 'กิน', 'ริน', 'อิง', 'สิ', 'ผิด', 'ปิด', 'คิด', 'ติด',
  'แดง', 'แล้ว', 'ยืน', 'มือ', 'ชื่อ', 'เมื่อ', 'แพง', 'แรง', 'แบบ', 'แม่',
  'ปลา', 'ทาง', 'ไป', 'ทั้ง', 'ปาก', 'ทาน', 'ปี', 'ท่า', 'ทำงาน', 'ปลาย',
  'ผม', 'ม้า', 'ผ่าน', 'มา', 'ผัก', 'มาก', 'ผล', 'มด', 'ผ้า', 'มัน',
  'ใหม่', 'ใน', 'ใบ', 'ฝน', 'ฝัน', 'ใหญ่', 'ฝาก', 'ใกล้', 'ใส', 'ฝ่าย',
  'ภาพ', 'ภาษา', 'ถ้า', 'ถึง', 'ถนน', 'ภาค', 'ถาม', 'ภูมิ', 'ถ่าย',
  'คุณ', 'คุย', 'ทุก', 'คน', 'ครับ', 'สุข', 'ดุ', 'ปุ่ม', 'บุญ',
  'ตา', 'ต้น', 'ตึก', 'ตัว', 'จึง', 'ตาม', 'ต่อ', 'ตก', 'ตอน',
  'จะ', 'ใจ', 'ขา', 'ข้าว', 'ชอบ', 'ช้าง', 'จาก', 'ขาย', 'ขึ้น', 'ชื่อ',
  'เรียน', 'เสีย', 'เพียง', 'เดียว', 'เรื่อง', 'เหนื่อย', 'เนื้อ', 'เพื่อน',
  'ความ', 'การ', 'เป็น', 'ได้', 'ให้', 'กับ', 'ของ', 'และ', 'หรือ', 'แต่',
  'เวลา', 'เดือน', 'เช้า', 'เย็น', 'ครู', 'ตลาด', 'เมือง', 'ประเทศ',
  'ขอบคุณ', 'สวัสดี', 'ยินดี', 'ขอโทษ', 'โรงเรียน', 'การบ้าน', 'สนุก',
];

const EN_WORDS = [
  'as', 'ask', 'all', 'add', 'lad', 'sad', 'dad', 'fad', 'fall', 'flask',
  'has', 'had', 'half', 'hall', 'flash', 'glad', 'gash', 'lash', 'salad',
  'the', 'this', 'that', 'they', 'their', 'there', 'these', 'other', 'these',
  'here', 'here', 'were', 'where', 'three', 'wheel', 'ether', 'either',
  'rush', 'lush', 'gush', 'flush', 'slur', 'fur', 'rug', 'husk', 'drug', 'shrug',
  'said', 'sail', 'file', 'like', 'slide', 'field', 'glide', 'fresh', 'desire',
  'to', 'too', 'took', 'tool', 'total', 'those', 'through',
  'we', 'were', 'well', 'will', 'with', 'would', 'while', 'white', 'whole',
  'quiet', 'quite', 'quick', 'quill', 'equal', 'liquid', 'require',
  'you', 'your', 'yellow', 'yet', 'year', 'yield', 'style', 'type',
  'never', 'seven', 'given', 'even', 'every', 'evening', 'invent',
  'been', 'come', 'some', 'time', 'name', 'home', 'game', 'same', 'become',
  'can', 'cave', 'once', 'voice', 'chance', 'science', 'balance',
  'next', 'text', 'exit', 'extra', 'expect', 'explain', 'example',
  'size', 'zero', 'lazy', 'amazing', 'organize', 'realize', 'horizon',
  'river', 'storm', 'cloud', 'stone', 'light', 'forest', 'window', 'bridge',
  'silver', 'garden', 'winter', 'candle', 'market', 'thunder', 'island',
  'shadow', 'copper', 'meadow', 'lantern', 'harbor', 'morning', 'evening',
  'because', 'between', 'without', 'another', 'together', 'important',
  'question', 'sentence', 'practice', 'keyboard', 'accuracy', 'rhythm',
];

// ── Part generation ────────────────────────────────────────────────────────

const PART_LABELS = [
  { th: 'ปุ่มใหม่', en: 'new keys' },
  { th: 'จับคู่แป้นเหย้า', en: 'with the home keys' },
  { th: 'ผสมกับที่เรียนมา', en: 'mixed with everything so far' },
  { th: 'คำศัพท์', en: 'words' },
  { th: 'คำศัพท์ ซ้ำสองรอบ', en: 'words, twice each' },
  { th: 'ทบทวนรวม', en: 'lesson review' },
];

/** A tone mark cannot ride alone, so give it a neutral consonant to sit on. */
const carrier = (lang, g) => (lang === 'th' && isCombining(g) ? `ก${g}` : g);

/** Every glyph taught up to and including `id`, within one curriculum. */
function taughtGlyphs(curriculum, id) {
  const set = new Set();
  for (const ch of curriculum) {
    if (ch.id > id) break;
    for (const k of ch.keys) set.add(k);
  }
  return set;
}

/**
 * Settled keys to weave the new pair against. Home-row glyphs first — they are
 * the ones the hand can find without thinking — and never a combining mark,
 * which would stack onto whatever precedes it instead of standing as its own
 * keystroke in the drill.
 */
function anchorsFor(lang, taught, n = 4) {
  const home = fingerColumn(lang, L_MIDDLE, [2])
    .concat(fingerColumn(lang, R_MIDDLE, [2]), fingerColumn(lang, L_INDEX, [2]), fingerColumn(lang, R_INDEX, [2]));
  const pool = [...home, ...taught].filter((g) => taught.has(g) && !isCombining(g) && g !== ' ');
  const out = [];
  for (const g of pool) {
    if (!out.includes(g)) out.push(g);
    if (out.length >= n) break;
  }
  return out.length ? out : ['ก'];
}

/**
 * A small deterministic generator, seeded from the lesson's own keys. Plain index
 * arithmetic produced visibly looping drills once the taught set was small — with
 * four glyphs, `i * 3` and `i * 7` walk the same short cycle and the same four
 * groups repeat three times. This has no such period, and still gives the same
 * text on every reload, which is what ghosts and stars depend on.
 */
function seededPicker(seed) {
  let x = 0;
  for (const ch of seed) x = (x * 31 + ch.codePointAt(0)) >>> 0;
  x = (x || 1) >>> 0;
  return (n) => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    return n > 0 ? x % n : 0;
  };
}

/** Every ordered pair of distinct entries, deduplicated. */
function orderedPairs(c) {
  const out = [];
  for (let i = 0; i < c.length; i++) {
    for (let j = 0; j < c.length; j++) {
      if (i === j) continue;
      const pair = c[i] + c[j];
      if (!out.includes(pair)) out.push(pair);
    }
  }
  return out;
}

/** Part 1 — the new keys alone, hammered. This is where the position is learned. */
function isolationDrill(lang, nk) {
  const c = nk.map((g) => carrier(lang, g));
  const g = [];
  c.forEach((x) => g.push(x.repeat(3)));
  c.forEach((x) => g.push(x.repeat(2)));
  if (c.length > 1) {
    g.push(...orderedPairs(c));
    // Alternating triples: the actual hand movement the pair is being taught for.
    c.forEach((x, i) => g.push(x + c[(i + 1) % c.length] + x));
    if (c.length > 2) g.push(c.join(''));
  } else {
    g.push(c[0].repeat(4));
  }
  return g.join(' ');
}

/** Part 2 — the new keys against keys the hand already trusts. */
function anchorDrill(lang, nk, anchors) {
  const c = nk.map((g) => carrier(lang, g));
  const g = [];
  c.forEach((x, i) => {
    anchors.forEach((a, j) => {
      g.push((i + j) % 2 === 0 ? x + a : a + x);
    });
  });
  c.forEach((x, i) => g.push(anchors[i % anchors.length] + x + anchors[(i + 1) % anchors.length]));
  return g.join(' ');
}

/** Part 3 — the new keys inside the whole taught set, in stable pseudo-order. */
function mixDrill(lang, nk, taught, groups = 12) {
  const pool = [...taught].filter((g) => g !== ' ').map((g) => carrier(lang, g));
  const fresh = nk.map((g) => carrier(lang, g));
  if (!pool.length) return isolationDrill(lang, nk);
  const next = seededPicker(nk.join('') + pool.join(''));
  const out = [];
  for (let i = 0; i < groups; i++) {
    const a = pool[next(pool.length)];
    const b = pool[next(pool.length)];
    const f = fresh[i % fresh.length];
    // Groups of two and three, so the drill reads as varied hand movements
    // rather than one shape repeated a dozen times.
    const group = i % 3 === 0 ? a + f : i % 3 === 1 ? a + f + b : f + a;
    if (out[out.length - 1] !== group) out.push(group);
  }
  return out.join(' ');
}

/**
 * Words a lesson can actually spell: every glyph already taught, and at least one
 * of the new keys, so the list is about *this* lesson rather than a rerun of the
 * last one. Order follows the pool, so it is stable across builds.
 */
function wordsFor(lang, pool, nk, taughtAll, override) {
  // Digits, symbols and the shift layer appear in almost no dictionary word, so
  // the pool search returns nothing and the filler takes over — which reads as
  // line noise. Those lessons name their own material instead.
  if (override && override.length) {
    return override.filter((w) => [...w].every((c) => taughtAll.has(c) || c === ' '));
  }
  const fresh = new Set(nk);
  const seen = new Set();
  const out = [];
  for (const w of pool) {
    if (seen.has(w)) continue;
    const chars = [...w];
    if (!chars.every((c) => taughtAll.has(c))) continue;
    if (!chars.some((c) => fresh.has(c))) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= 10) break;
  }
  return out;
}

/**
 * Syllable-shaped filler for the early lessons, where the taught set is too small
 * to spell anything real. A paper course does exactly this — `fff jjj fj jf` is
 * not a word either, and pretending otherwise would mean teaching nonsense
 * spellings instead of admitting there is nothing to spell yet.
 *
 * The shapes are a rotating template list rather than one pattern: lesson 1 knows
 * exactly two keys, and a single template there produced `fjf fjf fjf fjf`, which
 * is not practice, it is a stuck record.
 */
const SHAPES = [
  (a, b) => a + b + a,
  (a, b) => b + a + b,
  (a, b) => a + a + b,
  (a, b) => b + b + a,
  (a, b) => a + b,
  (a, b) => b + a,
  (a, b) => a + b + b + a,
  (a, b) => b + a + a + b,
];

function fillerGroups(lang, nk, taught, n) {
  const pool = [...taught].filter((g) => g !== ' ').map((g) => carrier(lang, g));
  const fresh = nk.map((g) => carrier(lang, g));
  const next = seededPicker(`filler${nk.join('')}${pool.join('')}`);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = fresh[i % fresh.length];
    const b = pool.length ? pool[next(pool.length)] : fresh[(i + 1) % fresh.length];
    out.push(SHAPES[i % SHAPES.length](a, b));
  }
  return out;
}

/**
 * The shift-layer lessons introduce a whole tail of keys at once — there is no
 * pedagogy in spreading forty rarely-typed consonants over twenty lessons. They
 * get their own part layout: the batch is split across the first four parts so
 * each part is still a handful of keys, then mixed, then spelled.
 */
function buildBatchParts(lang, nk, taughtBefore, words, mk) {
  const chunkCount = 4;
  const size = Math.ceil(nk.length / chunkCount);
  const chunks = [];
  for (let i = 0; i < nk.length; i += size) chunks.push(nk.slice(i, i + size));
  while (chunks.length < chunkCount) chunks.push(chunks[chunks.length - 1] || nk);

  const anchors = anchorsFor(lang, taughtBefore);
  const parts = chunks.slice(0, chunkCount).map((chunk, i) => mk(
    i,
    i % 2 === 0 ? isolationDrill(lang, chunk) : anchorDrill(lang, chunk, anchors),
    { th: `ปุ่มใหม่ ชุดที่ ${i + 1}`, en: `new keys, batch ${i + 1}` },
  ));

  parts.push(mk(4, mixDrill(lang, nk.slice(0, 8), taughtBefore, 14), PART_LABELS[2]));
  parts.push(mk(
    5,
    (words.length >= 4 ? words.slice(0, 6) : fillerGroups(lang, nk, taughtBefore, 8)).join(' '),
    PART_LABELS[3],
  ));
  return parts;
}

/** The six parts of a generated lesson. */
function buildParts(lang, def, taughtBefore, pool) {
  const nk = [...def.keys];
  const taughtAll = new Set([...taughtBefore, ...nk]);
  const anchors = anchorsFor(lang, taughtBefore.size ? taughtBefore : taughtAll);
  const words = wordsFor(lang, pool, nk, taughtAll, def.words);
  const mk = (ix, text, label) => ({
    text,
    focus: `${(label || PART_LABELS[ix]).th} · ${(label || PART_LABELS[ix]).en}`,
  });

  if (nk.length > 8) return buildBatchParts(lang, nk, taughtBefore, words, mk);

  // Parts 4-6 lean on real words when the lesson can spell any, and on generated
  // groups when it cannot. Both paths always produce a drill, so no lesson can
  // ship with an empty part.
  const w1 = words.length >= 4 ? words.slice(0, 6) : fillerGroups(lang, nk, taughtBefore, 6);
  const w2 = words.length >= 4
    ? words.slice(0, 5).flatMap((w) => [w, w])
    : fillerGroups(lang, nk, taughtBefore, 5).flatMap((g) => [g, g]);
  const review = words.length >= 4
    ? [...words.slice(0, 4), ...fillerGroups(lang, nk, taughtBefore, 3)]
    : fillerGroups(lang, nk, taughtBefore, 9);

  return [
    mk(0, isolationDrill(lang, nk)),
    mk(1, anchorDrill(lang, nk, anchors)),
    mk(2, mixDrill(lang, nk, taughtBefore.size ? taughtBefore : taughtAll)),
    mk(3, w1.join(' ')),
    mk(4, w2.join(' ')),
    mk(5, review.join(' ')),
  ];
}

/** Goal speeds ramp with the lesson, and English runs a little ahead of Thai. */
const goalFor = (lang, id) =>
  (lang === 'en' ? 16 + Math.round(id * 0.9) : 12 + Math.round(id * 0.75));

// ── Authored tail lessons ──────────────────────────────────────────────────
// Lessons 25-27 introduce no keys — by then the whole layout is taught — so they
// carry real text rather than generated groups. `childText` swaps the wording for
// a younger learner without changing the drill count, so stars and ghosts survive
// a change of age band.

const TH_TAIL = [
  {
    id: 25, name: 'คำใช้บ่อย', en: 'Common words',
    drills: [
      { tip: 'words' },
      { focus: 'สระเ–ีย · the เ–ีย shape', text: 'เรียน เสีย เพียง เดียว เมีย เปรียบ' },
      { focus: 'ไม้หันอากาศ + ง · ั with ง', text: 'ยัง ตั้ง ดัง วัง ทั้ง นั่ง หลัง' },
      { focus: 'สระ–ือ · the –ือ shape', text: 'มือ ชื่อ เมื่อ เรื่อง เหนื่อย เนื้อ' },
      { focus: 'ควบกล้ำ ร · ร clusters', text: 'กร ปร ทร คร พร กราบ ปราบ ครับ' },
      {
        focus: 'คำที่มักเขียนผิด · commonly misspelled',
        text: 'อนุญาต สังเกต กะเพรา โควตา อีเมล',
        childText: 'โรงเรียน เพื่อน ขนม การบ้าน สนุก',
      },
      {
        focus: 'คำที่มักเขียนผิด (ต่อ) · more of them',
        text: 'เกม ลายเซ็น นานาชาติ ผัดไทย ขนมปัง',
        childText: 'เกม ตุ๊กตา จักรยาน ไอศกรีม ลูกโป่ง',
      },
      {
        focus: 'ค่ะ กับ คะ · the ค่ะ / คะ trap',
        text: 'ค่ะ คะ นะคะ ใช่ค่ะ ขอบคุณค่ะ',
        childText: 'ครับ ค่ะ สวัสดีครับ ขอบคุณค่ะ',
      },
      'ที่ และ ของ ใน การ เป็น มี ได้ ให้ ไม่',
      'ความ จะ กับ ว่า นี้ นั้น เขา เรา คุณ ผม',
      'วัน เวลา ปี เดือน คืน เช้า เย็น บ่าย',
      'กิน นอน เดิน วิ่ง อ่าน เขียน ฟัง พูด',
      'ดี เก่ง สวย งาม ใหญ่ เล็ก สูง ต่ำ',
      {
        text: 'ประเทศ เมือง บ้าน โรงเรียน ตลาด วัด',
        childText: 'บ้าน โรงเรียน สนาม สวน ห้อง ครัว',
      },
      'ขอบคุณ สวัสดี ยินดี ขอโทษ ไม่เป็นไร',
    ],
  },
  {
    // Content-bearing drills: while the hands practise, the sentence is worth
    // reading. Deliberately free of Arabic numerals — those are not on the
    // Kedmanee layout at all, and forcing a script switch belongs in the boss.
    id: 26, name: 'ประโยคสั้น', en: 'Short sentences',
    drills: [
      { text: 'ช้างเป็นสัตว์บกที่ใหญ่ที่สุดในโลก', childText: 'แมวของฉันชอบนอนใต้โต๊ะ' },
      { text: 'ต้นไม้สร้างอาหารเองได้จากแสงแดดและน้ำ', childText: 'วันนี้ครูให้การบ้านมาสองข้อ' },
      { text: 'ดวงจันทร์โคจรรอบโลกและทำให้เกิดน้ำขึ้นน้ำลง', childText: 'หมาน้อยวิ่งเล่นอยู่ในสวนหลังบ้าน' },
      { text: 'น้ำแข็งลอยน้ำได้เพราะเบากว่าน้ำในรูปของเหลว', childText: 'แม่ทำไข่เจียวให้กินตอนเช้า' },
      { text: 'ผึ้งช่วยผสมเกสรให้พืชหลายชนิดออกผล', childText: 'ฝนตกแรงจนออกไปเล่นข้างนอกไม่ได้' },
      { text: 'ภาษาไทยเขียนติดกันโดยไม่เว้นวรรคระหว่างคำ', childText: 'เพื่อนชวนไปเตะบอลที่สนามหลังเลิกเรียน' },
      { text: 'หัวใจสูบฉีดเลือดไปทั่วร่างกายตลอดเวลาโดยไม่หยุดพัก', childText: 'ฉันชอบอ่านนิทานก่อนนอนทุกคืน' },
      { text: 'ป่าชายเลนช่วยกันคลื่นและเป็นที่อนุบาลสัตว์น้ำวัยอ่อน', childText: 'ต้นไม้หน้าบ้านออกดอกสีเหลืองสวยมาก' },
    ],
  },
  {
    id: 27, name: 'ย่อหน้า', en: 'Paragraphs',
    drills: [
      {
        text: 'ป่าชายเลนเติบโตอยู่ตรงรอยต่อระหว่างแผ่นดินกับทะเล รากที่โผล่พ้นน้ำช่วยดักตะกอนและลดแรงคลื่นก่อนถึงชายฝั่ง ทั้งยังเป็นแหล่งอนุบาลของลูกปลาและปูจำนวนมาก',
        childText: 'แมวชอบนอนตอนกลางวันและตื่นตอนกลางคืน หนวดของแมวช่วยบอกว่าช่องแคบ ๆ นั้นลอดผ่านได้หรือไม่',
      },
      {
        text: 'ดวงอาทิตย์ให้พลังงานแก่สิ่งมีชีวิตเกือบทั้งหมดบนโลก พืชเปลี่ยนแสงให้เป็นอาหารด้วยกระบวนการสังเคราะห์ด้วยแสง แล้วส่งต่อพลังงานนั้นไปยังสัตว์ที่กินพืชเป็นอาหารอีกทอดหนึ่ง',
        childText: 'ผึ้งบินไปหาดอกไม้เพื่อเก็บน้ำหวาน ระหว่างนั้นเกสรก็ติดตัวไปด้วย ดอกไม้จึงกลายเป็นผลได้',
      },
      {
        text: 'ข้าวเป็นพืชที่คนไทยปลูกกันมายาวนาน ตั้งแต่การตกกล้าไปจนถึงการเก็บเกี่ยว ทุกขั้นตอนต้องอาศัยน้ำ แสงแดด และการดูแลอย่างสม่ำเสมอตลอดทั้งฤดูกาล',
        childText: 'ตอนเช้าเราเห็นดวงอาทิตย์ขึ้นทางทิศตะวันออก พอตกเย็นก็ลับไปทางทิศตะวันตกทุกวัน',
      },
      {
        text: 'ลมหนาวพัดผ่านทุ่งนาในตอนเช้า ต้นข้าวเอนไหวเป็นคลื่นสีทอง ชาวนาเดินออกจากบ้านพร้อมกับแสงแรกของวัน',
        childText: 'ก่อนนอนควรเก็บของเล่นให้เรียบร้อย พรุ่งนี้ตื่นมาห้องจะน่าอยู่และหาของได้ง่ายขึ้น',
      },
      'เมืองเล็ก ๆ ริมแม่น้ำตื่นขึ้นช้ากว่าที่อื่น เรือลำหนึ่งแล่นผ่านไปอย่างเงียบเชียบ ทิ้งริ้วคลื่นไว้ข้างหลัง',
      {
        text: 'การพิมพ์ที่ดีไม่ได้วัดกันที่ความเร็วเพียงอย่างเดียว แต่วัดกันที่จังหวะที่สม่ำเสมอและความแม่นยำที่รักษาไว้ได้ตลอดทั้งย่อหน้า',
        childText: 'พิมพ์ช้าแต่ถูกดีกว่าพิมพ์เร็วแล้วผิด พอนิ้วจำที่อยู่ของปุ่มได้แล้ว ความเร็วจะตามมาเอง',
      },
      'ห้องสมุดในบ่ายวันอาทิตย์เงียบจนได้ยินเสียงพลิกหน้ากระดาษ แสงแดดลอดผ่านหน้าต่างลงมาเป็นแถบยาวบนพื้นไม้',
    ],
  },
];

const EN_TAIL = [
  {
    id: 25, name: 'Common words', en: 'the top 100',
    drills: [
      { tip: 'words' },
      { focus: 'the most frequent words', text: 'the of and to in is you that it he was for on are' },
      { focus: 'common endings', text: 'walking talking reading writing playing running working' },
      { focus: 'double letters', text: 'letter little better follow across attention address' },
      {
        focus: 'commonly misspelled',
        text: 'separate definitely necessary occurred receive believe',
        childText: 'friend because people school always their there',
      },
      'time year people way day man thing woman life child world',
      'school state family student group country problem hand part',
      'good new first last long great little own other old right',
      'know take see come think look want give use find tell ask',
      { text: 'question sentence practice keyboard accuracy rhythm', childText: 'happy sunny funny puppy candy party story' },
    ],
  },
  {
    id: 26, name: 'Short sentences', en: 'full keyboard',
    drills: [
      { text: 'The quick brown fox jumps over the lazy dog.', childText: 'My cat likes to sleep under the table.' },
      { text: 'Elephants are the largest land animals on the planet.', childText: 'We played football in the park after school.' },
      { text: 'Trees make their own food from sunlight and water.', childText: 'It rained so hard we could not go outside.' },
      { text: 'The moon orbits the earth and causes the tides.', childText: 'Mum made fried eggs for breakfast today.' },
      { text: 'Bees pollinate many of the plants that bear fruit.', childText: 'I read a story every night before bed.' },
      { text: 'Ice floats because it is lighter than liquid water.', childText: 'The little dog ran around the back garden.' },
      { text: 'Your heart pumps blood around the body without ever resting.', childText: 'The tree outside our house has yellow flowers.' },
    ],
  },
  {
    id: 27, name: 'Paragraphs', en: 'endurance',
    drills: [
      {
        text: 'Mangroves grow where the land meets the sea. Their raised roots trap sediment and take the force out of the waves before they reach the shore, and the tangle between them shelters young fish and crabs.',
        childText: 'Cats sleep through the middle of the day and wake up at night. Their whiskers tell them whether a narrow gap is wide enough to squeeze through.',
      },
      {
        text: 'Almost every living thing on earth runs on energy from the sun. Plants turn light into food through photosynthesis, and pass that energy on to the animals that eat them.',
        childText: 'Bees fly from flower to flower collecting nectar. Pollen sticks to them along the way, and that is how flowers turn into fruit.',
      },
      {
        text: 'Good typing is not measured by speed alone. It is measured by an even rhythm and by accuracy you can hold for a whole paragraph without slowing down at the end.',
        childText: 'Slow and correct beats fast and wrong. Once your fingers know where the keys are, the speed arrives on its own.',
      },
      'A small town by the river wakes up later than anywhere else. A single boat slips past without a sound, leaving a long ripple behind it.',
      'The library on a Sunday afternoon is quiet enough to hear a page turn. Sunlight comes through the window and lies across the wooden floor in long stripes.',
    ],
  },
];

const BOSS_TH = {
  id: BOSS_ID, name: 'ผสมสองภาษา', en: 'Bilingual mix', boss: true,
  drills: [
    'ผมใช้ keyboard แบบ Kedmanee ทุกวัน',
    'ไฟล์ชื่อ report.pdf อยู่ในโฟลเดอร์ Documents',
    'เธอบอกว่า see you tomorrow แล้วก็เดินจากไป',
    'ร้านเปิด 9:00 - 18:00 ทุกวันยกเว้น Sunday',
    'พิมพ์ภาษาไทยแล้วสลับไป English กลางประโยคคือด่านที่ยากที่สุด',
  ],
};

const BOSS_EN = { ...BOSS_TH, name: 'Bilingual mix', en: 'boss drill' };

// ── Assembly ───────────────────────────────────────────────────────────────

/**
 * Turn a table of lesson definitions into full lessons. The generator reads the
 * *active* layout through `fingerColumn`, so each Thai curriculum is built with
 * its own layout switched in.
 */
function buildCurriculum(lang, layoutId, defs, tail, boss, pool) {
  const restore = layoutId ? setThaiLayout(layoutId) : null;
  try {
    const every = glyphsFor(lang);
    // Resolve `keys: '*'` before anything reads it, so taughtGlyphs and the
    // "no untaught key" invariant both see a concrete set.
    const resolved = [];
    const soFar = new Set();
    for (const def of defs) {
      const keys = def.keys === REST
        ? [...every].filter((g) => g !== ' ' && !soFar.has(g)).join('')
        : def.keys;
      [...keys].forEach((g) => soFar.add(g));
      resolved.push({ ...def, keys });
    }

    const lessons = [];
    const taught = new Set();
    for (const def of resolved) {
      const before = new Set(taught);
      [...def.keys].forEach((g) => taught.add(g));
      const parts = buildParts(lang, def, before, pool);
      lessons.push({
        id: def.id,
        name: def.name,
        en: def.en,
        keys: def.keys,
        mechanic: def.mechanic,
        goalWpm: goalFor(lang, def.id),
        drills: def.tip ? [{ tip: def.tip }, ...parts] : parts,
      });
    }
    for (const t of tail) {
      lessons.push({ ...t, keys: [...taught].join(''), goalWpm: goalFor(lang, t.id) });
    }
    lessons.push({ ...boss, keys: [...taught].join(''), goalWpm: goalFor(lang, BOSS_ID) });
    return lessons;
  } finally {
    if (restore) setThaiLayout('kedmanee');
  }
}

const TH_KEDMANEE = buildCurriculum('th', 'kedmanee', KEDMANEE_DEFS, TH_TAIL, BOSS_TH, TH_WORDS);
const TH_PATTACHOTE = buildCurriculum('th', 'pattachote', PATTACHOTE_DEFS, TH_TAIL, BOSS_TH, TH_WORDS);
const EN = buildCurriculum('en', null, ENGLISH_DEFS, EN_TAIL, BOSS_EN, EN_WORDS);

export const CHAPTERS = { th: TH_KEDMANEE, th_pat: TH_PATTACHOTE, en: EN };

/** The curriculum for a language, resolved through the active Thai layout. */
export const chapters = (lang) =>
  (lang === 'th' ? (thaiLayoutId() === 'pattachote' ? TH_PATTACHOTE : TH_KEDMANEE) : EN);

// ── Arcade and verse ───────────────────────────────────────────────────────

export const ARCADE_WORDS = {
  th: ['น้ำ', 'ฝน', 'กบ', 'ลม', 'ไฟ', 'ดาว', 'บ้าน', 'แมว', 'หมา', 'ปลา', 'ต้นไม้', 'ทะเล', 'ภูเขา', 'เมฆ', 'ข้าว', 'ถนน', 'ครู', 'เพื่อน', 'ยิ้ม', 'วิ่ง'],
  en: ['river', 'storm', 'cloud', 'stone', 'light', 'forest', 'window', 'bridge', 'silver', 'garden', 'winter', 'candle', 'market', 'thunder', 'island', 'shadow', 'copper', 'meadow', 'lantern', 'harbor'],
};

// Eyes-up mode: public-domain Thai verse + English poetry, split into lines.
export const TRACKS = [
  {
    id: 'klon-1', lang: 'th',
    title: 'กลอนสุภาพ · บทที่ ๑',
    sub: 'Public-domain Thai verse · 88 bpm',
    bpm: 88,
    lines: [
      'เมื่อลมพัดผ่านทุ่งข้าวยามเย็น',
      'ใบไม้ร่วงลงทีละใบอย่างเงียบงัน',
      'ปลิวไปตามสายน้ำที่ไหลเอื่อย',
      'ทิ้งเงาไว้บนผิวน้ำเพียงครู่เดียว',
      'ฟ้าค่อยเปลี่ยนสีจากทองเป็นคราม',
      'นกกลับรังก่อนแสงสุดท้ายจะลา',
      'คืนหนึ่งผ่านไปอย่างไม่มีเสียง',
      'เช้าใหม่มาถึงพร้อมลมอีกครั้ง',
    ],
  },
  {
    id: 'klon-2', lang: 'th',
    title: 'กลอนสุภาพ · บทที่ ๒',
    sub: 'Public-domain Thai verse · 72 bpm',
    bpm: 72,
    lines: [
      'ดาวดวงหนึ่งลอยอยู่เหนือหลังคาบ้าน',
      'แสงอ่อนนวลส่องลงมาถึงลานดิน',
      'เด็กคนหนึ่งนั่งนับดาวจนหลับไป',
      'ความฝันพาเขาข้ามภูเขาลูกใหญ่',
      'ตื่นขึ้นมาก็ยังเป็นเช้าวันเดิม',
      'แต่ใจนั้นได้เดินทางไปไกลแล้ว',
    ],
  },
  {
    id: 'en-1', lang: 'en',
    title: 'Stopping by Woods',
    sub: 'Public domain · Robert Frost · 96 bpm',
    bpm: 96,
    lines: [
      'Whose woods these are I think I know.',
      'His house is in the village though;',
      'He will not see me stopping here',
      'To watch his woods fill up with snow.',
      'The woods are lovely, dark and deep,',
      'But I have promises to keep,',
      'And miles to go before I sleep.',
    ],
  },
];

// ── Dynamic Practice ───────────────────────────────────────────────────────

/**
 * A drill built from the keys you actually miss.
 *
 * Each weak key is repeated in a short burst and then interleaved with settled
 * keys, because a wall of nothing but your worst key trains frustration rather
 * than accuracy. `weak` is the output of store.weakKeys(lang).
 */
export function dynamicDrill(lang, weak, settled = [], minLength = 48) {
  const rows = keyRows(lang);
  const glyphOf = (id) => {
    for (const row of rows) {
      const k = row.keys.find((key) => key.id === id);
      if (k) return k.glyph;
    }
    return null;
  };

  const bad = weak.map((w) => glyphOf(w.id)).filter(Boolean).map((g) => carrier(lang, g));
  if (!bad.length) return null;

  const good = settled.map(glyphOf).filter(Boolean)
    .filter((g) => !isCombining(g)).map((g) => carrier(lang, g));
  const mateFor = (i) => good[i % good.length] || bad[(i + 1) % bad.length];

  // Keep cycling burst → interleave → mixed until the drill is long enough to be
  // worth running. One weak key would otherwise produce a nine-character drill.
  const groups = [];
  const len = () => groups.join(' ').length;
  for (let cycle = 0; len() < minLength && cycle < 12; cycle++) {
    bad.forEach((g) => groups.push(g.repeat(3)));                     // burst
    bad.forEach((g, i) => groups.push(`${g}${mateFor(i + cycle)}${g}`)); // interleave
    if (bad.length > 1) groups.push(bad.join(''));                    // all together
  }
  // Trim whole groups only — slicing mid-string could orphan a Thai tone mark.
  while (groups.length > 1 && len() > minLength * 2.5) groups.pop();
  return groups.join(' ');
}

// ── Age band ───────────────────────────────────────────────────────────────
// Age changes the *words*, never the interface — a nine-year-old and an adult
// get the same screens, the same keys and the same lesson numbering, but the
// authored lessons read differently. Part counts are identical in both bands on
// purpose: a part's index is part of its progress key, so swapping only the text
// means stars, ghosts and cleared parts survive a change of band.
let activeAge = 'adult';

/** Returns the band actually applied. */
export function setAgeBand(band) {
  activeAge = band === 'child' ? 'child' : 'adult';
  return activeAge;
}
export const ageBand = () => activeAge;

// ── Lookups ────────────────────────────────────────────────────────────────

export const chapter = (lang, id) => chapters(lang).find((c) => c.id === id) || chapters(lang)[0];

const drillAt = (lang, chId, drillIx) => {
  const ch = chapter(lang, chId);
  return ch.drills[Math.max(0, Math.min(drillIx, ch.drills.length - 1))];
};

/** A part is a bare string, `{ text, focus }`, or `{ tip }` — a teaching card. */
export const drillText = (lang, chId, drillIx) => {
  const d = drillAt(lang, chId, drillIx);
  if (typeof d === 'string') return d;
  if (d.tip) return null;
  // childText is optional: the generated lessons are mechanical key drills where
  // the keys are the keys, so only the authored tail carries a second version.
  return (activeAge === 'child' && d.childText) ? d.childText : d.text;
};

/** What this part trains, or null when it carries no label. */
export const drillFocus = (lang, chId, drillIx) => {
  const d = drillAt(lang, chId, drillIx);
  return typeof d === 'string' ? null : d.focus || null;
};

/** The tip id for a teaching card, or null when this is an ordinary part. */
export const drillTip = (lang, chId, drillIx) => {
  const d = drillAt(lang, chId, drillIx);
  return typeof d === 'string' ? null : d.tip || null;
};

/** Parts that are actually typed — teaching cards carry no stars. */
export const typedDrillCount = (lang, chId) =>
  chapter(lang, chId).drills.filter((d) => typeof d === 'string' || !d.tip).length;

export const drillCount = (lang, chId) => chapter(lang, chId).drills.length;

/**
 * A short label for a part, for the lesson picker. Teaching cards say so; the
 * rest reuse the focus line's Thai half, which is already written to be read at
 * a glance.
 */
export function drillLabel(lang, chId, drillIx) {
  const d = drillAt(lang, chId, drillIx);
  if (typeof d !== 'string' && d.tip) return { th: 'การ์ดสอน', en: 'teaching card' };
  const focus = drillFocus(lang, chId, drillIx);
  if (!focus) return { th: `ตอนที่ ${drillIx + 1}`, en: `part ${drillIx + 1}` };
  const [th, en] = focus.split(' · ');
  return { th, en: en || '' };
}

/** Which fingers a lesson's new keys belong to, for the lesson header. */
export function lessonFingers(lang, chId) {
  const ch = chapter(lang, chId);
  const ids = new Set();
  for (const g of ch.keys || '') {
    const k = lookup(lang, g);
    if (k && k.finger !== undefined) ids.add(k.finger);
  }
  return [...ids].sort((a, b) => a - b).map((i) => FINGER_NAMES[i]);
}
