# @paddrummer/stick-control

459 exercises read off photographs of George Lawrence Stone's *Stick Control*,
the photographs themselves, and the script that crops one line out of a page.

The governing rule, and the reason this is trustworthy at all: **nothing is
inferred from a rule that was not first verified against the page.**

## Layout

```
my.show-source.py       crops one exercise's staff line out of its photograph
src/
  index.ts              BOOK_PAGES, BOOK_PAGES_BY_NUMBER, bookExerciseCount
  book.ts               SourceRef / BookExercise / BookPage, and page geometry
  sticking.ts           the tail generators, shared meters, mirrorSticking
  cells.ts              the cell shape pages 24–26, 32 and 33 have in common
  pages/                one file per section of the book
  stickControl.test.ts  whole-corpus invariants, plus per-page spot checks
sources/
  stick-control-for-the-snare-drummer/
    README.md
    page-<n>.HEIC       committed, ~36MB
```

`pages/` follows the book's own sectioning, not the page numbers' arithmetic:

| File | Pages |
|---|---|
| `triplets-9-13.ts` | 9–13 |
| `short-rolls-and-triplets-14-15.ts` | 14–15 |
| `flam-beats-16-19.ts` | 16–19 |
| `six-eight-24-26.ts` | 24–26 |
| `combinations-30-33.ts` | 30–33 |
| `dotted-notes-34-35.ts` | 34–35 |
| `progressions-42.ts` | 42 |

The gaps are pages that were never photographed, so three sections stop
mid-run.

## Adding a page

1. Photograph it into `sources/`, named `page-<n>.HEIC`.
2. Read its **structure** first — blocks, columns, where the numbering starts
   and whether it restarts. Sections run across pages (32 opens at 49) but some
   pages restart at 1 (15 does).
3. Look for the generator before transcribing 24 lines. Most sections are
   mechanical, and finding that out is both faster and *more* accurate than
   reading each line, because a rule can be checked against every line at once.
   Predict the next page from it and check the prediction.
4. Write the tail from the rule; write the exception out literally.
5. Add the page to the right `pages/` file, and to `BOOK_PAGES` in `index.ts`.
6. Add a spot check for any line where a rule could plausibly have been guessed
   wrong — the mirrored one, the one with a rest, the one that breaks the set.
7. Crop the page's first and last line with `my.show-source.py` and look at what
   comes out. If those land, the whole page's references land.

## Why the tests carry the weight

The two halves of a transcription fail differently, and that decides what is
worth testing:

- **How long** comes from the notation — beams, brackets, dots. It fails
  **loudly**: a wrong duration template cannot fill a whole number of bars. The
  arithmetic proves it with no help.
- **Which hand** comes from the printed letters. It fails **silently**:
  `RLRLRL` and `LRLRLR` look identical at a glance and give an exercise that is
  wrong on every stroke, with nothing to notice it.

So the suite is whole-corpus invariants — every exercise fills its metre, no two
claim the same staff line, nothing sits on a blank slot, and between them they
account for every line slot down each page — plus hand-written spot checks
exactly where a rule could have been misread. The invariants are cross-cutting
by nature, which is why they stay in one file rather than moving beside the
pages.

## `my.show-source.py` — reusable for another book, with a table to fill in

Takes the `page · column · line` triple the app prints under a selected
exercise and writes that strip of the photograph, so a transcription can be put
beside its source instead of taken on trust.

```bash
./my.show-source.py 12 right 1                 # page 12, right column, line 1
./my.show-source.py 9 left 5 --span 2 --single
```

The cropping is general, but four tables are specific to *these* photographs and
would have to be re-measured for another book: `LINES` (pages whose column holds
other than twelve slots), `EXTENT` (pages whose last staff sits higher because a
footnote follows), `COLUMN_X`, and the `TOP`/`BOTTOM` band. All were read off
the pages by eye — automatic staff detection from pixel darkness was tried and
does not work on curved, shadowed, hand-held photographs.

Deliberately generous bleed above and below each crop: a page with a rule across
it does not space its lines evenly enough for any even division to land on the
middle of one. Half a line out is normal, and half a line of bleed absorbs it.

## Two things the book asks of the notation layer

Pages 25–26 and 42 need note lengths notation has no glyph for — eight
sixteenths in the space of six, five eighths in the space of four. They stay
plain fractions here, where the arithmetic is exact, and `@paddrummer/notation`
turns them into a plain glyph plus a bracket. A test in that package asserts
VexFlow makes a bar of them exactly as long as this package says it is, because
the two do that arithmetic independently and can disagree in silence.

The pages also do not always agree with each other. What a rest at the end of a
bar does to the hand the next bar leads with is answered one way on page 24 and
the other on page 33 — so `restTakesAHand` is a property of a block, read off
the page, not a rule of the book.

See [`docs/transcribing-stick-control.md`](../../docs/transcribing-stick-control.md)
for how the reading was actually done and what each mistake cost.
