# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev                  # Vite dev server on :5173
yarn test                 # vitest run — the whole suite
yarn test:watch
yarn typecheck            # tsc --noEmit
yarn build                # typecheck, then vite build

yarn vitest run src/domain/stickControl.test.ts        # one file
yarn vitest run -t 'fills a whole number of bars'      # one test by name
```

Vitest is configured with `environment: 'node'` and `include: ['src/**/*.test.ts']`
— note the `.ts`, so a `.tsx` test would be silently skipped. There is no jsdom:
VexFlow's `StaveNote`, `Tuplet` and `Voice` all construct headlessly, which is
enough to test the notation layer's arithmetic without rendering.

Yarn 4 is pinned per-project via `.yarnrc.yml`; use `yarn`, not `npm`.

## Architecture

```
src/
  domain/     Pure TypeScript. The rudiments, studies, exercises and book
              transcriptions as data, plus phrase expansion and hit scoring.
  audio/      AudioContext, lookahead scheduler, click voice.
  input/      HitSource port: KeyboardHitSource | MicHitSource.
  notation/   Adapter from a domain Phrase to a VexFlow stave.
  storage/    Empty. The README describes a ProgressStore here; nothing is
              written yet, and nothing imports it.
  ui/         React components, one file per page plus the shared panels.
```

Three pages routed on the URL hash: **Practice**, **Exercises**, **Stick
Control**. They share one audio engine, so calibration and input choice survive
navigation. They divide by *interaction model*, not by subject — Practice is one
piece at your tempo, Exercises a routine that drives itself, Stick Control
browsing a source — which is the axis to keep when adding material.
`domain/catalogue.ts` is Practice's side of that: everything playable on its
own, grouped, each entry carrying what a picker needs so the component does not
branch on kind.

Four load-bearing decisions, each of which is easy to break by accident:

**`domain/` never imports a browser API.** Rendering, playback and scoring are
three readers of one data structure, so a correctly-modelled rudiment is
automatically playable, drawable and scorable. Keep it that way — including in
tests: a test *about* notation belongs in `notation/`, even when its subject
matter is domain data.

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
beat. `notation/vexDuration.ts` is the only place that knows how one length
splits into the three facts VexFlow needs — glyph, dot count, tuplet ratio. Two
consequences worth remembering:

- Dots appear twice on purpose. The `d` suffix sets the note's *tick value* and
  therefore its spacing; the count draws the glyphs. Attaching one without the
  other is invisible in a single voice and badly wrong against a second.
- `Tuplet` construction rewrites its notes' ticks in place, but a `Voice` caches
  its total the moment tickables are added. **Build tuplets before the voice.**
  `voiceTicks.test.ts` guards this and explains why.

## Stick Control transcriptions

`src/domain/stickControl.ts` holds ~460 exercises read off photographs of George
Lawrence Stone's *Stick Control*. The photographs are in `assets/` and are
**gitignored** — a copyrighted book, transcribed for personal practice.

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

## Conventions

- **`my.` prefix** marks files that are personal rather than part of the
  project: `my.show-source.py` is a checking aid, not app code. Project code
  uses natural names.
- **Git**: in this repository (and only this one) Claude commits and curates the
  history — logical commits with conventional-commit prefixes, not one blob. Do
  not push or touch remotes without asking.
- Prose in this codebase explains *why*, not *what*. Match it: comments that
  restate the code are worse than none, and the existing ones set the bar.
