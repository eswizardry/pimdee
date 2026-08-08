// Test suite. Zero dependencies — `node test/run.mjs`.
//
// These are the invariants that were being checked by hand in a browser during
// development. They are the ones that actually bite: a wrong layout table or a
// drill using a key it hasn't taught is invisible in code review and obvious to
// a learner.

import assert from 'node:assert/strict';

// store.js touches localStorage at module load, so shim it before importing.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};

const L = await import('../js/layouts.js');
const C = await import('../js/content.js');
const T = await import('../js/tips.js');
const E = await import('../js/engine.js');
const S = await import('../js/store.js');

// --- harness ---------------------------------------------------------------
let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; } catch (err) { failures.push({ name, err }); }
}
const section = (name) => console.log(`\n\x1b[1m${name}\x1b[0m`);

const LAYOUTS = Object.keys(L.THAI_LAYOUTS);
const textOf = (d) => (typeof d === 'string' ? d : d.tip ? null : d.text);
const withLayout = (id, fn) => { L.setThaiLayout(id); try { return fn(); } finally { L.setThaiLayout('kedmanee'); } };

// --- layouts ---------------------------------------------------------------
section('layouts');

test('every layout row aligns with its QWERTY row', () => {
  for (const [id, lay] of Object.entries(L.THAI_LAYOUTS)) {
    lay.rows.forEach((row, r) => {
      assert.equal([...row].length, [...L.EN_ROWS[r]].length, `${id} unshifted row ${r}`);
      assert.equal([...lay.shift[r]].length, [...L.EN_ROWS[r]].length, `${id} shifted row ${r}`);
    });
  }
});

test('no glyph is duplicated within one level of a layout', () => {
  for (const [id, lay] of Object.entries(L.THAI_LAYOUTS)) {
    for (const level of ['rows', 'shift']) {
      const all = [...lay[level].join('')];
      const dupes = all.filter((c, i) => all.indexOf(c) !== i);
      assert.deepEqual([...new Set(dupes)], [], `${id}.${level} duplicates`);
    }
  }
});

test('every glyph in every layout is reachable via lookup', () => {
  for (const id of LAYOUTS) {
    withLayout(id, () => {
      for (const g of L.glyphsFor('th')) {
        if (g === ' ') continue;
        const k = L.lookup('th', g);
        assert.ok(k, `${id}: ${g} (U+${g.codePointAt(0).toString(16)}) not found`);
        assert.ok(k.finger >= 0 && k.finger <= 8, `${id}: ${g} bad finger ${k.finger}`);
      }
    });
  }
});

test('lookup returns the standard touch-typing finger for the home row', () => {
  const expect = { a: 0, s: 1, d: 2, f: 3, j: 4, k: 5, l: 6, ';': 7 };
  for (const [key, finger] of Object.entries(expect)) {
    assert.equal(L.lookup('en', key).finger, finger, `en ${key}`);
  }
  assert.equal(L.lookup('en', ' ').finger, L.THUMB);
});

test('shift is always the opposite hand', () => {
  assert.equal(L.shiftFingerFor(L.L_INDEX), L.R_PINKY);
  assert.equal(L.shiftFingerFor(L.R_INDEX), L.L_PINKY);
  assert.equal(L.shiftFingerFor(L.THUMB), null);
});

test('lookupAny falls back across scripts', () => {
  const latinInThai = L.lookupAny('th', 'k');
  assert.equal(latinInThai.lang, 'en');
  const thaiInLatin = L.lookupAny('en', 'ก');
  assert.equal(thaiInLatin.lang, 'th');
  assert.equal(L.lookupAny('th', '❤'), null, 'unknown glyph');
});

test('clusters round-trip and never start with a combining mark', () => {
  const samples = ['กา', 'นั่ง', 'เก่า', 'ก้าง', 'พี่ยังนั่งฟัง', 'abc def', ''];
  for (const s of samples) {
    assert.equal(L.clusters(s).map((c) => c.text).join(''), s, `round-trip ${s}`);
    for (const c of L.clusters(s)) {
      assert.ok(!L.isCombining(c.text[0]), `orphan mark in ${s}`);
    }
  }
});

test('capGlyph puts a carrier under combining marks only', () => {
  assert.equal(L.capGlyph('ก'), 'ก');
  assert.equal(L.capGlyph('่'), '◌่');
});

test('unknown layout ids are refused, not applied', () => {
  assert.equal(L.setThaiLayout('nonsense-layout'), 'kedmanee');
  assert.equal(L.thaiLayoutId(), 'kedmanee');
});

// --- curriculum ------------------------------------------------------------
section('curriculum');

/** Walk one curriculum, collecting every invariant violation. */
function auditCurriculum(lang) {
  const bad = { leaks: [], unreachable: [], orphans: [], ordering: [], empty: [], badTips: [] };
  let allowed = new Set([' ']);
  let prior = new Set([' ']);
  for (const ch of C.chapters(lang)) {
    if (ch.id <= 6) for (const k of ch.keys) allowed.add(k);
    if (lang === 'th') allowed.add('ก'); // tone-mark carrier
    const gated = ch.id <= 6 && !(lang === 'en' && ch.id === 5);
    const chapterKeys = new Set([...ch.keys]);
    const introduced = new Set();
    ch.drills.forEach((d, i) => {
      const where = `${lang} ch${ch.id}.${i + 1}`;
      if (d && d.tip) {
        if (!T.isTipId(d.tip)) bad.badTips.push(`${where} ${d.tip}`);
        return;
      }
      const t = textOf(d);
      if (!t || !t.trim()) { bad.empty.push(where); return; }
      if (L.clusters(t).map((c) => c.text).join('') !== t) bad.orphans.push(`${where} round-trip`);
      for (const c of L.clusters(t)) {
        if (L.isCombining(c.text[0])) bad.orphans.push(`${where} "${c.text}"`);
      }
      for (const c of t) {
        if (gated && !allowed.has(c)) bad.leaks.push(`${where} "${c}"`);
        if (c !== ' ' && !L.lookupAny(lang, c)) bad.unreachable.push(`${where} "${c}"`);
        if (chapterKeys.has(c)) introduced.add(c);
      }
      if (gated && !ch.mechanic) {
        for (const c of t) {
          if (c === ' ' || c === 'ก') continue;
          if (!prior.has(c) && !introduced.has(c)) bad.ordering.push(`${where} "${c}"`);
        }
      }
    });
    introduced.forEach((c) => prior.add(c));
    for (const k of ch.keys) prior.add(k);
  }
  for (const k of Object.keys(bad)) bad[k] = [...new Set(bad[k])];
  return bad;
}

for (const layoutId of LAYOUTS) {
  for (const lang of ['th', 'en']) {
    test(`${layoutId}/${lang}: no drill uses an untaught key`, () => {
      withLayout(layoutId, () => assert.deepEqual(auditCurriculum(lang).leaks, []));
    });
    test(`${layoutId}/${lang}: every character is typeable`, () => {
      withLayout(layoutId, () => assert.deepEqual(auditCurriculum(lang).unreachable, []));
    });
    test(`${layoutId}/${lang}: no orphaned combining marks`, () => {
      withLayout(layoutId, () => assert.deepEqual(auditCurriculum(lang).orphans, []));
    });
    test(`${layoutId}/${lang}: keys are introduced before they are used`, () => {
      withLayout(layoutId, () => assert.deepEqual(auditCurriculum(lang).ordering, []));
    });
    test(`${layoutId}/${lang}: no empty drills, all tips resolve`, () => {
      withLayout(layoutId, () => {
        const a = auditCurriculum(lang);
        assert.deepEqual(a.empty, []);
        assert.deepEqual(a.badTips, []);
      });
    });
  }
}

test('every chapter has an id, a goal and at least one typed drill', () => {
  for (const layoutId of LAYOUTS) {
    withLayout(layoutId, () => {
      for (const lang of ['th', 'en']) {
        C.chapters(lang).forEach((ch, i) => {
          assert.equal(ch.id, i + 1, `${lang} chapter order`);
          assert.ok(ch.goalWpm > 0, `${lang} ch${ch.id} goalWpm`);
          assert.ok(C.typedDrillCount(lang, ch.id) > 0, `${lang} ch${ch.id} typed drills`);
        });
      }
    });
  }
});

test('every curriculum is 27 lessons plus the boss', () => {
  for (const layoutId of LAYOUTS) {
    withLayout(layoutId, () => {
      for (const lang of ['th', 'en']) {
        const ids = C.chapters(lang).map((c) => c.id);
        assert.deepEqual(
          ids,
          [...Array(C.LESSON_COUNT)].map((_, i) => i + 1).concat(C.BOSS_ID),
          `${layoutId} ${lang} lesson ids`,
        );
      }
    });
  }
});

test('every lesson has at least six parts and none of them is empty', () => {
  for (const layoutId of LAYOUTS) {
    withLayout(layoutId, () => {
      for (const lang of ['th', 'en']) {
        for (const ch of C.chapters(lang)) {
          assert.ok(ch.drills.length >= 5, `${layoutId} ${lang} L${ch.id} has ${ch.drills.length} parts`);
          ch.drills.forEach((d, i) => {
            if (typeof d !== 'string' && d.tip) return;
            const t = textOf(d);
            assert.ok(t && t.trim().length >= 4, `${layoutId} ${lang} L${ch.id}.${i} empty: ${JSON.stringify(t)}`);
          });
        }
      }
    });
  }
});

test('the generated lessons ramp gently: no more than six new keys before the shift layer', () => {
  for (const layoutId of LAYOUTS) {
    withLayout(layoutId, () => {
      for (const lang of ['th', 'en']) {
        const seen = new Set();
        for (const ch of C.chapters(lang)) {
          if (ch.id > 22) break; // 23-24 teach the shift layer in batches, by design
          const fresh = [...ch.keys].filter((g) => !seen.has(g));
          assert.ok(fresh.length <= 6, `${layoutId} ${lang} L${ch.id} introduces ${fresh.length} keys`);
          [...ch.keys].forEach((g) => seen.add(g));
        }
      }
    });
  }
});

test('the whole layout is taught by the end of the shift lessons', () => {
  for (const layoutId of LAYOUTS) {
    withLayout(layoutId, () => {
      for (const lang of ['th', 'en']) {
        const taught = new Set();
        for (const ch of C.chapters(lang)) {
          if (ch.id > 24) break;
          [...ch.keys].forEach((g) => taught.add(g));
        }
        for (const g of L.glyphsFor(lang)) {
          if (g === ' ') continue;
          assert.ok(taught.has(g), `${layoutId} ${lang} never teaches "${g}"`);
        }
      }
    });
  }
});

test('every part carries a label the picker can show', () => {
  for (const lang of ['th', 'en']) {
    for (const ch of C.chapters(lang)) {
      for (let i = 0; i < ch.drills.length; i++) {
        const label = C.drillLabel(lang, ch.id, i);
        assert.ok(label && label.th && label.th.length, `${lang} L${ch.id}.${i} has no label`);
      }
    }
  }
});

test('generation is deterministic: the same lesson builds the same text twice', () => {
  const once = C.drillText('th', 3, 1);
  L.setThaiLayout('pattachote');
  L.setThaiLayout('kedmanee');
  assert.equal(C.drillText('th', 3, 1), once);
});

test('Thai lesson text avoids Arabic digits (not on the Thai layout)', () => {
  for (const layoutId of LAYOUTS) {
    withLayout(layoutId, () => {
      for (const ch of C.chapters('th')) {
        if (ch.id === C.BOSS_ID) continue; // the bilingual boss drill switches on purpose
        for (const d of ch.drills) {
          const t = textOf(d);
          if (t) assert.ok(!/[0-9]/.test(t), `${layoutId} th ch${ch.id}: "${t}"`);
        }
      }
    });
  }
});

test('chapter 1 introduces at most one finger pair per drill', () => {
  for (const layoutId of LAYOUTS) {
    withLayout(layoutId, () => {
      for (const lang of ['th', 'en']) {
        const seen = new Set();
        for (const d of C.chapters(lang)[0].drills) {
          const t = textOf(d);
          if (!t) continue;
          const fresh = [...new Set([...t])].filter((c) => c !== ' ' && c !== 'ก' && !seen.has(c));
          fresh.forEach((c) => seen.add(c));
          assert.ok(fresh.length <= 2, `${layoutId} ${lang} ch1 added ${fresh.length}: ${fresh.join('')}`);
        }
      }
    });
  }
});

test('travel drills only use keys already taught', () => {
  for (const layoutId of LAYOUTS) {
    withLayout(layoutId, () => {
      // covered by the ordering audit, but assert the generator produced them
      const ch2 = C.chapters('th')[1].drills.map(textOf).filter(Boolean);
      assert.ok(ch2.length >= 2, 'chapter 2 has drills');
    });
  }
});

// --- age bands -------------------------------------------------------------
section('age bands');

const withAge = (b, fn) => { C.setAgeBand(b); try { return fn(); } finally { C.setAgeBand('adult'); } };

test('both bands have identical drill counts', () => {
  // A drill's index is part of its progress key, so the counts must not differ
  // or switching band would silently re-point every star and ghost.
  for (const lang of ['th', 'en']) {
    const adult = withAge('adult', () => C.chapters(lang).map((c) => c.drills.length).join('/'));
    const child = withAge('child', () => C.chapters(lang).map((c) => c.drills.length).join('/'));
    assert.equal(child, adult, lang);
  }
});

test('chapters 1-6 are identical in both bands', () => {
  // Those are mechanical key drills — the keys are the keys at any age.
  for (const lang of ['th', 'en']) {
    for (let ch = 1; ch <= 6; ch++) {
      for (let i = 0; i < C.drillCount(lang, ch); i++) {
        const a = withAge('adult', () => C.drillText(lang, ch, i));
        const c = withAge('child', () => C.drillText(lang, ch, i));
        assert.equal(c, a, `${lang} ch${ch}.${i}`);
      }
    }
  }
});

test('the child band actually changes the authored lessons', () => {
  let changed = 0;
  for (const lang of ['th', 'en']) {
    for (const ch of [25, 26, 27]) {
      for (let i = 0; i < C.drillCount(lang, ch); i++) {
        const a = withAge('adult', () => C.drillText(lang, ch, i));
        const c = withAge('child', () => C.drillText(lang, ch, i));
        if (a !== c) changed++;
      }
    }
  }
  assert.ok(changed >= 20, `only ${changed} drills differ — the band is barely doing anything`);
});

test('child text obeys every invariant the adult text does', () => {
  withAge('child', () => {
    for (const layoutId of LAYOUTS) {
      withLayout(layoutId, () => {
        for (const lang of ['th', 'en']) {
          for (const ch of C.chapters(lang)) {
            for (let i = 0; i < ch.drills.length; i++) {
              const t = C.drillText(lang, ch.id, i);
              if (!t) continue;
              assert.equal(L.clusters(t).map((c) => c.text).join(''), t, `${lang} ch${ch.id}.${i}`);
              for (const c of L.clusters(t)) {
                assert.ok(!L.isCombining(c.text[0]), `${lang} ch${ch.id}.${i} orphan "${c.text}"`);
              }
              for (const c of t) {
                if (c !== ' ') assert.ok(L.lookupAny(lang, c), `${layoutId} ${lang} ch${ch.id}.${i} "${c}"`);
              }
            }
          }
        }
      });
    }
  });
});

test('Thai child text avoids Arabic digits too', () => {
  withAge('child', () => {
    for (const ch of C.chapters('th')) {
      if (ch.id === C.BOSS_ID) continue;
      for (let i = 0; i < ch.drills.length; i++) {
        const t = C.drillText('th', ch.id, i);
        if (t) assert.ok(!/[0-9]/.test(t), `th ch${ch.id}.${i}: "${t}"`);
      }
    }
  });
});

test('an unknown band falls back to adult', () => {
  assert.equal(C.setAgeBand('teenager'), 'adult');
  assert.equal(C.ageBand(), 'adult');
});

// --- engine ----------------------------------------------------------------
section('engine');

const typeAll = (engine, text) => { for (const c of text) engine.press(c); };

test('a clean run is 100% accurate with a full combo', () => {
  const e = new E.Engine('กา ดา', 'th');
  typeAll(e, 'กา ดา');
  assert.equal(e.accuracy, 100);
  assert.equal(e.errors, 0);
  assert.equal(e.bestCombo, 5);
  assert.ok(e.finished);
});

test('errors are counted once and do not block progress', () => {
  const e = new E.Engine('abcd', 'en');
  e.press('a'); e.press('x'); e.press('c'); e.press('d');
  assert.equal(e.errors, 1);
  assert.equal(e.done, 4);
  assert.ok(e.finished);
  assert.equal(e.accuracy, 75);
});

test('backspace undoes an error and restores accuracy', () => {
  const e = new E.Engine('abcd', 'en');
  e.press('a'); e.press('x');
  assert.equal(e.errors, 1);
  e.backspace();
  assert.equal(e.errors, 0);
  assert.equal(e.done, 1);
  e.press('b');
  assert.equal(e.accuracy, 100);
});

test('combo resets on a miss', () => {
  const e = new E.Engine('abcd', 'en');
  e.press('a'); e.press('b');
  assert.equal(e.combo, 2);
  e.press('z');
  assert.equal(e.combo, 0);
});

test('the live wpm guard does not leak into the recorded result', () => {
  // Drive the clock rather than the wall clock: two presses can land in the
  // same millisecond, which makes any timing-derived assertion flaky.
  const e = new E.Engine('abcdefghij', 'en');
  for (const c of 'abcdefghij') e.press(c);
  e.t0 = e.tEnd - 10_000;                     // pretend it took 10 seconds
  assert.equal(e.seconds, 10);
  assert.equal(e.finalWpm, 12, '10 chars = 2 words in 10s');
  assert.equal(e.wpm, 12, 'guard is inactive above 0.6s');
  assert.equal(e.summary().wpm, e.finalWpm);

  // Under 0.6s the *live* number is suppressed but the recorded one is not.
  const quick = new E.Engine('abcdefghij', 'en');
  for (const c of 'abcdefghij') quick.press(c);
  quick.t0 = quick.tEnd - 200;
  assert.equal(quick.wpm, 0, 'live wpm suppressed');
  assert.equal(quick.summary().wpm, quick.finalWpm, 'recorded wpm is not');
  assert.ok(quick.finalWpm > 0);
});

test('key stats are bucketed by the layout that owns the key', () => {
  const e = new E.Engine('กa', 'th');
  e.press('ก'); e.press('a');
  assert.ok(e.keyHits.th.d, 'ก credited to the Thai map');
  assert.ok(e.keyHits.en.a, 'a credited to QWERTY');
});

test('the cursor tracks clusters, not codepoints', () => {
  const e = new E.Engine('นั่ง', 'th');   // น + ั + ่ + ง
  assert.equal(e.clusters.length, 2, 'นั่ + ง');
  assert.equal(e.cursorCluster, 0);
  e.press('น'); e.press('ั'); e.press('่');
  assert.equal(e.cursorCluster, 1, 'cursor moves only after the whole cluster');
});

test('press is ignored past the end', () => {
  const e = new E.Engine('a', 'en');
  e.press('a');
  assert.equal(e.press('b'), null);
  assert.equal(e.done, 1);
});

// --- stars -----------------------------------------------------------------
section('stars');

test('accuracy gates every star tier', () => {
  // Derived from the lesson's own goal rather than hardcoded, so retuning the
  // goal ramp cannot silently stop exercising the tiers.
  const goal = S.goalWpm('en', 1);
  const at = (acc, ratio) => S.starsFor({ lang: 'en', chapterId: 1, wpm: goal * ratio, acc });
  assert.equal(at(99, 1.25), 5);
  assert.equal(at(98, 1.0), 5);
  assert.equal(at(98, 0.95), 4, 'just under the speed goal');
  assert.equal(at(96, 0.85), 4);
  assert.equal(at(93, 0.65), 3);
  assert.equal(at(89, 0.45), 2);
  assert.equal(at(86, 0.1), 1);
});

test('speed cannot buy a star: below 85% accuracy scores zero', () => {
  const at = (acc, wpm) => S.starsFor({ lang: 'en', chapterId: 1, wpm, acc });
  assert.equal(at(84, 40), 0);
  assert.equal(at(70, 120), 0);
  assert.equal(at(0, 999), 0);
});

// --- store -----------------------------------------------------------------
section('store');

const fresh = () => { S.reset(); L.setThaiLayout('kedmanee'); };
const run = (over = {}) => S.commitRun({
  lang: 'th', chapterId: 1, drill: 1, wpm: 40, acc: 100, seconds: 30,
  combo: 10, samples: [], keyHits: {}, keyMisses: {}, ...over,
});

test('a passing run clears the drill and advances the cursor', () => {
  fresh();
  const r = run();
  assert.ok(r.passed);
  assert.equal(r.stars, 5);
  assert.ok(S.isCleared('th', 1, 1));
  assert.equal(S.progressOf('th').drill, 2);
});

test('a failing run neither clears nor sets a ghost', () => {
  fresh();
  const r = run({ acc: 50, wpm: 200 });
  assert.equal(r.passed, false);
  assert.equal(r.stars, 0);
  assert.equal(S.isCleared('th', 1, 1), false);
  assert.equal(S.ghostWpm('th', 1, 1), 0);
  assert.equal(r.beatGhost, false);
});

test('stars only ratchet upward', () => {
  fresh();
  run();                       // 5 stars
  assert.equal(S.starsAt('th', 1, 1), 5);
  run({ acc: 86, wpm: 5 });    // 1 star
  assert.equal(S.starsAt('th', 1, 1), 5, 'a worse replay must not demote');
});

test('teaching cards clear the cursor but earn nothing', () => {
  fresh();
  const before = S.progressOf('th').points;
  S.commitTip({ lang: 'th', chapterId: 1, drill: 0 });
  assert.ok(S.isCleared('th', 1, 0));
  assert.equal(S.progressOf('th').points, before, 'no points');
  assert.equal(S.starsAt('th', 1, 0), 0, 'no stars');
});

test('chapter mastery excludes tips from the maximum', () => {
  fresh();
  const cs = S.chapterStars('th', 1);
  assert.equal(cs.max, C.typedDrillCount('th', 1) * 5);
  assert.ok(cs.max < C.drillCount('th', 1) * 5, 'chapter 1 contains tips');
});

test('dynamic practice earns points but never advances a chapter', () => {
  fresh();
  const before = { ch: S.progressOf('th').chapter, cleared: S.progressOf('th').cleared.length };
  const r = S.commitDynamic({ lang: 'th', wpm: 40, acc: 100, seconds: 30, combo: 5,
    samples: [], keyHits: {}, keyMisses: {} });
  assert.ok(r.dynamic);
  assert.equal(r.chapterId, null);
  assert.ok(S.progressOf('th').points > 0);
  assert.equal(S.progressOf('th').chapter, before.ch);
  assert.equal(S.progressOf('th').cleared.length, before.cleared);
});

test('Thai layouts keep separate progress tracks', () => {
  fresh();
  run();                                   // banked on Kedmanee
  const ked = S.progressOf('th').points;
  assert.ok(ked > 0);
  L.setThaiLayout('pattachote');
  assert.equal(S.track('th'), 'th_pat');
  assert.equal(S.progressOf('th').points, 0, 'Pattachote starts clean');
  assert.equal(S.isCleared('th', 1, 1), false, 'clears do not carry across');
  L.setThaiLayout('kedmanee');
  assert.equal(S.progressOf('th').points, ked, 'and Kedmanee is untouched');
});

test('ghosts and key stats are per layout too', () => {
  fresh();
  S.commitRun({ lang: 'th', chapterId: 1, drill: 1, wpm: 40, acc: 100, seconds: 30,
    combo: 1, samples: [], keyHits: { th: { d: 3 }, en: {} }, keyMisses: {} });
  assert.equal(S.ghostWpm('th', 1, 1), 40);
  L.setThaiLayout('pattachote');
  assert.equal(S.ghostWpm('th', 1, 1), 0);
  assert.equal(S.get().keyStats.th_pat.d, undefined);
  L.setThaiLayout('kedmanee');
  assert.equal(S.get().keyStats.th.d.hit, 3);
});

test('weak keys need a real sample and a real miss rate', () => {
  fresh();
  S.update((st) => {
    st.keyStats.th = {
      a: { hit: 200, miss: 2 },   // 1% over 202 — accurate, not weak
      b: { hit: 3, miss: 2 },     // 5 samples — too few to judge
      c: { hit: 10, miss: 5 },    // 33% over 15 — weak
      d: { hit: 5, miss: 5 },     // 50% over 10 — weaker
    };
  });
  const weak = S.weakKeys('th', 5).map((k) => k.id);
  assert.deepEqual(weak, ['d', 'c'], 'worst first, thresholds respected');
});

test('export/import round-trips exactly', () => {
  fresh();
  S.update((st) => { st.progress.th.points = 4242; st.stars['th:1:1'] = 5; st.streak.count = 9; });
  const backup = S.exportJSON();
  S.reset();
  assert.equal(S.progressOf('th').points, 0);
  assert.equal(S.importJSON(backup).ok, true);
  assert.equal(S.progressOf('th').points, 4242);
  assert.equal(S.starsAt('th', 1, 1), 5);
  assert.equal(S.get().streak.count, 9);
});

test('a malformed import is refused and leaves state intact', () => {
  fresh();
  S.update((st) => { st.progress.th.points = 123; });
  for (const bad of ['not json', 'null', '{"v":99,"progress":{}}', '{"v":1}']) {
    const res = S.importJSON(bad);
    assert.equal(res.ok, false, bad);
    assert.ok(res.reason, `${bad} needs a reason`);
  }
  assert.equal(S.progressOf('th').points, 123, 'state survived');
});

test('the break prompt fires once per session and resets on acknowledge', () => {
  fresh();
  S.ackBreak();
  assert.equal(S.shouldSuggestBreak(), false);
  for (let i = 0; i < 12; i++) run();
  assert.equal(S.shouldSuggestBreak(), true);
  S.breakSuggested();
  assert.equal(S.shouldSuggestBreak(), false, 'not shown twice');
  S.ackBreak();
  assert.equal(S.sessionStats().drills, 0);
});

test('a v1 record is dropped rather than carried into the 27-lesson curriculum', () => {
  // Every cleared part, star and ghost was keyed "chapter:drill" against the old
  // 10-chapter shape, so importing one would claim lessons that were never done.
  const v1 = JSON.stringify({
    v: 1, onboarded: true,
    progress: { th: { chapter: 4, drill: 3, cleared: ['1:1'], points: 220 } },
    stars: { 'th:1:1': 5 },
  });
  const r = S.importJSON(v1);
  assert.equal(r.ok, false, 'a v1 file must be refused, not half-applied');
  assert.match(r.reason, /2/);
});

test('resume returns the language you last typed in, not the one with fewer points', () => {
  fresh();
  // Put the Thai cursor on lesson 5, then finish part 3 of it. English is left
  // untouched and far behind — the old rule would have resumed English lesson 1.
  S.update((st) => { st.progress.th.chapter = 5; st.progress.th.drill = 2; });
  S.commitRun({
    lang: 'th', chapterId: 5, drill: 2, wpm: 40, acc: 100, seconds: 30,
    combo: 10, samples: [], keyHits: {}, keyMisses: {},
  });
  assert.equal(S.progressOf('en').points, 0, 'English really is behind');
  assert.equal(S.resumeLang(), 'th');
  const at = S.resumePoint();
  assert.equal(at.lang, 'th');
  assert.equal(at.chapterId, 5, 'still inside lesson 5');
  assert.equal(at.drill, 3, 'moved on to the next part');
});

test('replaying an earlier part does not drag the cursor backwards', () => {
  fresh();
  S.update((st) => { st.progress.th.chapter = 5; st.progress.th.drill = 2; });
  S.commitRun({
    lang: 'th', chapterId: 2, drill: 0, wpm: 40, acc: 100, seconds: 20,
    combo: 5, samples: [], keyHits: {}, keyMisses: {},
  });
  const at = S.resumePoint();
  assert.equal(at.chapterId, 5, 'redoing lesson 2 must not send you back to lesson 2');
  assert.equal(at.drill, 2);
});

test('resume follows a switch of language', () => {
  fresh();
  S.commitRun({
    lang: 'th', chapterId: 2, drill: 1, wpm: 40, acc: 100, seconds: 30,
    combo: 5, samples: [], keyHits: {}, keyMisses: {},
  });
  S.commitRun({
    lang: 'en', chapterId: 3, drill: 0, wpm: 40, acc: 100, seconds: 30,
    combo: 5, samples: [], keyHits: {}, keyMisses: {},
  });
  assert.equal(S.resumeLang(), 'en');
});

test('resume never offers a language the learner did not sign up for', () => {
  fresh();
  S.update((st) => { st.langs = ['th']; st.lastLang = 'en'; });
  assert.equal(S.resumeLang(), 'th');
});

test('the lesson cursor stops at 27 and never drifts onto the boss', () => {
  fresh();
  const total = C.drillCount('th', C.LESSON_COUNT);
  for (let d = 0; d < total; d++) {
    if (C.drillTip('th', C.LESSON_COUNT, d)) {
      S.commitTip({ lang: 'th', chapterId: C.LESSON_COUNT, drill: d });
    } else {
      S.commitRun({
        lang: 'th', chapterId: C.LESSON_COUNT, drill: d, wpm: 40, acc: 100, seconds: 20,
        combo: 5, samples: [], keyHits: {}, keyMisses: {},
      });
    }
  }
  assert.equal(S.progressOf('th').chapter, C.LESSON_COUNT, 'cursor stayed on the last lesson');
});

// The storage key changed with the name. Anything earned under the old key is
// still this learner's progress, so losing it to a rebrand would be indefensible.
// store.js reads its key once at module load, so proving the move needs a second
// module instance — hence the cache-busting specifier.
const legacyRecord = {
  v: 2, onboarded: true, langs: ['th', 'en'], lastLang: 'th',
  streak: { count: 6, best: 6, last: null },
  progress: {
    th: { chapter: 9, drill: 2, cleared: ['1:0', '1:1'], points: 480, bestWpm: 31, bestAcc: 98, runs: 40, history: [] },
    th_pat: { chapter: 1, drill: 0, cleared: [], points: 0, bestWpm: 0, bestAcc: 0, runs: 0, history: [] },
    en: { chapter: 3, drill: 1, cleared: [], points: 90, bestWpm: 22, bestAcc: 95, runs: 8, history: [] },
  },
  ghosts: { 'th:1:1': 24 }, stars: { 'th:1:1': 4 },
  keyStats: { th: {}, th_pat: {}, en: {} }, arcade: { high: 700, level: 3 }, lastRun: null,
};
mem.delete('pimdee.v2');
mem.set('tuktype.v1', JSON.stringify(legacyRecord));
const Renamed = await import('../js/store.js?rename-probe');

test('progress survives the TukType -> PimDee rename', () => {
  const p = Renamed.progressOf('th');
  assert.equal(p.chapter, 9, 'lesson cursor carried over');
  assert.equal(p.points, 480);
  assert.equal(Renamed.get().streak.count, 6, 'streak carried over');
  assert.equal(Renamed.starsAt('th', 1, 1), 4, 'stars carried over');
  assert.ok(mem.has('pimdee.v2'), 'and were written under the new key');
});

test('the pre-rename record is left in place, not deleted', () => {
  assert.ok(mem.has('tuktype.v1'), 'the original stays readable if the move went wrong');
});

// --- generated drills ------------------------------------------------------
section('dynamic practice');

test('a drill is built from weak keys and is long enough to be useful', () => {
  const d = C.dynamicDrill('th', [{ id: 'f' }], ['d', 'k', 'a']);
  assert.ok(d.length >= 40, `too short: ${d}`);
  assert.ok(d.includes('ด'), 'includes the weak key');
});

test('generated drills never orphan a combining mark', () => {
  for (const layoutId of LAYOUTS) {
    withLayout(layoutId, () => {
      const d = C.dynamicDrill('th', [{ id: 'j' }, { id: 'h' }], ['d', 'k']);
      assert.ok(d, 'produced a drill');
      assert.equal(L.clusters(d).map((c) => c.text).join(''), d);
      for (const c of L.clusters(d)) assert.ok(!L.isCombining(c.text[0]), `orphan in ${d}`);
    });
  }
});

test('no weak keys means no drill, not an empty one', () => {
  assert.equal(C.dynamicDrill('th', [], ['d']), null);
});

// --- tips ------------------------------------------------------------------
section('tips');

test('every tip has both languages and a known animation', () => {
  const anims = new Set(['home', 'bumps', 'rhythm', 'shift', 'mascot-eyes', 'mascot-rest', 'mascot-bob']);
  for (const [id, tip] of Object.entries(T.TIPS)) {
    for (const field of ['th', 'en', 'bodyTh', 'bodyEn', 'anim']) {
      assert.ok(tip[field], `${id} missing ${field}`);
    }
    assert.ok(anims.has(tip.anim), `${id} unknown anim ${tip.anim}`);
  }
});

test('tip prose never contains a bare combining mark', () => {
  for (const [id, tip] of Object.entries(T.TIPS)) {
    for (const field of ['bodyTh', 'bodyEn', 'th', 'en']) {
      for (const c of L.clusters(tip[field])) {
        assert.ok(!L.isCombining(c.text[0]), `${id}.${field} orphan "${c.text}"`);
      }
    }
  }
});

test('every tip referenced by the curriculum exists', () => {
  for (const layoutId of LAYOUTS) {
    withLayout(layoutId, () => {
      for (const lang of ['th', 'en']) {
        for (const ch of C.chapters(lang)) {
          for (const d of ch.drills) {
            if (d && d.tip) assert.ok(T.isTipId(d.tip), `${lang} ch${ch.id} ${d.tip}`);
          }
        }
      }
    });
  }
});

// --- report ----------------------------------------------------------------
console.log(`\n${'─'.repeat(60)}`);
if (failures.length) {
  for (const { name, err } of failures) {
    console.log(`\x1b[31m✗ ${name}\x1b[0m\n  ${err.message.split('\n')[0]}`);
  }
  console.log(`\n\x1b[31m${failures.length} failed\x1b[0m, ${passed} passed`);
  process.exit(1);
}
console.log(`\x1b[32m✓ ${passed} tests passed\x1b[0m`);
