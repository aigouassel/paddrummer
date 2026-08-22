import type { Duration } from './duration'
import type { Hand } from './pattern'
import { type Meter, type Phrase, phraseOfSticking } from './phrase'

/**
 * Exercises transcribed from a practice book, kept page by page.
 *
 * This is transcription, not authorship: the patterns are Stone's, read off
 * photographs of the printed pages, and the page and exercise numbers are
 * carried through so any one of them can be checked against the book it came
 * from. Nothing here is inferred from a rule that was not first verified
 * against the page.
 */

export type BookExercise = {
  /** The number printed beside it on the page. */
  n: number
  phrase: Phrase
  /** Anything printed under the exercise, such as a roll's name. */
  note?: string
}

export type BookPage = {
  page: number
  title: string
  /** How one bar is built, in words, since the notation alone can be terse. */
  shape: string
  exercises: readonly BookExercise[]
}

// ── Sticking helpers ────────────────────────────────────────────────
//
// Most of these exercises are a short pattern followed by a tail that simply
// carries on alternating. Writing the tail out by hand would be 5,000 letters
// of copy typing with no way to check it; generating it from the rule that the
// page actually follows is both shorter and verifiable. The rule was checked
// against the printed page for every exercise, and where a page breaks it —
// page 30's second half — the tail is written out literally instead.

const lastHand = (spec: string): Hand => {
  const letters = spec.trim().split(/\s+/).filter((t) => t !== '|')
  const last = letters[letters.length - 1]
  return last?.endsWith('L') ? 'L' : 'R'
}

const other = (hand: Hand): Hand => (hand === 'R' ? 'L' : 'R')

/** `n` alternating single strokes, continuing from where the prefix left off. */
function singlesAfter(prefix: string, n: number): string {
  let hand = other(lastHand(prefix))
  const out: string[] = []
  for (let i = 0; i < n; i += 1) {
    out.push(hand)
    hand = other(hand)
  }
  return out.join(' ')
}

/** `n` strokes in doubles (RRLL…), continuing from where the prefix left off. */
function doublesAfter(prefix: string, n: number): string {
  let hand = other(lastHand(prefix))
  const out: string[] = []
  for (let i = 0; i < n; i += 1) {
    out.push(hand)
    if (i % 2 === 1) hand = other(hand)
  }
  return out.join(' ')
}

const repeat = (value: Duration, n: number): Duration[] => Array.from({ length: n }, () => value)

/** Stone's twelve four-stroke patterns, in the order the book presents them. */
const TWELVE = [
  'R L R L', 'L R L R', 'R R L L', 'L L R R',
  'R L R R', 'R L L R', 'R R L R', 'R R R L',
  'L L L R', 'R L L L', 'L R R R', 'R R R R',
] as const

const CUT: Meter = [2, 2]
const THREE_EIGHT: Meter = [3, 8]

// ── page 9 — Triplets ───────────────────────────────────────────────

/** Four eighths, then two groups of eighth-note triplets. Four beats. */
const P9_SLOTS: Duration[] = [...repeat('8', 4), ...repeat('8t', 6)]

const P9_PATTERNS = [
  'R L R L', 'L R L R', 'R R L L', 'L L R R',
  'R L R R', 'R L L R', 'R R L R', 'R L L L', 'L R R R',
]

const page9: BookPage = {
  page: 9,
  title: 'Triplets',
  shape: 'Four eighth notes, then two groups of triplets.',
  exercises: P9_PATTERNS.map((prefix, i) => ({
    n: i + 1,
    phrase: phraseOfSticking(`${prefix} ${singlesAfter(prefix, 6)}`, P9_SLOTS, CUT),
  })),
}

// ── page 10 — Short Roll Combinations (Single Beat Rolls) ───────────

const P10_FULL: Duration[] = [...repeat('8', 4), ...repeat('16', 8)]
const P10_REST: Duration[] = [...repeat('8', 4), ...repeat('16', 8)]

const page10: BookPage = {
  page: 10,
  title: 'Short Roll Combinations — Single Beat Rolls',
  shape: 'Four eighth notes, then eight sixteenths in single strokes.',
  exercises: [
    ...TWELVE.map((prefix, i) => ({
      n: i + 1,
      phrase: phraseOfSticking(`${prefix} ${singlesAfter(prefix, 8)}`, P10_FULL, CUT),
    })),
    ...TWELVE.map((prefix, i) => ({
      n: i + 13,
      phrase: phraseOfSticking(`${prefix} ${singlesAfter(prefix, 7)} -`, P10_REST, CUT),
      note: 'The bar ends on a rest.',
    })),
  ],
}

// ── page 11 — Short Roll Combinations (Double Beat Rolls) ───────────

const page11: BookPage = {
  page: 11,
  title: 'Short Roll Combinations — Double Beat Rolls',
  shape: 'Four eighth notes, then eight sixteenths played as doubles.',
  exercises: [
    ...TWELVE.map((prefix, i) => ({
      n: i + 1,
      phrase: phraseOfSticking(`${prefix} ${doublesAfter(prefix, 8)}`, P10_FULL, CUT),
      note: i === 0 ? '9 stroke open roll.' : undefined,
    })),
    ...TWELVE.map((prefix, i) => ({
      n: i + 13,
      phrase: phraseOfSticking(`${prefix} ${doublesAfter(prefix, 7)} -`, P10_REST, CUT),
      note: i === 0 ? '7 stroke open roll. The bar ends on a rest.' : undefined,
    })),
  ],
}

// ── page 12 — Short Roll Combinations (closed roll) ─────────────────

/** Four eighths, then a half note carrying the closed roll. */
const P12_SLOTS: Duration[] = [...repeat('8', 4), 'h']

const page12: BookPage = {
  page: 12,
  title: 'Short Roll Combinations — Closed Roll',
  shape: 'Four eighth notes, then a closed roll held for a half note.',
  exercises: TWELVE.map((prefix, i) => ({
    n: i + 1,
    phrase: phraseOfSticking(`${prefix} ~${singlesAfter(prefix, 1)}`, P12_SLOTS, CUT),
    note: i === 0 ? '9 stroke closed roll.' : undefined,
  })),
}

// ── page 30 — Combinations in 3/8 ───────────────────────────────────

/** Four sixteenths, then a sixteenth-note triplet. One bar of 3/8. */
const P30_SLOTS: Duration[] = [...repeat('16', 4), ...repeat('16t', 3)]
/** The roll exercises replace the triplet with a sustained buzz. */
const P30_ROLL: Duration[] = [...repeat('16', 4), '8']

const P30_PLAIN = ['R L R L', 'R R L L', 'R L R R', 'L R L L', 'R L L R', 'L R R L', 'R L L L', 'R R R L']
const P30_LAST = ['R R R R', 'L L L L']
/** 13–17 carry a closed roll where the triplet would be. */
const P30_ROLLS = ['R L R R', 'L R L L', 'R L L R', 'L R R L', 'R L L L']
/** 18–24 keep the triplet but its sticking stops being plain alternation. */
const P30_TAILED: [string, string][] = [
  ['R L R L', 'R R L'], ['L R L R', 'L L R'], ['R R L L', 'R R L'], ['L L R R', 'L L R'],
  ['R L R R', 'L L R'], ['R L L R', 'L L R'], ['R R R R', 'L L R'],
]

const page30: BookPage = {
  page: 30,
  title: 'Combinations in 3/8',
  shape: 'Four sixteenths, then a sixteenth-note triplet.',
  exercises: [
    ...[...P30_PLAIN, ...P30_LAST].map((prefix, i) => ({
      n: i + 1,
      phrase: phraseOfSticking(`${prefix} ${singlesAfter(prefix, 3)}`, P30_SLOTS, THREE_EIGHT),
    })),
    ...[11, 12].map((n, i) => ({
      n,
      phrase: phraseOfSticking(
        `${['R L R L', 'R R L L'][i]} ~${singlesAfter(['R L R L', 'R R L L'][i]!, 1)}`,
        P30_ROLL,
        THREE_EIGHT,
      ),
      note: '7 stroke closed roll.',
    })),
    ...P30_ROLLS.map((prefix, i) => ({
      n: i + 13,
      phrase: phraseOfSticking(`${prefix} ~${singlesAfter(prefix, 1)}`, P30_ROLL, THREE_EIGHT),
      note: 'Closed roll.',
    })),
    ...P30_TAILED.map(([prefix, tail], i) => ({
      n: i + 18,
      phrase: phraseOfSticking(`${prefix} ${tail}`, P30_SLOTS, THREE_EIGHT),
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
  return { n, phrase: phraseOfSticking(spec, slots, CUT), ...(note ? { note } : {}) }
}

/** `n` strokes of the given tail shape, starting from `hand`. */
const runFrom = (hand: Hand, n: number, shape: (h: Hand, i: number) => Hand): string => {
  const out: string[] = []
  let current = hand
  for (let i = 0; i < n; i += 1) {
    out.push(current)
    current = shape(current, i)
  }
  return out.join(' ')
}

const singlesFrom = (hand: Hand, n: number) => runFrom(hand, n, (h) => other(h))
const doublesFrom = (hand: Hand, n: number) => runFrom(hand, n, (h, i) => (i % 2 === 1 ? other(h) : h))

const restEvery8 = (body: string) => `${body} -`

const page13: BookPage = {
  page: 13,
  title: 'Review of Short Roll Combinations',
  shape: 'Three bars of the pattern, then a bar of the roll figure alone.',
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
      }
    }),
  ],
}

// ── page 31 — Combinations in 3/8, continued ────────────────────────
//
// A finer subdivision than page 30: four sixteenths then four thirty-seconds,
// still one bar of 3/8.

const P31_SLOTS: Duration[] = [...repeat('16', 4), ...repeat('32', 4)]

const P31_PLAIN = [
  'R L R L', 'L R L R', 'R R L L', 'L L R R', 'R L R R', 'R L L R',
  'R L L L', 'L R R R', 'R R R L', 'L L L R', 'R R R R',
]
const P31_RESTED = [
  'R L R L', 'L R L R', 'R R L L', 'L L R R', 'R L R R',
  'R L L R', 'R L L L', 'L R R R', 'R R R L', 'L L L R',
]
const P31_ROLLED = ['R L R L', 'L R L R', 'R R L L']

const page31: BookPage = {
  page: 31,
  title: 'Combinations in 3/8, continued',
  shape: 'Four sixteenths, then four thirty-seconds.',
  exercises: [
    ...P31_PLAIN.map((prefix, i) => ({
      n: i + 25,
      phrase: phraseOfSticking(`${prefix} ${singlesAfter(prefix, 4)}`, P31_SLOTS, THREE_EIGHT),
    })),
    ...P31_RESTED.map((prefix, i) => ({
      n: i + 36,
      phrase: phraseOfSticking(`${prefix} ${singlesAfter(prefix, 3)} -`, P31_SLOTS, THREE_EIGHT),
      note: 'The bar ends on a rest.',
    })),
    ...P31_ROLLED.map((prefix, i) => ({
      n: i + 46,
      phrase: phraseOfSticking(`${prefix} ${doublesAfter(prefix, 4)}`, P31_SLOTS, THREE_EIGHT),
      note: i === 0 ? '5 stroke open roll.' : undefined,
    })),
  ],
}

export const BOOK_PAGES: readonly BookPage[] = [
  page9, page10, page11, page12, page13, page30, page31,
]

export const BOOK_PAGES_BY_NUMBER: ReadonlyMap<number, BookPage> = new Map(
  BOOK_PAGES.map((page) => [page.page, page]),
)

export const bookExerciseCount = BOOK_PAGES.reduce((n, p) => n + p.exercises.length, 0)
