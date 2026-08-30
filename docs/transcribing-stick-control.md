# Transcribing Stick Control

Notes from reading fourteen photographed pages of George Lawrence Stone's *Stick
Control* into `src/domain/stickControl.ts`, written down because the next
fourteen will hit the same things.

The section is now 459 exercises over 21 pages. The photographs stop where they
stop, so three sections are cut mid-run: Flam Beats ends at no. 96 partway
through its mirrored pairs, and pages 34–35 at no. 30.

---

## 1. The letters are the transcription; the notes are the rhythm

Stone prints the sticking as `R` and `L` under every note. That is the fact
worth reading, and it reads almost as reliably as text — far more reliably than
counting beams.

So the work splits in two, and the halves have very different error profiles:

- **Which hand** comes from the letters. Low risk, but the failure mode is
  nasty: `RLRLRL` and `LRLRLR` look identical at a glance and produce an
  exercise that is wrong on every stroke.
- **How long** comes from the notation — beams, brackets, dots. Higher risk,
  but it fails loudly, because a wrong duration template cannot fill a whole
  number of bars.

That asymmetry decides what the tests are for. The bars adding up proves the
rhythm and needs no help; only a spot check can prove the hands, so that is
where hand-written assertions earn their place.

A third signal costs nothing and catches a lot: **the letter count**. Page 16's
beats hold either three letters (an eighth and two sixteenths) or four (four
sixteenths) and never anything else, so the count *is* the rhythm and
`flamBeatSlots` derives it rather than guessing.

## 2. Reading the images

The photographs are HEIC, which the Read tool will not open. macOS ships `sips`:

```bash
sips -s format png assets/.../page-14.HEIC --out /tmp/page-14.png
```

They are hand-held landscape, so rotate 90° clockwise (`Image.rotate(-90,
expand=True)` after `ImageOps.exif_transpose`). At the native 4032×3024, one
column cropped to a band of four staff lines is unambiguous. A whole page
downscaled to 1500px is enough to read structure — how many blocks, where the
numbering restarts — but *not* enough to trust individual letters. Twice I read
a line off a full-page view, then found it different when I zoomed.

Practical loop that worked:

1. Full page, downscaled — layout, block structure, exercise numbering.
2. Column bands, three or four lines each, full resolution — the actual reading.
3. Single lines, zoomed, wherever two readings disagreed or a rule broke.

## 3. Look for the generator before transcribing 24 lines

Twice, a whole section turned out to be mechanical, and finding that out early
saved most of the work — and was *more* accurate than reading each line, because
a rule can be checked against every line at once.

**Flam Beats (pages 16–19).** Page 16 prints eighteen bars. From no. 19 the rest
of the section is nothing but every ordered pair `(i, j), i < j` of the fourteen
right-hand-led bars, in lexicographic order — and then, from no. 74, the same
run again with every bar mirrored. Eighteen bars become 96 exercises.

**Flam Triplets and Dotted Notes (pages 34–35).** The same shape over eight
bars: twelve printed bars, then all pairs, cut at no. 30 where page 35 ends.

The method that found them: read one page fully, guess the rule, then *predict
the next page and check the prediction*. Page 18 matched all 24 predicted lines.
Page 19 matched line 73 and then broke — which is exactly where the mirrored run
starts. **A rule that fails in a structured way is usually a rule with a second
clause, not a wrong rule.** The break is the discovery.

## 4. The rule that holds four pages together, and where it doesn't

Pages 24–26, 32 and 33 all have one shape: a **cell** — an opening pattern plus
one figure (a run of strokes, or a closed roll held out) — repeated, where each
repeat leads with the hand that follows the previous cell's last stroke. So the
repeat is the same sticking when the cell holds an even number of strokes and
its mirror when the count is odd.

That rule also explains something that looked arbitrary: why a block's six lines
are not the same six patterns on every page. Where a cell mirrors itself, one
line already covers both hands, and the page spends the spare line on another
shape. The set follows from the figure.

**And then it doesn't.** What a trailing rest does to that count, the pages
answer differently:

| | Page 24 no. 7 | Page 33 no. 10 |
|---|---|---|
| Cell | `R L R` + 5 singles + rest | `R L` + 3 singles + rest |
| Next cell leads | same hand | same hand |
| Consistent with | the rest taking no hand | the rest taking a hand |

Neither convention explains both. I spent a while trying to find the rule that
did, re-read both pages at full zoom to be sure I had not misread, and then
stopped: there isn't one. `restTakesAHand` is a property of the block, read off
the page.

**The lesson is about when to stop looking.** A rule that explains six pages and
fails on the seventh is not a rule with a bug in it; it is a rule with a scope.
The cost of getting this wrong is silent — the exercise would just be wrong on
every second bar, and nothing would fail.

## 5. Traceability is the design, not the documentation

Every exercise carries a `SourceRef`, and `my.show-source.py` turns it back into
a crop of the photograph. That is what makes a disagreement resolvable: you put
the app beside the page and see which is wrong, instead of arguing from memory.

Making it work on the new pages needed three things that had been assumed:

- **A page is not always twelve staff lines.** Some rule a line across the
  middle, which occupies a line's worth of space without holding a staff. Model
  it (`blankRows`) rather than shifting the row numbers, or the crop lands
  between staves.
- **A page is not always two columns.** Page 34 gives its four-bar lines the
  full page width (`SourceRef.columns`), and a half-width crop shows half an
  exercise.
- **A footnote shortens the sheet.** Pages that print a legend or a note under
  the last staff leave less of the page to the exercises, so an even division
  from top to bottom puts the lower lines below where they are. Page 25's staves
  stop at 0.84 of the page, not 0.98.

Even with all three, a page with a rule does not space its lines evenly enough
for *any* even division to sit on the middle of one — half a line out is normal.
Half a line of bleed each way absorbs it. The script's own comment had said this
all along: "the point is to land the right line on screen, not to crop it to the
pixel."

I lost a stretch of time trying to detect staff positions automatically from
pixel darkness. It does not work: the photographs are curved and shadowed, so a
staff line is not a flat row of dark pixels, and page shadows read darker than
the music. Six numbers measured by eye and checked with six crops beat it
comfortably.

## 6. What the book asks of the notation layer

Two groups have no note value, because their length is not a length notation can
spell:

- **Eight in the space of six sixteenths** (pages 25–26, in 6/8) — `3/16` of a
  beat.
- **Five in the space of four eighths** (page 42) — `2/5` of a beat.

Both stay plain `Fraction`s in the domain, where the arithmetic is exact, and
`vexDuration.ts` recognises them by length and returns a glyph plus a bracket
ratio. This is why `tupletOf: number` — which could only ever mean "n in the
space of two" — had to become a ratio.

The risk this creates is worth naming, because it is invisible: **the domain and
VexFlow do the same arithmetic independently, and nothing downstream reads
VexFlow's answer back.** A wrong ratio leaves the voice believing the bar is a
different length than it is, which shows up only as two voices drifting apart,
on a page nobody has opened yet. Hence the test that builds a line the way
`score.ts` does and asks VexFlow how long it came out.

One thing does not round-trip: six in the space of four is an eighth-note
triplet twice over, so page 42's single `6` bracket is drawn as two `3`s. Same
rhythm, same placement. Recorded in the exercise notes rather than papered over
— the whole point of the reference under each exercise is that what is drawn can
be put beside what is printed.

## 7. If you are picking up the next pages

- Read the page's *structure* first: blocks, columns, where the numbering starts
  and whether it restarts. Sections run across pages (page 32 opens at 49) but
  some pages restart at 1 (page 15 does).
- Then look for the generator. Predict the next page from it and check.
- Write the tail from the rule; write the exception literally.
- Add a spot check for any line where a rule could plausibly have been guessed
  wrong — the mirrored one, the one with the rest, the one that breaks the set.
- Crop the first and last line of the page with `my.show-source.py` and look at
  what comes out. If it lands, the whole page's references land.
