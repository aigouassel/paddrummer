import { type Duration } from '@paddrummer/core/duration'
import { phraseOfSticking } from '@paddrummer/core/phrase'
import { type BookExercise, type BookPage, grid, sourceFile } from '../book'
import { CUT, TWELVE, doublesAfter, doublesFrom, repeat, singlesAfter, singlesFrom } from '../sticking'

// ── page 9 — Triplets ───────────────────────────────────────────────

/** Four eighths, then two groups of eighth-note triplets. Four beats. */
const P9_SLOTS: Duration[] = [...repeat('8', 4), ...repeat('8t', 6)]

const P9_PATTERNS = [
  'R L R L', 'L R L R', 'R R L L', 'L L R R',
  'R L R R', 'R L L R', 'R R L R', 'R L L L', 'L R R R',
]

/**
 * Page 9 does not lay out as a grid. Numbers 5, 6 and 7 print a second staff
 * line beneath them leading with the other hand, so twelve lines carry nine
 * exercises. These are the first line of each, and how many it occupies.
 */
const P9_LINES: [row: number, rows: number][] = [
  [0, 1], [1, 1], [2, 1], [3, 1], [4, 2], [6, 2], [8, 2], [10, 1], [11, 1],
]

export const page9: BookPage = {
  page: 9,
  title: 'Triplets',
  shape: 'Four eighth notes, then two groups of triplets.',
  columns: 1,
  lines: 12,
  exercises: P9_PATTERNS.map((prefix, i) => ({
    n: i + 1,
    phrase: phraseOfSticking(`${prefix} ${singlesAfter(prefix, 6)}`, P9_SLOTS, CUT),
    at: { file: sourceFile(9), column: 0, row: P9_LINES[i]![0], rows: P9_LINES[i]![1] },
  })),
}

// ── page 10 — Short Roll Combinations (Single Beat Rolls) ───────────

const P10_FULL: Duration[] = [...repeat('8', 4), ...repeat('16', 8)]
const P10_REST: Duration[] = [...repeat('8', 4), ...repeat('16', 8)]

export const page10: BookPage = {
  page: 10,
  title: 'Short Roll Combinations — Single Beat Rolls',
  shape: 'Four eighth notes, then eight sixteenths in single strokes.',
  columns: 2,
  lines: 12,
  exercises: [
    ...TWELVE.map((prefix, i) => ({
      n: i + 1,
      phrase: phraseOfSticking(`${prefix} ${singlesAfter(prefix, 8)}`, P10_FULL, CUT),
      at: grid(10, 12)(i),
    })),
    ...TWELVE.map((prefix, i) => ({
      n: i + 13,
      phrase: phraseOfSticking(`${prefix} ${singlesAfter(prefix, 7)} -`, P10_REST, CUT),
      note: 'The bar ends on a rest.',
      at: grid(10, 12)(i + 12),
    })),
  ],
}

// ── page 11 — Short Roll Combinations (Double Beat Rolls) ───────────

export const page11: BookPage = {
  page: 11,
  title: 'Short Roll Combinations — Double Beat Rolls',
  shape: 'Four eighth notes, then eight sixteenths played as doubles.',
  columns: 2,
  lines: 12,
  exercises: [
    ...TWELVE.map((prefix, i) => ({
      n: i + 1,
      phrase: phraseOfSticking(`${prefix} ${doublesAfter(prefix, 8)}`, P10_FULL, CUT),
      note: i === 0 ? '9 stroke open roll.' : undefined,
      at: grid(11, 12)(i),
    })),
    ...TWELVE.map((prefix, i) => ({
      n: i + 13,
      phrase: phraseOfSticking(`${prefix} ${doublesAfter(prefix, 7)} -`, P10_REST, CUT),
      note: i === 0 ? '7 stroke open roll. The bar ends on a rest.' : undefined,
      at: grid(11, 12)(i + 12),
    })),
  ],
}

// ── page 12 — Short Roll Combinations (closed roll) ─────────────────

/** Four eighths, then a half note carrying the closed roll. */
const P12_SLOTS: Duration[] = [...repeat('8', 4), 'h']

/**
 * Both halves of the page are written identically — four eighths and a
 * tremolo half note — and differ only in a tie. The left column's roll is tied
 * over the bar line, which is what makes it nine strokes rather than seven.
 * Ties are not modelled here, so the two halves sound alike in the app; the
 * note on each says so rather than implying a difference that is not there.
 */
export const page12: BookPage = {
  page: 12,
  title: 'Short Roll Combinations — Closed Roll',
  shape: 'Four eighth notes, then a closed roll held for a half note.',
  columns: 2,
  lines: 12,
  exercises: [
    ...TWELVE.map((prefix, i) => ({
      n: i + 1,
      phrase: phraseOfSticking(`${prefix} ~${singlesAfter(prefix, 1)}`, P12_SLOTS, CUT),
      note: '9 stroke closed roll — tied over the bar line in the book. Ties are not modelled, so this sounds the same as the 7 stroke version opposite.',
      at: grid(12, 12)(i),
    })),
    ...TWELVE.map((prefix, i) => ({
      n: i + 13,
      phrase: phraseOfSticking(`${prefix} ~${singlesAfter(prefix, 1)}`, P12_SLOTS, CUT),
      note: '7 stroke closed roll — untied.',
      at: grid(12, 12)(i + 12),
    })),
  ],
}

// ── page 13 — Review of Short Roll Combinations ─────────────────────
//
// Four bars rather than one: three of the pattern, then a bar given over
// entirely to the roll figure. Written out bar by bar because the fourth bar
// is not a continuation of the first three.

const P13_PATTERN: Duration[] = [...repeat('8', 4), ...repeat('16', 8)]
const P13_PATTERN_REST: Duration[] = [...repeat('8', 4), ...repeat('16', 8)]
const P13_ROLL_BAR: Duration[] = [...repeat('8', 4), 'h']

/** Three bars of the pattern, then a fourth built from `finale`. */
function reviewExercise(
  n: number,
  prefix: string,
  tail: (from: string, count: number) => string,
  bars: Duration[],
  finaleSpec: string,
  finaleSlots: Duration[],
  note?: string,
): BookExercise {
  const one = `${prefix} ${tail(prefix, bars.length - 4)}`
  const spec = [one, one, one, finaleSpec].join(' ')
  const slots = [...bars, ...bars, ...bars, ...finaleSlots]
  return {
    n,
    phrase: phraseOfSticking(spec, slots, CUT),
    ...(note ? { note } : {}),
    // Page 13 is a single full-width column, one exercise per staff line.
    at: { file: sourceFile(13), column: 0, row: n - 1, rows: 1 },
  }
}


const restEvery8 = (body: string) => `${body} -`

export const page13: BookPage = {
  page: 13,
  title: 'Review of Short Roll Combinations',
  shape: 'Three bars of the pattern, then a bar of the roll figure alone.',
  columns: 1,
  lines: 12,
  exercises: [
    reviewExercise(1, 'R L R L', singlesAfter, P13_PATTERN, singlesFrom('R', 16), repeat('16', 16)),
    reviewExercise(2, 'L R L R', singlesAfter, P13_PATTERN, singlesFrom('L', 16), repeat('16', 16)),
    reviewExercise(
      3, 'R L R L',
      (from, count) => `${singlesAfter(from, count - 1)} -`,
      P13_PATTERN_REST,
      `${restEvery8(singlesFrom('R', 7))} ${restEvery8(singlesFrom('R', 7))}`,
      repeat('16', 16),
      'Each half-bar ends on a rest.',
    ),
    reviewExercise(
      4, 'L R L R',
      (from, count) => `${singlesAfter(from, count - 1)} -`,
      P13_PATTERN_REST,
      `${restEvery8(singlesFrom('L', 7))} ${restEvery8(singlesFrom('L', 7))}`,
      repeat('16', 16),
      'Each half-bar ends on a rest.',
    ),
    reviewExercise(5, 'R L R L', doublesAfter, P13_PATTERN, doublesFrom('R', 16), repeat('16', 16)),
    reviewExercise(6, 'L R L R', doublesAfter, P13_PATTERN, doublesFrom('L', 16), repeat('16', 16)),
    reviewExercise(
      7, 'R L R L',
      (from, count) => `${doublesAfter(from, count - 1)} -`,
      P13_PATTERN_REST,
      `${restEvery8(doublesFrom('R', 7))} ${restEvery8(doublesFrom('R', 7))}`,
      repeat('16', 16),
      'Each half-bar ends on a rest.',
    ),
    reviewExercise(
      8, 'L R L R',
      (from, count) => `${doublesAfter(from, count - 1)} -`,
      P13_PATTERN_REST,
      `${restEvery8(doublesFrom('L', 7))} ${restEvery8(doublesFrom('L', 7))}`,
      repeat('16', 16),
      'Each half-bar ends on a rest.',
    ),
    ...([9, 10, 11, 12] as const).map((n) => {
      const lead = n % 2 === 1 ? 'R L R L' : 'L R L R'
      const rollHand = n % 2 === 1 ? 'R' : 'L'
      const one = `${lead} ~${rollHand}`
      return {
        n,
        phrase: phraseOfSticking(
          [one, one, one, `~${rollHand} ~${rollHand}`].join(' '),
          [...P13_ROLL_BAR, ...P13_ROLL_BAR, ...P13_ROLL_BAR, 'h', 'h'],
          CUT,
        ),
        note:
          n < 11
            ? 'Closed rolls, tied across the bar in the book. Ties are not modelled here, so it sounds as separate rolls.'
            : 'Closed rolls, written without ties.',
        at: { file: sourceFile(13), column: 0, row: n - 1, rows: 1 },
      }
    }),
  ],
}
