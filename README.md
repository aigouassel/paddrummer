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
Control*, kept a book-page at a time with the printed numbering carried through
so any one of them can be checked against the source. The page images live in
`assets/` and are gitignored: the patterns are transcribed for personal
practice, the scans are not redistributed.

Most of these exercises are a short pattern followed by a tail that simply
carries on alternating, so the tail is generated from the rule the page follows
rather than copy-typed — several thousand letters with no way to check them.
The rule was verified against the printed page for every exercise, and the
pages that break it are written out literally instead.

The check that matters on a transcription is arithmetic: every exercise must
fill a whole number of bars of its own metre, which a mistaken duration
template cannot do.

Every exercise also records the image and the staff line it was read from, and
the app prints that reference under whichever one is selected. `my.show-source.py`
takes the same reference and crops that line out of the original photograph, so
a transcription can be put beside the page it came from instead of being taken
on trust:

```
page-12.HEIC · right column, line 1   ->   ./my.show-source.py 12 right 1
```

Tests hold the mapping honest: no two exercises may claim the same staff line,
and between them they must account for every line printed on the page.
