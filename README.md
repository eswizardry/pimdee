# ตุ๊กไทป์ · TukType

A bilingual typing tutor — Thai (Kedmanee or Pattachote) and English (QWERTY) — with one
combined score and per-language progress. Implementation of the `TukType.dc.html`
design doc (Claude Design project `9b454a97`).

Zero build step: plain HTML, CSS and ES modules.

## Run

```bash
python3 serve.py          # http://127.0.0.1:8777/
python3 serve.py 8080     # or pick a port
```

Any static server works, but `serve.py` sends `Cache-Control: no-store` so module
edits show up on reload. Opening `index.html` via `file://` will **not** work —
ES modules require an HTTP origin.

## Test

```bash
node test/run.mjs          # no dependencies, no install
```

61 tests over the parts where a mistake is invisible in review and obvious to a
learner: layout tables (row alignment, no duplicate glyphs, every glyph
reachable, standard finger assignment), curriculum invariants run separately for
**each Thai layout** (no untaught keys, nothing unreachable, no orphaned tone
marks, keys introduced before use, no Arabic digits in Thai lesson text), the
typing engine (accuracy, combo, backspace refunds, cluster-aware cursor, the
live-wpm guard not leaking into recorded results), star thresholds, and store
behaviour (per-layout progress tracks, tips earning nothing, dynamic practice not
advancing chapters, import validation).

The suite was checked against deliberate regressions — a dropped glyph, an
untaught key in a drill, letting speed override accuracy, backspace not
refunding an error, and dynamic drills going short again. All five are caught,
each by the test that should catch it.

## Screens

| Route | Design | What it does |
|---|---|---|
| `#/onboarding` | 1h | 4 steps; a 30-second placement test per language sets each starting chapter |
| `#/home` | 1a / 1b | Combined score, per-language stats, streak, weak keys, continue card. "Dense" toggles the 1b layout |
| `#/lessons` | 1e | Braided journey map — Thai lane above, English below, bilingual boss at chapter 10 |
| `#/practice/:lang/:ch/:drill` | 1c | The typing engine: live heatmap, ghost pacer, reacting mascot, audio |
| `#/results` | 1g | You vs the ghost of your best run, where you slipped, score movement |
| `#/arcade` | 1f | คำร่วง / Falling Words — mixed-script arcade mode |
| `#/lyrics` | 1d | Eyes-up verse mode, no keyboard shown |
| `#/stats` | — | History and a per-key accuracy heatmap for both layouts |

## Layout of the code

```
js/
  hands.js     Animated hands — next-finger highlight + press animation
  layouts.js   Kedmanee + Pattachote + QWERTY maps, finger map, cross-layout lookup, clustering
  content.js   Curricula: 10 chapters per language (Thai has one per layout), arcade pool, verse
  tips.js      Teaching cards — animated hands/mascot instead of video
  ads.js       Reserved AdSense placements (off by default)
  engine.js    Typing engine — keystrokes, accuracy, combo, rolling-wpm samples
  store.js     localStorage progress: points, ghosts, streak, key stats
  keyboard.js  The live keyboard panel
  ui.js        DOM helpers + the ตุ๊ก mascot
  audio.js     WebAudio key feedback
  main.js      Shell + hash router
  screens/     One module per screen
```

## Two things worth knowing

**Thai is a 4-level layout.** Every key carries an unshifted and a shifted glyph,
and tone marks / above-below vowels are their own keys. One keystroke is one
codepoint, which is what the engine counts. But those marks have no standalone
form, so display groups them into clusters (`layouts.clusters`) and keycaps carry
them on a dotted circle (`layouts.capGlyph`) — otherwise the browser draws a
placeholder circle and the text looks broken.

**Every key chapter (1–6) adds one mirrored finger pair per drill** — the same
finger on both hands at once, so each lesson teaches one motion rather than two.
Thai chapter 1 opens on ก/า (the middle fingers) because that spells a real word,
`กา`, from two visible letters on lesson one. Numbers pair inwards from the index
fingers (4&7, 3&8, 2&9, 1&0, 5&6).

A chapter tagged `mechanic: true` teaches a technique rather than a key set —
English "Capitals" is shift applied to letters already known — so the
introduce-in-order rule does not apply to it.

Thai chapter 3 introduces **no new keys**: `่ ้` come from the home row and `ั ี`
from the top row. Thai's real difficulty is stacking a vowel and a tone on one
consonant, so that chapter drills only that. The bottom-row vowels `ิ ื` moved to
chapter 4, where they physically live (b and n), and `ุ ึ` to chapter 5.

Each key-chapter drill carries a `focus` label naming the fingers it trains,
shown under the drill counter. A drill is a plain string, `{ text, focus }`, or
`{ tip }`. Thai tone marks never appear alone in a drill — they always sit on a
consonant (`ก่า`, not `่`).

**The hands teach fingering, not just position.** Under the keyboard, the finger
that should press the next key lights up in that finger's colour (matching the
keycap's bottom edge), and dips on each keystroke — red if you missed. Shift is
shown in violet on the pinky of the *opposite* hand, since reaching for both with
one hand is the habit touch typing exists to prevent. Space lights both thumbs.
The finger map is standard touch-typing assignment (`FINGER_COLS` in
`layouts.js`); the hands follow the layout flip in chapter 10 too.

**Chapter 10 is deliberately mixed-script.** `layouts.lookupAny` falls back to the
other layout, so the keyboard panel flips between KEDMANEE and QWERTY mid-sentence
and key stats land on the right heatmap.

## Progress rules

- Every drill is scored **0–5 stars**. Accuracy gates each tier and speed only
  decides how far up you go, measured against the chapter's `goalWpm`:

  | Stars | Accuracy | Speed vs. chapter goal |
  |---|---|---|
  | 5 | ≥98% | ≥100% |
  | 4 | ≥95% | ≥80% |
  | 3 | ≥92% | ≥60% |
  | 2 | ≥88% | ≥40% |
  | 1 | ≥85% | — |
  | 0 | <85% | fails regardless of speed |

  You cannot buy stars with speed: 84% accuracy at 40 wpm scores zero. Stars only
  ever go up, so a lazy replay can't take away a 5 you already earned.
- **0 stars = not cleared** — the chapter does not advance and no ghost is set.
- Points = speed × accuracy², plus a first-clear bonus that grows with chapter.

## Lesson types

Beyond the ordinary drills:

- **Travel drills** (`travelDrills` in `content.js`) — one finger moving up and
  down its own column, appended to the row-learning chapters (2, 4, 5). Generated
  from the finger map, and filtered to keys already taught, so they stay correct
  if a layout changes. Thai tone marks ride a `ก` carrier.
- **Common patterns** — the shapes that recur constantly, at the head of chapter 7.
  Thai gets `เ–ีย`, `ั` + `ง`, `–ือ` and `ร` clusters; English gets `the/ing/tion`.
- **Content-bearing drills** — chapter 8 types facts rather than filler, so the
  sentence is worth reading while the hands work. The Thai ones deliberately
  contain no Arabic numerals: those are not on the Kedmanee layout at all, and
  forcing a script switch belongs in the chapter 10 boss drill.
- **Teaching cards** (`tips.js`) — the habit-and-ergonomics lessons a course
  needs between drills: home position, the bumps on ด/`่`, don't look down,
  accuracy before speed, posture, breaks, shift with the opposite pinky, think
  in words. They sit in the drill
  sequence as `{ tip: 'home' }` and are read rather than typed, so they clear the
  cursor forward but earn **no stars and no points** — `chapterStars` counts only
  typed drills. ENTER or the button advances.

  TypingClub uses short videos for these; we animate the hands and mascot we
  already have. It teaches the same thing, stays in the app's visual language,
  and a Thai learner isn't left watching English narration.
- **Tricky words** — at the tail of chapter 7. English gets the homophone traps
  (`their/they're/there`, `its/it's`) and the classic misspellings. Thai's
  equivalent problem is spelling rather than homophone choice, so it drills the
  forms Thai writers most often get wrong — `อนุญาต`, `สังเกต`, `กะเพรา`,
  `เกม`, and the `ค่ะ` / `คะ` distinction. Only correct spellings appear.
- **Dynamic Practice** (`#/practice/:lang/dynamic`) — a drill generated from the
  keys you actually miss, bursting each weak key then interleaving it with keys
  you've settled. It earns points and feeds key stats but never clears a drill,
  moves the chapter cursor, or sets a ghost. With no miss data yet it shows an
  empty state rather than a meaningless drill.
- The "ghost" is your best wpm on that exact drill; the grey tick on the progress
  bar is where it would be right now.
- Everything lives under the `tuktype.v1` localStorage key. `#/stats` → Reset
  wipes it.

## Wrong input method

The commonest first-run failure, especially for a learner sitting alone: the
drill wants Thai but the operating system is still on English. The physically
correct key then produces the wrong character and every keystroke reads as a
miss — which looks like a broken app rather than a setting.

After three wrong-script keystrokes in a row the practice screen shows a red
banner naming the fix (`Windows + Space`, or `Control + Space` on a Mac) in both
languages, and it clears as soon as the right script starts arriving. Space is
treated as neither evidence nor exoneration, since it is the same key under every
input method — otherwise a drill like `กก าา` resets the counter before the hint
can appear.

## Accessibility

The whole product is a keyboard, so keyboard access is not optional:

- **Landmarks and a skip link** — `<nav>`, `<main id="tt-main">`, and a skip link
  as the first tab stop. Navigating a route moves focus into `<main>` so keyboard
  and screen-reader users land in the new content; a screen whose `mount()`
  claims focus (the typing stage) runs afterwards and wins.
- **No click handlers on non-interactive elements.** The sound toggle used to be
  a `<div onClick>` — unreachable and unfireable from a keyboard. It is now a
  real `<button role="switch" aria-checked>`. An automated check asserts nothing
  with `cursor: pointer` is unfocusable.
- **Decorative graphics are hidden** from the accessibility tree: the hands, the
  mascot, the sparklines, and the whole on-screen keyboard. They restate what the
  text already says, and sixty keycaps read aloud per keystroke is unusable.
- **The hands caption is deliberately *not* a live region** — it changes on every
  keystroke, so announcing it would be constant noise.
- **`lang` on the prompt**, since a screen reader set to English mangles Thai and
  that is the one element the learner is actually reading.
- **Contrast** — `--dim` was 4.1:1 (under AA) and `--dim-2`, the not-yet-typed
  prompt text, was 2.33:1, which was genuinely hard to read. Now 5.7:1 and
  3.76:1. Every focusable control has an accessible name.

## Backup and session pacing

**Backup** (Stats → Export / Import). Progress lives only in this browser's
localStorage, so one cleared cache or one new machine loses it. Export writes a
dated JSON file; import validates it (parseable, `v: 1`, has a `progress`
object) *before* touching anything and asks for confirmation, because it
replaces everything. A malformed file fails with a reason and leaves state
untouched.

**Session pacing.** After 12 minutes of typing or 12 drills, the results screen
shows the break card once — the same text the `breaks` teaching card uses,
surfaced at the moment it applies. It is deliberately not persisted: a session is
this sitting at the keyboard, and should start fresh tomorrow. Acknowledging it
resets the counter.

## Ads (Google AdSense)

Placements are reserved but **nothing loads today** — `ADS.enabled` is false and
no publisher id is set, so `adSlot()` returns null and the screens render exactly
as they did before. Preview the reserved space with `?ads=preview` on the URL.

To switch on, after the site is approved:

1. Uncomment the loader `<script>` in `index.html` and put the real publisher id in it.
2. Set `ADS.client` and the four `ADS.units` ids in `js/ads.js`.
3. Set `ADS.enabled = true`.

| Slot | Screen | Why here |
|---|---|---|
| `homeFooter` | Home | Below the dashboard — progress already seen, choosing what's next |
| `resultsFooter` | Results | The natural pause between drills; below the actions so it never competes with "next drill" |
| `journeyFooter` | Journey | Below the map |
| `statsFooter` | Stats | Below the heatmaps |

**Practice, Arcade and Lyrics carry no ads, deliberately.** Two reasons, and the
second is the serious one:

1. Those screens hold keyboard focus on a stage element and consume every
   keystroke. An ad iframe that grabs focus breaks typing outright.
2. A user hammering keys beside an ad unit generates accidental clicks. That is
   invalid traffic, and it is *your* AdSense account at risk, not the
   advertiser's.

Onboarding is excluded too — ads before the user has seen the product make a bad
first run, and AdSense discourages ads on thin screens.

Slot heights are reserved up front so a late-arriving ad cannot push the page
around (cumulative layout shift). If the script is blocked or fails, the slot
stays empty and the screen still works.

## Pattachote

Both Thai layouts ship and are switchable — in onboarding, or from the Stats
screen at any time.

**Layout data** comes from the `pat` variant of freedesktop's
`xkeyboard-config/symbols/th`, the table X11 and Wayland ship. It was converted
from X11 keysym names programmatically rather than transcribed, and checked two
ways: all four row lengths match QWERTY exactly, and the home row agrees with an
independently published layout. (An earlier hand-read source turned out to list
only 10 of the 11 home keys, omitting ไ and so putting ข on the wrong finger —
which is why the machine-readable source was worth chasing.)

**Each layout has its own curriculum for chapters 1–6**, because those chapters
are defined by where keys physically sit — Kedmanee's home row is
`ฟ ห ก ด เ ้ ่ า ส ว`, Pattachote's is `้ ท ง ก ั  ี า น เ ไ ข`. Both use the
same mirrored-pair pedagogy, and both happen to spell a real word in the very
first drill (`กา`). Chapters 7–10 are position-independent and shared.

**Progress is per layout, not just per language.** `store.track()` maps `'th'` on
to `th` or `th_pat`, so chapters, stars, ghosts and the per-key heatmap all stay
separate. Switching layouts never destroys progress and never carries a miss rate
across to a keyboard where the key isn't in that place.

> The Pattachote *positions* are machine-verified against the layout table by the
> same validators used for Kedmanee, and its word drills have been audited so
> every entry is a real Thai word. What has **not** happened is a review by
> someone who actually types Pattachote — whether these are the *right* words to
> drill, and whether the progression feels right in the hand, is a judgement no
> validator makes. Worth doing before this goes in front of learners.

## Not built
- Server-side accounts; progress is per-browser.
- Licensed song lyrics — verse mode uses public-domain text.
