# grahame-oshea-pad-grooves

Five pieces transcribed from one 34-second clip, tiling it end to end. Kit
grooves voiced on a single practice pad: butt of an inverted stick for the bass
drum, shoulder of the other laid across the head for the snare.

The clip, and the measured grid it was read off, are in
[`sources/grahame-oshea-pad-grooves/`](../../sources/grahame-oshea-pad-grooves/README.md).

## The types, and what a second clip could keep

Everything here lives in one module today because there is only one clip. Most
of it is not clip-specific, and the table says which is which.

| | Reusable? |
|---|---|
| `VideoRef` | **Yes, verbatim.** Clip path, title, author, and the seconds a passage spans. Nothing about it is about this video. |
| `Reading` | **Yes, as an axis.** The values may need extending. |
| `PadGroove` | **Yes, once renamed.** The shape — `Piece` plus `at`, `bpm`, `reading` — is what any video transcription needs; only the name is about pads. |
| `SOURCE` | No, by definition. One per clip. |
| `PART` | **No — and copying it is the trap.** See below. |
| `voiced` | Only if `PART` holds for the new clip. |
| `voice` / `groove` | Yes for another two-voice pad piece; no for three voices or mixed durations. |

`Piece`, `Hand`, `StickPart` and the phrase builders come from
`@paddrummer/core` and are already shared — nothing to do there.

### `VideoRef` — the provenance record

Where the piece came from, so it can be checked rather than trusted: the clip
relative to `sources/`, its title and author, and `from`/`to` in seconds. The
clip is not committed, which is exactly why this has to be precise — plus
`grid.json` beside it, which keeps the reading checkable with no video at all.

### `Reading` — how much was actually seen

`'frames'` means every stroke was read off a named frame. `'rhythm'` means the
rhythm, voicing and section were read, but which hand plays each stroke inside
a fill is a conventional sticking: a sixteenth at 150bpm is three frames and
the strokes are not separable.

This is the type most worth keeping, because it makes the limit of a
transcription a **field rather than a footnote** — and a test refuses to let a
`'rhythm'` piece ship unless its own note admits it, so a reader meets the
caveat where the sticking is. It earned that on the eighths, which shipped a
hand assignment without saying how it was established until the test failed.

The two values are not obviously enough for the next clip. The fills here were
settled partly by the captions *naming* the figure and partly by onset spacing
measuring the subdivision — neither is reading a frame, and both are currently
folded into `'rhythm'`. If a future clip is transcribed by ear alone, or has no
usable video, add a value rather than stretching these two. Note that the
enforcing test keys on `'rhythm'`, so a new value needs its own rule.

### `PadGroove` — `Piece` plus provenance

`Piece & { at: VideoRef; bpm: number; reading: Reading }`. The three additions
are what any video-sourced piece needs, so this generalises under a name like
`VideoPiece`; `PadGroove` would then be this clip's alias for it.

### `PART` — the one thing not to copy

```ts
const PART: Record<Hand, StickPart> = { L: 'butt', R: 'shoulder' }
```

This looks like a convention and is actually an **observation about one
player**: he holds the inverted stick in his left hand for the whole clip and
never swaps, visible in every frame showing both hands. That is what lets
`voiced` derive the stick part from the hand instead of every transcription
repeating it.

Another clip could flip a stick mid-phrase, and this would then be wrong on
every stroke after the flip — silently, since nothing about the shape of a
`Stroke` objects. **Verify the invariant against the new footage before reusing
`voiced`, or write the part out per stroke.** The mechanism generalises; the
mapping does not.

### `voice` and `groove` — the builders

`groove(meter, duration, snare, bass)` builds a two-line phrase with the right
hand's snare voice above and the left's bass below, one duration across the
whole phrase, both lines stamped by `voiced`. Fine for another two-voice pad
piece; a clip needing three voices, or different note values within a line,
wants its own builder rather than a widened signature.

The two lines are about **voicing, not independence** — a pad cannot sound two
strokes at once. Rests are modelled rather than left as gaps, because two
voices on a stave align by tick position.

## Before a second clip lands

`src/index.ts` re-exports this module wholesale, so a second clip would collide
on `PAD_GROOVES`, and `VideoRef`, `Reading` and `PadGroove` are declared here
rather than beside the clips that share them. Lift the three types to
`src/videoRef.ts` and give each clip's collection its own name first — cheap
now, a rename across the catalogue and its tests later.
