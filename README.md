# paddrummer

A web app for learning the 40 international drum rudiments (PAS): play them
back at any tempo, read them in standard notation, and practise against a
metronome while the app listens to your pad through the microphone.

## Stack

| Concern         | Choice                                             |
| --------------- | -------------------------------------------------- |
| Build           | Vite + React + TypeScript                          |
| Notation        | VexFlow 5                                          |
| Timing          | Web Audio API (hand-rolled lookahead scheduler)    |
| Hit detection   | AudioWorklet onset detection                       |
| Tests           | Vitest                                             |
| Package manager | Yarn 4 (pinned per-project via `.yarnrc.yml`)      |

## Architecture

```
src/
  domain/     Pure TypeScript. No browser APIs. The rudiments, studies and
              exercises as data, phrase expansion, and hit scoring. A Phrase is
              the currency: one line for a rudiment, two for hand
              independence. Fully unit-testable.
  audio/      AudioContext, lookahead scheduler, click voice.
  input/      HitSource port: KeyboardHitSource | MicHitSource.
  notation/   Adapter from a domain Phrase to a VexFlow stave, one voice or two.
  storage/    ProgressStore interface + localStorage implementation.
  ui/         React components, one file per page plus the shared panels.
```

Three pages, routed on the URL hash: **Practice** (one rudiment, your tempo),
**Exercises** (guided routines that set the rudiment and tempo and advance
themselves) and **Stick Control** (exercises transcribed from a practice book,
read a page at a time). All three use the same three-column layout and share a
single audio engine, so calibration and input choice survive navigating between
them.

Exercises reads as a worksheet: every step of the routine is engraved down the
centre column, so the shape of the routine is visible before you start and the
playhead travels down it as the routine advances. The staves are engraved once
per exercise, not per frame — the phrases are built in a single memo so
`Score`'s effect never re-runs while playing.

Exercises are filed by level (beginner, intermediate, advanced) and, within a
level, by category. Levels are advisory: they exist so the list can be narrowed
to something workable today rather than presenting the whole syllabus at once.

**Hand independence** is its own category, and its own shape of pattern. A
rudiment is one stream of alternating strokes, which a flat list models
perfectly. Independence work is two streams at once — three in one hand against
two in the other, or a steady pulse under a moving figure — where two strokes
can fall on the same beat and a flat list cannot say so. Both are `Phrase`s
with one line or two; a two-line phrase is drawn the way drummers write it,
right hand above with stems up and left below with stems down.

A microphone hears one drum, so on a two-line piece it cannot tell which hand
struck. Timing is still scored; the keyboard is what checks the hands.

Two rules hold this together:

1. **`domain/` never imports a browser API.** Rendering, playback and scoring
   are three readers of one data structure, so a correctly-modelled rudiment is
   automatically playable, drawable and scorable.
2. **The audio engine is not React state.** React re-renders when the browser
   feels like it; the scheduler runs on its own timer against the audio clock.
   React subscribes to the engine for display only.

## Scripts

```bash
yarn dev        # dev server
yarn build      # production build
yarn test       # unit tests (domain layer)
yarn typecheck  # tsc --noEmit
```

## Roadmap

- [x] 1. Domain model + the 40 rudiments as data
- [x] 2. Audio clock, lookahead scheduler, metronome, tempo control
- [x] 3. VexFlow rendering + moving playhead
- [x] 4. Keyboard `HitSource` + scoring engine + latency calibration
- [x] 5. Microphone onset detection
- [x] 6a. Exercise list and guided progression
- [ ] 6b. `ProgressStore`: records, streaks, tempo history
- [ ] 7. *(v2)* Hono + Postgres backend for accounts and cross-device sync

## Keys

| Key | Does |
| --- | --- |
| `Space` | Start / stop, on either page |
| `F` | Left-hand strike |
| `J` | Right-hand strike |

## Playing with a microphone

Wear headphones. The microphone cannot tell your sticks from the metronome, so
played out loud the app hears its own click and counts it as your playing.

A microphone also cannot tell your hands apart — it hears one drum, not two
sticks — so sticking is only checked when the keyboard is the input.

Run **Calibrate** once per setup. Every input path delays the strike by tens of
milliseconds; the offset is constant and therefore removable, but only once it
has been measured.

## Parked

Thirteen of the forty stickings were never confirmed against a primary source —
the uncertainty is concentrated in the drag family, and Vic Firth publishes its
notation only as images. They carry `verified: false` in `src/domain/rudiments.ts`
and are listed by the `UNVERIFIED` export. By decision the app treats them as
correct and does not surface the flag; the flag remains as the record of what is
outstanding should someone want to check them against a rudiment book.

## Stick Control

Exercises transcribed from photographs of George Lawrence Stone's *Stick
Control* — 459 of them over the 21 pages that were photographed, kept a
book-page at a time with the printed numbering carried through so any one can
be checked against the source. The page images live in `assets/` and are
gitignored: the patterns are transcribed for personal practice, the scans are
not redistributed.

| Pages | Section |
| ----- | ------- |
| 9–13 | Triplets, and the short roll combinations |
| 14–15 | Short Rolls and Triplets |
| 16–19 | Flam Beats |
| 24–26 | Short Rolls in 6/8 |
| 30–33 | Combinations in 3/8 and 2/4 |
| 34–35 | Flam Triplets and Dotted Notes |
| 42 | Short Roll Progressions |

Most exercises are a short pattern followed by a tail that carries on by a
rule, so the tail is generated rather than copy-typed — several thousand
letters with no way to check them. Whole sections turn out to be generated at a
larger scale too: from no. 19, Flam Beats is nothing but every ordered pair of
its fourteen right-hand-led bars, and then the same again mirrored, which is
what makes 96 exercises out of eighteen. Pages 34 and 35 do the same with
eight.

The rule was verified against the printed page for every exercise, and where a
page breaks it the sticking is written out literally instead. The pages do not
always agree with each other, either: what a rest at the end of a bar does to
the hand the next bar leads with is one thing pages 24 and 33 answer
differently, so that is a property of the block rather than a rule of the book.

The check that matters on a transcription is arithmetic: every exercise must
fill a whole number of bars of its own metre, which a mistaken duration
template cannot do. Spot checks then pin the lines where a rule could plausibly
have been guessed wrong.

Two of these pages need note lengths that notation has no glyph for — eight
sixteenths in the space of six on pages 25 and 26, five eighths in the space of
four on page 42. They are plain fractions in the domain, and `notation/` knows
to draw them as an ordinary note with a number over the group. A test asserts
that VexFlow makes a bar of them exactly as long as the domain says it is,
because the two do that arithmetic independently and can disagree in silence.

Every exercise also records the image and the staff line it was read from, and
the app prints that reference under whichever one is selected. `my.show-source.py`
takes the same reference and crops that line out of the original photograph, so
a transcription can be put beside the page it came from instead of being taken
on trust:

```
page-12.HEIC · right column, line 1   ->   ./my.show-source.py 12 right 1
page-34.HEIC · full width, line 8     ->   ./my.show-source.py 34 left 8 --single
```

A page is usually twelve staff lines in two columns, but not always. Some rule
a line across the middle, which takes a line's worth of space without holding a
staff; page 34 gives its last six lines the full width of the page, because
they are four bars long. Both are recorded — as a blank row and as a column
span — so the crop lands on the right staff and the accounting still adds up.

Tests hold the mapping honest: no two exercises may claim the same staff line,
nothing may sit on a line the page leaves blank, and between them they must
account for every line slot down the page.

[`docs/transcribing-stick-control.md`](docs/transcribing-stick-control.md)
records how the reading was actually done — how to get a photograph on screen,
how to tell a rule from an exception, and what each of them costs when it is
wrong.
