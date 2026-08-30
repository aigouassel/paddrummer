# @paddrummer/videos

Material transcribed from video, and the two scripts that made it readable.

A stroke in a video has to be read twice — once for *when* it falls, once for
*which hand* played it — and the two halves fail differently. The rhythm comes
off the audio mechanically and fails loudly; the hands come off the frames by
eye and fail silently. The layout below follows that split, and so does
`Reading` on every piece.

## Layout

```
my.video-grid.py            rhythm, from the audio
my.video-frames.py          hands, from the frames
src/
  index.ts                  the barrel the package's exports map points at
  <clip-slug>/
    <clip-slug>.ts          the transcription
    <clip-slug>.test.ts     its tests
sources/
  <clip-slug>/
    README.md               what the clip is, and how to fetch it again
    grid.json               the fitted grid — the only committed artefact
    <id>.mp4                ignored
    .frames-<id>/           ignored, ~60MB, regenerable
    slow/                   ignored, derived audio
```

One folder per clip in each of `src/` and `sources/`, under the same slug. Name
it for the video, not its ID: `grahame-oshea-pad-grooves`, not `d_sp7QIH3Oo`.
The ID stays on the files inside, where it matches what yt-dlp wrote.

## Adding a clip

1. `sources/<slug>/`, then fetch with yt-dlp. Write the folder's README first —
   it is the only record of where the clip came from once the clip is gone.
2. `my.video-grid.py … --json grid.json`. Commit `grid.json`.
3. Read the hands off contact sheets from `my.video-frames.py`.
4. `src/<slug>/<slug>.ts`, re-exported from `src/index.ts`.
5. Every piece records a `VideoRef` (clip path relative to `sources/`, plus the
   seconds it spans) and a `Reading`: `frames` where every stroke was seen,
   `rhythm` where the hand assignment is conventional. A test refuses to let a
   `rhythm` piece ship without saying so in its own note.

**Nothing in `sources/` is committed unless named as safe.** The root
`.gitignore` covers `packages/videos/sources/**` as an allowlist — `grid.json`
and `*.md` are the exceptions. Clips are copyrighted and kept for personal
practice; a blocklist of extensions would only cover the formats someone
thought of.

`grid.json` is the point of committing anything here. It holds the fitted grid
and the onset peak at every slot, so a transcription stays checkable with no
video, no librosa and no ear — the video's answer to the `SourceRef` every
Stick Control exercise carries. It matters more here than for the book: a page
can be re-photographed off a shelf, a clip cannot be re-downloaded once it is
taken down.

## The scripts, and how reusable they are

Both take a clip path, so they are **shared by every source folder** rather
than copied into each. Both are `uv` PEP 723 scripts — run them directly, the
dependencies resolve themselves — and both shell out to **ffmpeg**.

**`my.video-grid.py` — reusable, but two flags are not.** The method is general:
fit one period and phase to the steadiest passage, then report which slots were
struck. Two defaults are tuned to the first clip and must be set for anything
else:

- `--unit 0.095 0.1055` searches for a sixteenth near 150bpm. Wrong range,
  wrong grid.
- `--per-bar 16` assumes sixteenths in 4/4.

`--fit FROM TO` is per-clip by nature, and the window matters more than it
looks: on the first clip 8.3–15.0s gave 149.28bpm and misaligned the opening,
while 8.3–22.0s gave 150.12 and aligned everything.

It deliberately will not answer "how many notes are there?" — onset strength is
a continuum, so that count is only ever the threshold you picked. `--sweep`
prints the curve so the absence of a plateau is visible rather than assumed.

**`my.video-frames.py` — reusable as is.** Frame extraction, caching and
labelling carry no assumption about the clip; `--crop` and `--box` are framing
choices you pass per video. One portability catch: the label font is a
hard-coded macOS path (`Arial Bold.ttf`).

Two rules it exists to enforce. Frames are **cached once** rather than sought,
because `ffmpeg -ss` lands on the wrong side of a keyframe often enough to
matter when three frames make a sixteenth. And **never interpolate** to slow a
clip down — repeating frames is safe, but `minterpolate` or any AI in-betweener
fabricates the evidence you are trying to read.

## When the second clip lands

`src/index.ts` re-exports the one clip wholesale. That does not survive a
second: both would export `PAD_GROOVES`, and `VideoRef`, `Reading` and
`PadGroove` are declared inside the clip module rather than beside it. Lift the
three types to `src/videoRef.ts` and give each clip's collection its own name
before adding one — cheaper now than as a rename across the catalogue later.

See [`docs/transcribing-video.md`](../../docs/transcribing-video.md) for the
method in full, and the four automated approaches that failed.
