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
  domain/     Pure TypeScript. No browser APIs. The rudiments as data,
              pattern expansion, and hit scoring. Fully unit-testable.
  audio/      AudioContext, lookahead scheduler, click voice.
  input/      HitSource port: KeyboardHitSource | MicHitSource.
  notation/   Adapter from a domain Pattern to a VexFlow stave.
  storage/    ProgressStore interface + localStorage implementation.
  ui/         React components.
```

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
- [ ] 5. Microphone onset detection + latency calibration
- [ ] 6. Exercise list, progression, `ProgressStore`
- [ ] 7. *(v2)* Hono + Postgres backend for accounts and cross-device sync

## Parked

Thirteen of the forty stickings were never confirmed against a primary source —
the uncertainty is concentrated in the drag family, and Vic Firth publishes its
notation only as images. They carry `verified: false` in `src/domain/rudiments.ts`
and are listed by the `UNVERIFIED` export. By decision the app treats them as
correct and does not surface the flag; the flag remains as the record of what is
outstanding should someone want to check them against a rudiment book.
