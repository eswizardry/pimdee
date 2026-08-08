# TukType — 27-lesson curriculum, lesson/part picker, resume fix

Date: 2026-08-08

## Context

Three problems, reported together after using the live site at typing.codedmark.com.

1. **The ramp is too steep.** TukType teaches 10 chapters, each introducing a whole
   keyboard row — 10 to 12 new keys at once. Reference courses such as
   typingstudy.com teach the same material over 27 lessons of roughly two new keys
   each, with about six parts per lesson. A learner cannot build muscle memory for
   twelve keys introduced simultaneously, and there is not enough repetition.

2. **You cannot pick a lesson or a part.** The journey map only exposes a chapter
   node, and clicking it hard-codes the drill index to
   `Math.min(prog.done, prog.total - 1)` (`js/screens/journey.js:132`). There is no
   way to go back and redo a specific drill. This was reported as "cannot reset
   progress" — Reset works; navigation is what is missing.

3. **Resume picks the wrong language.** `continueCard()` (`js/screens/home.js:147`)
   deliberately resumes whichever language has *fewer points*. Reproduced: with Thai
   at chapter 4 drill 3, the Continue card offered English chapter 1.
   `ghostCard()` (`js/screens/home.js:171`) repeats the same line.

Intended outcome: a gentle, evenly-paced 27-lesson course in all three curricula;
free navigation to any lesson and any part; and a Continue button that returns you
to what you were actually doing.

## Design

### 1 · Curriculum — 27 lessons, all three curricula

Thai Kedmanee, Thai Pattachote and English each get the same 27-lesson shape, so
the journey map, the unlock chain and the bilingual boss have no structural
special-cases.

| Lessons | Covers | New keys per lesson |
|---|---|---|
| 1–6 | home row, one finger pair at a time | 2 |
| 7–12 | top row | 2 |
| 13–17 | bottom row | 2 |
| 18–22 | number row | 2–5 |
| 23–24 | shift layer | batch |
| 25 | common words | none |
| 26 | short sentences | none |
| 27 | paragraphs | none |
| 28 | bilingual boss (unlocks when both languages finish 27) | none |

Lessons 25–27 reuse the authored word, sentence and paragraph content from the
current chapters 7–9, including the `childText` age-band variants.

The shift-layer lessons use `keys: '*'`, meaning *every glyph of this layout not yet
taught*. Computed from the layout table rather than typed out, so lessons 25–27 can
use unrestricted real Thai and the "no drill uses an untaught key" test still holds.

**What is borrowed and what is not.** Only the *shape* is taken from the reference
course: roughly two new keys per lesson, about six parts, repetition before mixing.
That is the generic pedagogy of any paper typing course. No lesson name, drill
sentence or word list is copied — names are written fresh, drill text is generated
from TukType's own finger map, the word pool is ordinary vocabulary, and lessons
25-27 reuse sentences already authored in this repo.

### 2 · Parts are generated, not hand-written

27 lessons x 6 parts x 3 curricula is 486 drills — too many to author by hand, and
every one of them must avoid untaught keys. So each lesson definition carries only
`{ id, keys, tip?, goalWpm }`, and a generator emits six parts:

1. new keys in isolation, with repetition
2. new keys against settled home-row anchors
3. new keys mixed with everything taught so far
4. words
5. words again, each repeated — the repetition typingstudy leans on
6. review: words plus a mixed line

Generation is deterministic (index arithmetic, no `Math.random`) so a ghost and a
star keep meaning the same thing across reloads, and tests are reproducible. This
extends the generator pattern already proven in `travelDrills()`
(`js/content.js:579`).

**Words come from a pool, not per-lesson lists.** Each curriculum has a pool of
common words. For each lesson the generator selects words that use only taught
glyphs *and* contain at least one of the lesson's new keys. Validity is guaranteed
by construction rather than by proof-reading, and early lessons — where almost no
real word is spellable — fall back to generated syllable groups, exactly as a
paper typing course does.

Teaching cards (`TIPS`) are inserted as an extra part at index 0 on the lessons that
carry one, so those lessons have seven parts. Uneven part counts are already
supported: today's chapter 1 has tips at indices 0 and 2.

### 3 · Lesson and part picker

- New screen at `#/lessons/:lang/:id` lists all parts of a lesson with stars, best
  wpm and a Play button on each row. **Any part of any unlocked lesson is directly
  clickable** — this is the fix for problem 2.
- The journey map paginates 27 lessons instead of 10.
- The practice screen gains a part stepper so you can step back one part without
  leaving the drill.

### 4 · Resume the last language played

New `lastLang` field, written by `commitRun`, `commitTip` and `commitDynamic`.
Read by `continueCard()`, `ghostCard()` and the Lessons nav item. Falls back to the
first configured language in `s.langs`.

### 5 · Store v2 — wipe

`migrate()` returns a blank state for anything that is not `v: 2`. Existing progress
is dropped and the learner re-onboards at lesson 1. Chosen deliberately: cleared
drills, stars and ghosts are all keyed `"chapter:drill"`, and a 27-lesson rebuild
makes every one of those keys meaningless.

Onboarding's `startChapter()` is remapped onto the 27-lesson scale (1 / 7 / 13 / 18 /
23), and the goal step gains a **"เริ่มจากบทที่ 1 · Start from lesson 1"** option so
the placement test cannot skip a learner forward against their wishes — the other
half of what was reported as "reset does not work".

### 6 · Naming

Internal identifiers stay `chapter` and `drill`. Renaming them to `lesson`/`part`
would touch every screen for no behavioural change. Only user-facing copy changes,
to บทที่ (lesson) and ตอนที่ (part).

## Files

- `js/content.js` — lesson tables, word pools, part generator (the bulk of the work)
- `js/store.js` — v2 migration, `lastLang`
- `js/screens/journey.js` — 27-lesson pagination
- `js/screens/lesson.js` — **new**, the part picker
- `js/screens/practice.js` — part stepper
- `js/screens/home.js` — `continueCard` / `ghostCard` use `lastLang`
- `js/screens/onboarding.js` — `startChapter` remap, start-from-lesson-1 option
- `js/main.js` — route for the lesson detail screen
- `test/run.mjs` — extend

## Verification

- `node test/run.mjs` — existing invariants plus new ones: every curriculum has 27
  lessons, every lesson has at least 6 parts, no drill uses an untaught key, the
  unlock chain is reachable from lesson 1, v1 data migrates to a blank v2 state,
  and `lastLang` round-trips.
- Manual, on `python3 serve.py`: complete a Thai part, confirm Continue returns to
  Thai at the right part; open a lesson and jump directly to part 4 of an earlier
  lesson; confirm the placement test can be declined in favour of lesson 1.

## Out of scope

Play Store assets. That request was pane bleed-through from an unrelated session;
TukType is a static site with no Android app.
