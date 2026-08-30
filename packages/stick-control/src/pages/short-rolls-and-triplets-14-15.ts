import { type Duration } from '@paddrummer/core/duration'
import { phraseOfSticking } from '@paddrummer/core/phrase'
import { type BookExercise, type BookPage, grid } from '../book'
import { CUT, doublesAfter, repeat, singlesAfter } from '../sticking'

// ── pages 14 and 15 — Short Rolls and Triplets ──────────────────────
//
// Page 10's bar of sixteenths answered by page 9's bar of triplets. Both pages
// are built the same way: each column takes one four-stroke pattern and plays
// it six ways — a singles tail, a doubles tail, then a closed roll, each of
// those twice over, right lead then left — which is what fills twelve lines.
//
// The answering bar is written out rather than generated. It opens with the
// pattern restarted on the hand that follows it round, but its two triplets
// are only what the page prints: plain alternation in some columns, and a
// double restarted inside each triplet in others, which is not what carrying
// the tail across the bar line would give.

const TRIPLET_SIXTEENTHS: Duration[] = [...repeat('8', 4), ...repeat('16', 8)]
const TRIPLET_ANSWER: Duration[] = [...repeat('8', 4), ...repeat('8t', 6)]
const TRIPLET_ROLL: Duration[] = [...repeat('8', 4), 'h']

/** One column of such a page: its pattern, and the bar it always answers with. */
type TripletHalf = {
  /** The four eighth notes that open the first bar, right lead then left. */
  leads: readonly [string, string]
  /** The whole answering bar, right lead then left. */
  answers: readonly [string, string]
}

/**
 * The six shapes the first bar takes, in the order every column prints them.
 * Each is played twice, right lead then left.
 */
type TripletRow =
  | { kind: 'run'; tail: (from: string, count: number) => string; rest: boolean }
  | { kind: 'roll'; tied: boolean }

const TRIPLET_ROWS: readonly TripletRow[] = [
  { kind: 'run', tail: singlesAfter, rest: false },
  { kind: 'run', tail: singlesAfter, rest: true },
  { kind: 'run', tail: doublesAfter, rest: false },
  { kind: 'run', tail: doublesAfter, rest: true },
  { kind: 'roll', tied: true },
  { kind: 'roll', tied: false },
]

function tripletsPage(
  page: number,
  title: string,
  halves: readonly [TripletHalf, TripletHalf],
): BookPage {
  const at = grid(page, 12)
  return {
    page,
    title,
    shape: 'A bar of eighths and sixteenths, then a bar of eighths and triplets.',
    columns: 2,
    lines: 12,
    exercises: halves.flatMap((half, column) =>
      TRIPLET_ROWS.flatMap((row, r) =>
        ([0, 1] as const).map((hand): BookExercise => {
          const lead = half.leads[hand]
          const index = column * 12 + r * 2 + hand
          const [firstBar, slots, note] =
            row.kind === 'run'
              ? ([
                  row.rest ? `${lead} ${row.tail(lead, 7)} -` : `${lead} ${row.tail(lead, 8)}`,
                  TRIPLET_SIXTEENTHS,
                  row.rest ? 'The first bar ends on a rest.' : undefined,
                ] as const)
              : ([
                  `${lead} ~${singlesAfter(lead, 1)}`,
                  TRIPLET_ROLL,
                  row.tied
                    ? '9 stroke closed roll, tied into the next bar in the book. Ties are not modelled, so this sounds the same as the untied pair below.'
                    : '7 stroke closed roll — untied.',
                ] as const)
          return {
            n: index + 1,
            phrase: phraseOfSticking(
              `${firstBar} ${half.answers[hand]}`,
              [...slots, ...TRIPLET_ANSWER],
              CUT,
            ),
            ...(note ? { note } : {}),
            at: at(index),
          }
        }),
      ),
    ),
  }
}

export const page14 = tripletsPage(14, 'Short Rolls and Triplets', [
  {
    leads: ['R L R L', 'L R L R'],
    answers: ['R L R L R L R L R L', 'L R L R L R L R L R'],
  },
  {
    leads: ['R R L L', 'L L R R'],
    answers: ['R R L L R R L R R L', 'L L R R L L R L L R'],
  },
])

export const page15 = tripletsPage(15, 'Short Rolls and Triplets, continued', [
  {
    leads: ['R L R R', 'L R L L'],
    answers: ['L R L L R L R L R L', 'R L R R L R L R L R'],
  },
  {
    leads: ['R L L R', 'L R R L'],
    answers: ['L R R L R R L R R L', 'R L L R L L R L L R'],
  },
])
