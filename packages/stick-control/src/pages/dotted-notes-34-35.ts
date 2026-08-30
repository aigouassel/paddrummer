import { type Duration } from '@paddrummer/core/duration'
import { type Phrase, phraseOfSticking } from '@paddrummer/core/phrase'
import { type BookPage, type SourceRef, sourceFile } from '../book'
import { TWO_FOUR, flamStroke, repeat } from '../sticking'

// ── pages 34 and 35 — Flam Triplets and Dotted Notes ────────────────
//
// Built like the Flam Beats section: page 34 prints twelve bars above a rule
// and then starts combining them, and from no. 13 every exercise is one of the
// eight right-led bars, played twice, answered by a later one played twice.
// Page 35 carries that run on to no. 30, where the photographs stop.
//
// Three rhythms share the section, and the sticking alone cannot tell them
// apart, so each bar carries its own. Page 34's footnote is emphatic that the
// dotted eighth and sixteenth are to be given their exact value and not turned
// into the triplet they can so easily become — which is why the two are filed
// as different bars here rather than as one written two ways.

/** A bar of one of these pages: its letters, and the rhythm they are set to. */
type DottedBar = { spec: string; slots: Duration[] }

const TRIPLET_BAR: Duration[] = repeat('8t', 6)
const DOTTED_BAR: Duration[] = ['8.', '16', '8.', '16']
const EVEN_BAR: Duration[] = repeat('8', 4)

/** The twelve bars page 34 prints above its rule, in order. */
const DOTTED_BARS: readonly DottedBar[] = [
  { spec: 'F L R f R L', slots: TRIPLET_BAR },
  { spec: 'F R L F R L', slots: TRIPLET_BAR },
  { spec: 'F L L F L L', slots: TRIPLET_BAR },
  { spec: 'f L R f L R', slots: TRIPLET_BAR },
  { spec: 'f R R f R R', slots: TRIPLET_BAR },
  { spec: 'F R R f L L', slots: TRIPLET_BAR },
  { spec: 'F R f L', slots: DOTTED_BAR },
  { spec: 'F L F L', slots: DOTTED_BAR },
  { spec: 'f R f R', slots: DOTTED_BAR },
  { spec: 'F R f L', slots: EVEN_BAR },
  { spec: 'F L F L', slots: EVEN_BAR },
  { spec: 'f R f R', slots: EVEN_BAR },
]

/** The eight that lead with the right hand, which are the ones combined. */
const DOTTED_RIGHT_LINES = [1, 2, 3, 6, 7, 8, 10, 11]

const dottedLine = (bars: readonly DottedBar[]): Phrase =>
  phraseOfSticking(
    bars.flatMap((bar) => bar.spec.split(/\s+/)).map(flamStroke).join(' '),
    bars.flatMap((bar) => bar.slots),
    TWO_FOUR,
  )

type DottedExercise = { phrase: Phrase; note?: string }

/**
 * The section as the two photographed pages have it: the twelve bars, each
 * played twice, then the combinations as far as no. 30. The run is cut where
 * page 35 cuts it — the book carries on.
 */
const DOTTED_SECTION: readonly DottedExercise[] = (() => {
  const singles = DOTTED_BARS.map((bar) => ({ phrase: dottedLine([bar, bar]) }))
  const pairs: DottedExercise[] = []
  for (let i = 0; i < DOTTED_RIGHT_LINES.length; i += 1) {
    for (let j = i + 1; j < DOTTED_RIGHT_LINES.length; j += 1) {
      const a = DOTTED_BARS[DOTTED_RIGHT_LINES[i]! - 1]!
      const b = DOTTED_BARS[DOTTED_RIGHT_LINES[j]! - 1]!
      pairs.push({
        phrase: dottedLine([a, a, b, b]),
        note: `No. ${DOTTED_RIGHT_LINES[i]}'s bar answered by no. ${DOTTED_RIGHT_LINES[j]}'s.`,
      })
    }
  }
  return [...singles, ...pairs.slice(0, 18)]
})()

/**
 * Page 34 puts its twelve bars in two columns of six, rules a line under them,
 * and then gives the six combinations the full width of the page, because each
 * is four bars long.
 */
const dottedAt34 = (index: number): SourceRef =>
  index < 12
    ? { file: sourceFile(34), column: Math.floor(index / 6), row: index % 6, rows: 1 }
    : { file: sourceFile(34), column: 0, row: index - 5, rows: 1, columns: 2 }

const DOTTED_SHAPE =
  'Two bars of 2/4, or four when the line combines two of them. A bar is two flam triplets, or a dotted eighth and a sixteenth twice over, or four plain eighths.'

export const page34: BookPage = {
  page: 34,
  title: 'Flam Triplets and Dotted Notes',
  shape: DOTTED_SHAPE,
  columns: 2,
  lines: 13,
  blankRows: [6],
  exercises: DOTTED_SECTION.slice(0, 18).map((line, i) => ({
    n: i + 1,
    phrase: line.phrase,
    ...(line.note ? { note: line.note } : {}),
    at: dottedAt34(i),
  })),
}

export const page35: BookPage = {
  page: 35,
  title: 'Flam Triplets and Dotted Notes, continued',
  shape: DOTTED_SHAPE,
  columns: 1,
  lines: 12,
  exercises: DOTTED_SECTION.slice(18).map((line, i) => ({
    n: i + 19,
    phrase: line.phrase,
    ...(line.note ? { note: line.note } : {}),
    at: { file: sourceFile(35), column: 0, row: i, rows: 1 },
  })),
}
