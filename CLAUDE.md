# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev                  # Vite dev server on :5173 (delegates to @paddrummer/web)
yarn test                 # every workspace in one vitest run
yarn test:watch
yarn typecheck            # tsc --noEmit in each workspace, in parallel
yarn build                # typecheck, then vite build

yarn workspace @paddrummer/stick-control test          # one package
yarn vitest run -t 'fills a whole number of bars'      # one test by name, anywhere
```

Vitest runs as **projects**, one per workspace: the root `vitest.config.ts`
names them, and each brings its own config, so a package is tested identically
whether reached from the root or from `yarn workspace <name> test`. All of them
use `environment: 'node'` and `include: ['src/**/*.test.ts']` — note the `.ts`,
so a `.tsx` test would be silently skipped. There is no jsdom: VexFlow's
`StaveNote`, `Tuplet` and `Voice` all construct headlessly, which is enough to
test the notation layer's arithmetic without rendering.

Yarn 4 is pinned per-project via `.yarnrc.yml`; use `yarn`, not `npm`.

## Architecture

A Yarn workspace monorepo: seven packages and one app.

```
packages/
  core/           The model. Fraction, duration, pattern, phrase, piece,
                  timeline, scoring. Depends on nothing.
  rudiments/      The 40 PAS rudiments as data.
  exercises/      Studies and the guided routines built from them — the
                  material the app authored, as opposed to the three below.
  stick-control/  Stone's book, transcribed from photographs.
  videos/         Transcriptions read off video.
  catalogue/      The picker model. The one place that knows all the material.
  notation/       Adapter from a Phrase to a VexFlow stave.
apps/
  web/            audio/ (AudioContext, lookahead scheduler, click voice),
                  input/ (HitSource: keyboard | microphone, and the onset
                  worklet), ui/ (one file per page plus the shared panels).
```

The material packages split by **provenance**: `rudiments`, `stick-control` and
`videos` are sources outside the app; `exercises` is what the app wrote itself.
That is the axis to keep when adding material — a new book is a new package, a
new routine goes in `exercises`.

`audio` and `input` stay inside the app on purpose. They are mutually
recursive — the engine owns the input switching, and the microphone source
needs the worklet — and a package boundary between them would be a cycle rather
than a boundary.

Three pages routed on the URL hash: **Practice**, **Exercises**, **Stick
Control**. They share one audio engine, so calibration and input choice survive
navigation. They divide by *interaction model*, not by subject — Practice is one
piece at your tempo, Exercises a routine that drives itself, Stick Control
browsing a source — which is the axis to keep when adding material.
`@paddrummer/catalogue` is Practice's side of that: everything playable on its
own, grouped, each entry carrying what a picker needs so the component does not
branch on kind.

Four load-bearing decisions, each of which is easy to break by accident:

**No package under `packages/` may import a browser API**, except `notation`.
Rendering, playback and scoring are three readers of one data structure, so a
correctly-modelled rudiment is automatically playable, drawable and scorable.
This is no longer a convention: `tsconfig.base.json` sets `lib: ["ES2022"]` with
no DOM, so `window`, `document` and `AudioContext` are *type errors* in six of
the seven packages. `notation` adds DOM back because VexFlow's own types
reference SVG and canvas elements.

The rule extends to tests: a test *about* notation belongs in `notation`, even
when its subject matter is domain data — which is why `@paddrummer/notation`
devDepends on `@paddrummer/stick-control`, to assert every duration the book
uses has a glyph. Two other test-only edges exist for the same reason:
`core` devDepends on `rudiments` (the model's hard cases are checked against
real repertoire, not fixtures), and `videos` on the other three material
packages (to assert that nothing but a groove carries a `part`). All three are
devDependencies, and none of them is a runtime cycle.

**A `Phrase` is the currency.** One line for a rudiment, two for hand
independence, where two strokes can fall on the same beat. Rests are modelled
rather than inferred from gaps, because two voices on a stave are aligned by
tick position and a line with missing rests draws its notes packed at the bar's
start.

**The audio engine is not React state.** React re-renders when the browser
feels like it; the scheduler runs on its own timer against the audio clock.
`Sequencer` owns only "which notes fall due in the next ~120ms", which makes it
a pure function of a timestamp and testable with a fake clock. React subscribes
to the engine for display only.

**Durations are lengths of time, not glyphs.** A 16th-note triplet is `1/6` of a
beat. `packages/notation/src/vexDuration.ts` is the only place that knows how one length
splits into the three facts VexFlow needs — glyph, dot count, tuplet ratio. Two
consequences worth remembering:

- Dots appear twice on purpose. The `d` suffix sets the note's *tick value* and
  therefore its spacing; the count draws the glyphs. Attaching one without the
  other is invisible in a single voice and badly wrong against a second.
- `Tuplet` construction rewrites its notes' ticks in place, but a `Voice` caches
  its total the moment tickables are added. **Build tuplets before the voice.**
  `voiceTicks.test.ts` guards this and explains why.

## Stick Control transcriptions

`packages/stick-control/src/` holds ~460 exercises read off photographs of
George Lawrence Stone's *Stick Control*, one file per section of the book under
`pages/` over a shared `book.ts` (types and page geometry), `sticking.ts` (the
tail generators) and `cells.ts` (the shape pages 24–26, 32 and 33 share).
The photographs are in `packages/stick-control/sources/` and **are committed**,
by decision, so any exercise can be checked against its page from a clone
alone. They are a copyrighted book, photographed for personal practice — the
video clips, by contrast, stay gitignored.

The governing rule: **nothing is inferred from a rule that was not first
verified against the page.** Most exercises are a pattern plus a tail that
follows some rule, and generating the tail is right — copy-typing thousands of
letters has no way to be checked. But the rule must be read off the page first,
and where a page breaks it, the sticking is written out literally. The pages do
not always agree with each other either; see `restTakesAHand`, where pages 24
and 33 answer the same question differently.

Reading a page: the images are HEIC, which the Read tool cannot open. macOS ships
`sips`, which converts them (`sips -s format png page-14.HEIC --out /tmp/x.png`).
The photographs are hand-held landscape, so rotate 90° clockwise, then crop one
column at full resolution — the printed sticking letters are then unambiguous.

Every exercise records a `SourceRef` — image, column, staff line — and the app
prints it under the selected exercise. `./my.show-source.py 12 right 1` crops
that line out of the original photograph. A page is usually twelve staff lines
in two columns, but some rule a line across the middle (which takes a slot
without holding a staff: `blankRows`) and page 34 gives its four-bar lines the
full page width (`SourceRef.columns`).

The tests are the reason any of this can be trusted, and new pages must keep
them passing: every exercise fills a whole number of bars of its own metre; no
two claim the same staff line; nothing sits on a blank slot; and between them
they account for every line slot down the page. Add a spot check for any line
where a rule could plausibly have been guessed wrong.

See `docs/transcribing-stick-control.md` for how the transcription was done and
what it cost to get right.

## Video transcriptions

`packages/videos` holds both the transcriptions and the tools that produced
them. One folder per clip under `sources/`, holding the video, its frame cache
and `grid.json`.

**Only `grid.json` and the folder's README are committed.** The clips are
copyrighted, so `.gitignore` covers `packages/videos/sources/**` as an
**allowlist** — everything is ignored unless named as safe. Add a new kind of
artefact there and it is ignored by default; that is deliberate, and the
negation to un-ignore something should be made only for text you have read.

`grid.json` is the video's answer to `SourceRef`: the fitted grid (unit, phase,
bpm) and the onset peak at every sixteenth slot across the clip. It is what
makes a transcription checkable by someone holding only the repository — no
video, no librosa, no ear — which matters more here than for the book, because
a clip cannot be re-photographed from a shelf.

`my.video-grid.py` reads rhythm off the audio and deliberately refuses to
answer "how many notes are there?" — onset strength is a continuum, and
`--sweep` shows the absence of a plateau rather than hiding it. `my.video-frames.py`
tiles chosen frames into a contact sheet, which is how hands are read; nothing
automatic managed that. Both take a clip path, so they are shared by every
source folder rather than copied into each.

See `docs/transcribing-video.md` for the method and the four automated
approaches that failed.

## Conventions

- **`my.` prefix** marks files that are personal rather than part of the
  project: `my.show-source.py` is a checking aid, not app code. Project code
  uses natural names.
- **Git**: in this repository (and only this one) Claude commits and curates the
  history — logical commits with conventional-commit prefixes, not one blob. Do
  not push or touch remotes without asking.
- Prose in this codebase explains *why*, not *what*. Match it: comments that
  restate the code are worse than none, and the existing ones set the bar.
