# Transcribing a drum video

Notes from turning a 35-second practice-pad video into notation, written down
while the job is still half done — the rhythm is settled, the sticking is not.
The point of writing it now is that the *method* is what took the time, and it
generalises to the next clip.

Source: a YouTube short, "How to play drum grooves on a practice pad" by
Grahame O'Shea, 720×1280 at 30 fps. It lives in `assets/videos/`, which is
gitignored for the same reason the book photographs are: someone else's work,
kept locally as a transcription source.

---

## 1. The job splits the same way the book did

A stroke has two facts: *when* it falls, and *which hand* played it. They want
completely different tools.

- **When** comes from the audio, and a machine reads it better than an ear can.
- **Which hand** comes from the pictures, and nothing automatic managed it.

That asymmetry decides where the effort goes, exactly as the letters-versus-
beams split did for *Stick Control*. It also decides what fails loudly: a wrong
duration will not fill a bar, whereas a wrong hand is silent and total.

## 2. Onset detection does not tell you how many notes there are

The obvious first move — detect onsets, read the gaps — does not survive a real
recording. Onset strength is a continuum, so the note count is whatever the
threshold says:

```
 threshold  onsets
    0.10      211
    0.25      102
    0.50       26
```

No plateau. There is no correct threshold to find, because ghost notes and roll
strokes shade continuously into the noise floor. `my.video-grid.py --sweep`
prints this curve first, so the absence of an answer is visible rather than
quietly assumed by whatever default was in the example code.

## 3. Fit a grid instead, and ask about slots

The prior worth using is that the player is on a click. That turns a badly
posed question ("is there a stroke at this instant?") into a well posed one
("is this sixteenth struck?").

Fit one period and phase by least squares over the steadiest passage, then read
each slot's onset energy. Slots the player leaves empty come out at zero, and
the result prints as bars you can compare with what you hear:

```
  bar   time   | 1 e + a 2 e + a 3 e + a 4 e + a
    3   3.861  | O . . . # . . . o . . . # . . .
    6   8.642  | # . # . # . o . O . O . # . O .
   12  18.288  | O o O # o . O o O o O O O O O O
```

Two things to know about the fit:

- **The window matters, and drift is real.** Fitting 8.3–15.0 s gave 149.28 bpm
  and left the opening bars visibly off their beats; fitting 8.3–22.0 s gave
  150.12 bpm and lined the whole take up. A human on a click still drifts, so a
  single global grid is an approximation — check the map at both ends, not just
  where you fitted it.
- **A high residual is a warning, not a result.** If the rms climbs, the window
  probably straddles something that is not on the grid at all, such as a roll.

## 4. The pictures: extract once, index by number

Seek-per-frame (`ffmpeg -ss`) lands on the wrong side of a keyframe often
enough to matter when three frames make a sixteenth. Extract every frame once,
then frame *n* is time *n*/fps with no ambiguity. `my.video-frames.py` caches
them beside the video and labels every cell with its number and time, so a
reading can be traced back to the frame it came from — the same reason each
Stick Control exercise carries a page and a staff line.

**Check the audio and video actually correspond before trusting either.** Find
a stroke whose contact is unmistakable and see whether an onset sits within a
frame of it. Here, a butt-down strike at 6.23–6.30 s against an onset at 6.259
settled it. I nearly convicted this clip of being dubbed on the strength of a
zoom crop that had cut off the region where the sticks actually were — the pad
looked clean through a beat that the audio said was the loudest in the bar. The
crop was wrong, not the video.

## 5. Four automated approaches, and why each failed

Worth recording so the next clip does not pay for them again.

| Approach | Why it failed |
|---|---|
| Onset threshold | no plateau; the count is the threshold (§2) |
| Pad occlusion — count non-red pixels inside the pad ellipse | blind to strikes on the far rim, and it scores a *resting* stick as a stroke. The bass stick sits on the pad for eight frames at a time |
| Timbre clustering — spectral centroid per attack | separates in the right direction (butt 698 Hz vs shoulder 998 Hz median) but the distributions overlap far too much to label one note |
| Skin-blob hand tracking | a beige wall and a red bedspread both pass a skin-colour test, so the signal pins to static background |

This is the same failure the Stick Control notes record about finding staff
lines from pixel darkness, and I walked into it again. **Colour heuristics on
real domestic photographs keep failing because the thing you want is not the
only thing that colour.** What worked both times was using a cheap reliable
signal to decide *where to look*, and then looking. The grid says a stroke
falls at 18.27 s; that is three frames to read, not 35 seconds to scrub.

## 6. Slowing the clip down

Slowing playback helps a person a great deal and helps a reader-of-frames not
at all — frame by frame already *is* maximum slow motion. So:

- **For the ear**, `atempo` at 0.5 and 0.25 with pitch preserved. Pitch matters
  here: the timbre difference between butt and shoulder is the cue, and
  pitch-shifting destroys it.
- **For the eye**, `setpts` repeats frames, which is safe.
- **Never interpolate.** `minterpolate` or any AI in-betweener invents frames,
  and an invented frame can show a stick touching the pad at a moment that
  never existed. That is fabricated evidence for the exact question at issue.

Check the available formats before assuming the frame rate is a limit worth
working around — but here every format YouTube offers is 30 fps, so 30 is the
ceiling and no download choice improves it.

## 7. What this clip turned out to be

Captions on the video name its sections, which is the same gift a book's
section headings are: they supply the *generator* rather than making you infer
it. The technique they describe:

- **butt of the stick, held vertical, into the pad's centre** = bass drum
- **shoulder of the stick, laid flat across the pad** = snare

and, read off the frames, the butt is his left hand and the shoulder his right.

| Bars | Section | Caption |
|---|---|---|
| 1–5 | quarter-note bass/snare groove | "Butt of stick for bass" / "shoulder for snare" |
| 6–9 | gaps filled with 8ths | "fill in gaps with 8ths" |
| 10–14 | gaps filled with 16ths | "or…." / "16ths" |
| 15–17 | triple stroke roll | "triple stroke roll" |
| 18–21 | the same, led by the other hand | "switch hands" |

150.12 bpm, 4/4, sixteenth = 99.92 ms.

## 8. What a stroke needs that the model did not have

Every stroke here carries a second fact the `Phrase` model had no room for:
which part of the stick sounded it. A hand is the whole story for a rudiment or
a Stick Control page, and it is not the whole story here — in the fills both
hands play the snare voice, so hand and voice come apart.

`Stroke` now takes an optional part:

```ts
export type StickPart = 'shoulder' | 'butt'
```

Absent means **the piece does not distinguish**, not "shoulder". The difference
matters: a default of `'shoulder'` would silently assert that all ~460 existing
Stick Control strokes are shoulder strokes, when on a snare they are tip
strokes. An optional field's default is a claim about every record that omits
it, and "unspecified" stays true whatever else is in the table. A piece that
does distinguish sets the field on *every* stroke, not only the exceptional
ones, and a test enforces both halves of that: no stroke in this groove may
omit it, and no rudiment, study or book exercise may carry it.

## 9. What was transcribed, and how much of it was seen

All five sections, end to end, in `packages/videos/src/padGrooves.ts`. They tile the
clip without gaps: 1.9–8.3s, 8.3–14.7, 14.7–24.2, 24.2–27.4, 27.4–33.8.

| Piece | Figure | Reading |
|---|---|---|
| quarters | the groove | `frames` |
| filled with 8ths | every remaining eighth struck | `rhythm` |
| filled with 16ths | sixteenths, silent after the backbeat | `rhythm` |
| triple stroke roll | sextuplets, three a hand | `rhythm` |
| 16ths, hands switched | the same, mirrored | `rhythm` |

`Reading` is a field on the piece, not a footnote, because the two halves of a
transcription were not established the same way and a reader deserves to know
which is which:

- **`frames`** — every stroke read off a named frame. Only the opening groove.
  Each of its five strokes was seen twice, eight beats apart.
- **`rhythm`** — the rhythm, the voicing and the section are read; which hand
  plays each stroke inside a fill is a conventional sticking. A test refuses to
  let a piece marked this way ship without saying so in its own note.

What made the fills transcribable at all was not the video. Three things
outside it converged:

1. **The captions specify the figure.** "fill in gaps with 8ths", "16ths",
   "triple stroke roll" is the author stating what he is playing. That is the
   same gift a book's section heading is — the generator, handed over.
2. **Onset spacing measures the subdivision.** 1.92 onsets a beat and 21 of 22
   gaps an eighth long; 3.09 a beat fitting sixteenths; and for the roll, a
   sixteenth-note triplet fitting better than any other division, which is what
   three strokes a hand at one triple per eighth produces. Only about half the
   roll's strokes register at all — the second and third of each triple are
   bounces, so that is the roll behaving as a roll.
3. **The grid map repeats.** Every bar of the sixteenth section leaves the two
   sixteenths after the beat-3 backbeat silent. A figure that holds across six
   bars is the music; a detector artefact would not be so tidy.

**One observation carried more weight than any of that.** He holds the inverted
stick in his left hand for the whole clip and never swaps it, which is visible
in every frame showing both hands. So hand determines stick part throughout —
left is the bass voice, right the snare — and `voiced` derives the part rather
than making each transcription assert it. That is a fact about this player, not
a rule of the notation: another clip could flip a stick mid-phrase.

### What the footage still will not give up

Which hand plays each stroke inside the fills. A sixteenth is 100ms, three
frames; the strokes are small; and the left hand keeps the butt stick planted
at the pad between bass notes, so there is nothing to see travelling. Frames
476–490 show exactly that — the butt stick resting, the right hand working,
and no way to count either.

The alternation itself is not a guess: one hand cannot play sixteenths at
150bpm for five bars, so the hands must alternate. Which hand starts, and what
happens across the ring-out rest, is the part that is convention.

What would settle it is a steeper camera angle or 60 fps, where the stick does
not foreshorten into the stub that means butt-down when the groove is slow.
Every format YouTube offers for this clip is 30.
