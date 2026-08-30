import { OCTUPLET_SIXTEENTH } from '@paddrummer/core/duration'
import { type Meter } from '@paddrummer/core/phrase'
import { type BookPage, type SourceRef, sourceFile } from '../book'
import { doublesAfter, singlesAfter } from '../sticking'
import { type Block, cellPage } from '../cells'

// ── pages 24 to 26 — Short Rolls in 6/8 ─────────────────────────────
//
// Six lines, a rule across the page, then six more, and each of the four
// blocks so made is one idea worked through six stickings. The cell is a whole
// bar: three eighth notes, then the figure filling the other dotted quarter.

const SIX_EIGHT: Meter = [6, 8]

/** Six lines down a column, six more below the rule, and the rule's own slot. */
const sixEightAt =
  (page: number) =>
  (index: number): SourceRef => ({
    file: sourceFile(page),
    column: Math.floor(index / 6) % 2,
    row: (index < 12 ? 0 : 7) + (index % 6),
    rows: 1,
  })

/**
 * The two sets of six the 6/8 pages draw on. Both work through the same four
 * shapes in the same order — `xyx`, `xxy`, `xyy`, `xxx` — and differ only in
 * which of them need printing on both hands, which the figure decides.
 */
const SIX_EIGHT_MIRRORING = ['R L R', 'R R L', 'L L R', 'R L L', 'L R R', 'R R R']
const SIX_EIGHT_REPEATING = ['R L R', 'L R L', 'R R L', 'R L L', 'R R R', 'L L L']

const sixEightPage = (
  page: number,
  shape: string,
  blocks: readonly Block[],
): BookPage =>
  cellPage({
    page,
    title: 'Short Rolls in 6/8',
    shape,
    meter: SIX_EIGHT,
    cells: 2,
    columns: 2,
    lines: 13,
    blankRows: [6],
    at: sixEightAt(page),
    blocks,
  })

export const page24 = sixEightPage(24, 'Three eighth notes, then six sixteenths.', [
  {
    patterns: SIX_EIGHT_MIRRORING,
    lead: '8',
    figure: { kind: 'run', slot: '16', strokes: 6, rest: false, tail: singlesAfter },
  },
  {
    patterns: SIX_EIGHT_REPEATING,
    lead: '8',
    figure: { kind: 'run', slot: '16', strokes: 5, rest: true, tail: singlesAfter },
    note: 'Each bar ends on a rest.',
  },
  {
    patterns: SIX_EIGHT_REPEATING,
    lead: '8',
    figure: { kind: 'run', slot: '16', strokes: 6, rest: false, tail: doublesAfter },
    note: '7 stroke open roll.',
  },
  {
    patterns: SIX_EIGHT_REPEATING,
    lead: '8',
    figure: { kind: 'run', slot: '16', strokes: 5, rest: true, tail: doublesAfter },
    note: '5 stroke open roll. Each bar ends on a rest.',
  },
])

export const page25 = sixEightPage(
  25,
  'Three eighth notes, then a closed roll held for a dotted quarter, or eight strokes in the space of six.',
  [
    {
      patterns: SIX_EIGHT_REPEATING,
      lead: '8',
      figure: { kind: 'roll', slot: 'q.', strokes: 3, tied: true },
      note: '7 stroke closed roll, tied into the next bar in the book. Ties are not modelled, so this sounds the same as the 5 stroke version opposite.',
    },
    {
      patterns: SIX_EIGHT_REPEATING,
      lead: '8',
      figure: { kind: 'roll', slot: 'q.', strokes: 3, tied: false },
      note: '5 stroke closed roll — untied.',
    },
    {
      patterns: SIX_EIGHT_MIRRORING,
      lead: '8',
      figure: {
        kind: 'run',
        slot: OCTUPLET_SIXTEENTH,
        strokes: 8,
        rest: false,
        tail: singlesAfter,
      },
      note: 'The page notes that the eight are written loosely and should be read as filling the dotted quarter exactly.',
    },
    {
      patterns: SIX_EIGHT_REPEATING,
      lead: '8',
      figure: {
        kind: 'run',
        slot: OCTUPLET_SIXTEENTH,
        strokes: 7,
        rest: true,
        tail: singlesAfter,
      },
      note: 'Each bar ends on a rest.',
    },
  ],
)

export const page26 = sixEightPage(
  26,
  'Three eighth notes, then eight strokes in the space of six, or a closed roll in their place.',
  [
    {
      patterns: SIX_EIGHT_MIRRORING,
      lead: '8',
      figure: {
        kind: 'run',
        slot: OCTUPLET_SIXTEENTH,
        strokes: 8,
        rest: false,
        tail: doublesAfter,
      },
      note: '9 stroke open roll.',
    },
    {
      patterns: SIX_EIGHT_MIRRORING,
      lead: '8',
      figure: {
        kind: 'run',
        slot: OCTUPLET_SIXTEENTH,
        strokes: 7,
        rest: true,
        tail: doublesAfter,
      },
      note: '7 stroke open roll. Each bar ends on a rest.',
    },
    {
      patterns: SIX_EIGHT_MIRRORING,
      lead: '8',
      figure: { kind: 'roll', slot: 'q.', strokes: 4, tied: true },
      note: '9 stroke closed roll, tied into the next bar in the book. Ties are not modelled, so this sounds the same as the 7 stroke version opposite.',
    },
    {
      patterns: SIX_EIGHT_MIRRORING,
      lead: '8',
      figure: { kind: 'roll', slot: 'q.', strokes: 4, tied: false },
      note: '7 stroke closed roll — untied.',
    },
  ],
)
