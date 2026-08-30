import { type Duration, OCTUPLET_SIXTEENTH, QUINTUPLET_EIGHTH } from './duration'
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

/**
 * Where on the photographed page an exercise was read from.
 *
 * A transcription is only worth as much as its traceability: without this,
 * a wrong sticking is a mystery, and with it you can put the app and the page
 * side by side and see which of the two is wrong.
 */
export type SourceRef = {
  /** The image this came from, named for the page number printed on it. */
  file: string
  /** 0 is the left-hand column of exercises on the page, 1 the right. */
  column: number
  /** 0-based staff line down that column. */
  row: number
  /** Staff lines the exercise occupies; more than one when a mirror follows. */
  rows: number
  /**
   * Columns the line runs across, when a page that is otherwise in two columns
   * gives some of its lines the full width — page 34 does, for the four-bar
   * combinations under its rule. Absent means one, which is nearly always.
   */
  columns?: number
}

export type BookExercise = {
  /** The number printed beside it on the page. */
  n: number
  phrase: Phrase
  /** Anything printed under the exercise, such as a roll's name. */
  note?: string
  at: SourceRef
}

export type BookPage = {
  page: number
  title: string
  /** How one bar is built, in words, since the notation alone can be terse. */
  shape: string
  /** Columns of exercises across the page, and line slots down each. */
  columns: number
  lines: number
  /**
   * Slots down a column that hold no staff. Page 16 rules a line across the
   * page between its two blocks, so its columns are thirteen slots holding
   * twelve exercises each, and a crop of anything below the rule only lands on
   * the right staff if the empty slot is counted.
   */
  blankRows?: readonly number[]
  exercises: readonly BookExercise[]
}

/** Where the photographs live. Gitignored: they are a copyrighted book. */
export const ASSET_DIR = 'assets/stick-control-for-the-snare-drummer'

export const sourceFile = (page: number): string => `${ASSET_DIR}/page-${page}.HEIC`

/**
 * Position on a page laid out as a plain grid, filled column by column.
 *
 * Every page here but page 9 numbers straight down the left column and then
 * straight down the right, so the position follows from the index.
 */
const grid =
  (page: number, rowsPerColumn: number) =>
  (index: number): SourceRef => ({
    file: sourceFile(page),
    column: Math.floor(index / rowsPerColumn),
    row: index % rowsPerColumn,
    rows: 1,
  })

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

/**
 * Page 9 does not lay out as a grid. Numbers 5, 6 and 7 print a second staff
 * line beneath them leading with the other hand, so twelve lines carry nine
 * exercises. These are the first line of each, and how many it occupies.
 */
const P9_LINES: [row: number, rows: number][] = [
  [0, 1], [1, 1], [2, 1], [3, 1], [4, 2], [6, 2], [8, 2], [10, 1], [11, 1],
]

const page9: BookPage = {
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

const page10: BookPage = {
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

const page11: BookPage = {
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
const page12: BookPage = {
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
  columns: 2,
  lines: 12,
  exercises: [
    ...[...P30_PLAIN, ...P30_LAST].map((prefix, i) => ({
      n: i + 1,
      phrase: phraseOfSticking(`${prefix} ${singlesAfter(prefix, 3)}`, P30_SLOTS, THREE_EIGHT),
      at: grid(30, 12)(i),
    })),
    ...[11, 12].map((n, i) => ({
      n,
      phrase: phraseOfSticking(
        `${['R L R L', 'R R L L'][i]} ~${singlesAfter(['R L R L', 'R R L L'][i]!, 1)}`,
        P30_ROLL,
        THREE_EIGHT,
      ),
      note: '7 stroke closed roll.',
      at: grid(30, 12)(n - 1),
    })),
    ...P30_ROLLS.map((prefix, i) => ({
      n: i + 13,
      phrase: phraseOfSticking(`${prefix} ~${singlesAfter(prefix, 1)}`, P30_ROLL, THREE_EIGHT),
      note: 'Closed roll.',
      at: grid(30, 12)(i + 12),
    })),
    ...P30_TAILED.map(([prefix, tail], i) => ({
      n: i + 18,
      phrase: phraseOfSticking(`${prefix} ${tail}`, P30_SLOTS, THREE_EIGHT),
      at: grid(30, 12)(i + 17),
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
  columns: 2,
  lines: 12,
  exercises: [
    ...P31_PLAIN.map((prefix, i) => ({
      n: i + 25,
      phrase: phraseOfSticking(`${prefix} ${singlesAfter(prefix, 4)}`, P31_SLOTS, THREE_EIGHT),
      at: grid(31, 12)(i),
    })),
    ...P31_RESTED.map((prefix, i) => ({
      n: i + 36,
      phrase: phraseOfSticking(`${prefix} ${singlesAfter(prefix, 3)} -`, P31_SLOTS, THREE_EIGHT),
      note: 'The bar ends on a rest.',
      at: grid(31, 12)(i + 11),
    })),
    ...P31_ROLLED.map((prefix, i) => ({
      n: i + 46,
      phrase: phraseOfSticking(`${prefix} ${doublesAfter(prefix, 4)}`, P31_SLOTS, THREE_EIGHT),
      note: i === 0 ? '5 stroke open roll.' : undefined,
      at: grid(31, 12)(i + 21),
    })),
  ],
}

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

const page14 = tripletsPage(14, 'Short Rolls and Triplets', [
  {
    leads: ['R L R L', 'L R L R'],
    answers: ['R L R L R L R L R L', 'L R L R L R L R L R'],
  },
  {
    leads: ['R R L L', 'L L R R'],
    answers: ['R R L L R R L R R L', 'L L R R L L R L L R'],
  },
])

const page15 = tripletsPage(15, 'Short Rolls and Triplets, continued', [
  {
    leads: ['R L R R', 'L R L L'],
    answers: ['L R L L R L R L R L', 'R L R R L R L R L R'],
  },
  {
    leads: ['R L L R', 'L R R L'],
    answers: ['L R R L R R L R R L', 'R L L R L L R L L R'],
  },
])

// ── pages 16 to 19 — Flam Beats ─────────────────────────────────────
//
// Twenty-four to a page, numbered straight through the section, so page 16
// holds 1–24 and page 19 finishes mid-run at 96.
//
// Page 16's own footnote spells the notation out: `F` is a right hand flam,
// written (L R), and an `F` in a circle is a left hand flam, written (R L).
// They are typed here as `F` and `f`, which lets a bar be written the way the
// page prints it and read back the same way.
//
// The rhythm follows from the letters. Every beat of these pages holds either
// three notes — an eighth and two sixteenths — or four sixteenths, so how many
// letters a beat holds says which, and no rhythm has to be guessed.

const TWO_FOUR: Meter = [2, 4]

/** A beat of three letters is an eighth and two sixteenths; four are equal. */
const flamBeatSlots = (letters: readonly string[]): Duration[] =>
  letters.length === 3 ? ['8', '16', '16'] : repeat('16', letters.length)

const flamStroke = (token: string): string =>
  token === 'F' ? 'lR' : token === 'f' ? 'rL' : token

/** One line of a flam page, written as its beats, separated by `/`. */
function flamLine(spec: string): Phrase {
  const beats = spec.split('/').map((beat) => beat.trim().split(/\s+/))
  return phraseOfSticking(
    beats.flat().map(flamStroke).join(' '),
    beats.flatMap(flamBeatSlots),
    TWO_FOUR,
  )
}

/**
 * The eighteen bars page 16 prints above the rule, in the order it prints
 * them. Each is one bar of 2/4 — two beats — and each of 1–18 is that bar
 * played twice.
 */
const FLAM_BARS = [
  'F L L / F L L',
  'f R R / f R R',
  'F R R / f L L',
  'F L R / f R L',
  'F R L / F R L',
  'f L R / f L R',
  'F R L / f L R',
  'F L R L / F L R L',
  'f R L R / f R L R',
  'F L R R / f R L L',
  'F R f L / F R f L',
  'F L R L / f R L R',
  'F R L L / F R L L',
  'f L R R / f L R R',
  'F R L R / f L R L',
  'F R L L / f L R R',
  'F L L R / f R R L',
  'F R R R / f L L L',
]

/**
 * From no. 19 the section stops inventing bars and starts combining them:
 * every exercise is one of the eighteen answered by a later one. Only the
 * fourteen that lead with the right hand are combined, taken in the order they
 * are printed, so those fourteen are the alphabet the rest is spelled with.
 */
const FLAM_RIGHT_LINES = [1, 3, 4, 5, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18]
const FLAM_RIGHT = FLAM_RIGHT_LINES.map((n) => FLAM_BARS[n - 1]!)

const MIRROR: Record<string, string> = { F: 'f', f: 'F', R: 'L', L: 'R' }
const mirrorBar = (bar: string): string => bar.replace(/[FfRL]/g, (c) => MIRROR[c]!)

/**
 * At no. 74 the whole run starts again on the other hand. Four of these
 * mirrors are printed as exercises in their own right — 2, 6, 9 and 14 are the
 * mirrors of 1, 5, 8 and 13 — and the other ten appear only here.
 */
const FLAM_LEFT = FLAM_RIGHT.map(mirrorBar)
const FLAM_MIRROR_OF: Record<number, number> = { 1: 2, 5: 6, 8: 9, 13: 14 }

type FlamCombination = { spec: string; note: string }

/** Every ordered pair of the given bars, first bar first, as the pages run. */
function flamCombinations(bars: readonly string[], mirrored: boolean): FlamCombination[] {
  const name = (index: number): string => {
    const line = FLAM_RIGHT_LINES[index]!
    if (!mirrored) return `no. ${line}`
    const printed = FLAM_MIRROR_OF[line]
    return printed ? `no. ${printed}` : `the mirror of no. ${line}`
  }
  const out: FlamCombination[] = []
  for (let i = 0; i < bars.length; i += 1) {
    for (let j = i + 1; j < bars.length; j += 1) {
      out.push({
        spec: `${bars[i]} / ${bars[j]}`,
        note: `${name(i)}'s bar answered by ${name(j)}'s.`,
      })
    }
  }
  return out
}

/**
 * The section as the four photographed pages have it: the eighteen bars, then
 * the right-led combinations as far as no. 73, then the mirrored ones. Both
 * runs are cut where the pages cut them — the book carries on past page 19.
 */
const FLAM_SECTION: readonly FlamCombination[] = [
  ...FLAM_BARS.map((bar) => ({ spec: `${bar} / ${bar}`, note: '' })),
  ...flamCombinations(FLAM_RIGHT, false).slice(0, 55),
  ...flamCombinations(FLAM_LEFT, true).slice(0, 23),
]

/**
 * Page 16 alone breaks its columns: nine lines, a rule across the page, then
 * three more. Counting the rule as a thirteenth slot is what puts a crop of
 * anything below it on the right staff.
 */
const flamAt16 = (index: number): SourceRef => ({
  file: sourceFile(16),
  column: index < 18 ? Math.floor(index / 9) : Math.floor((index - 18) / 3),
  row: index < 18 ? index % 9 : 10 + ((index - 18) % 3),
  rows: 1,
})

function flamPage(page: number, first: number): BookPage {
  const at = page === 16 ? flamAt16 : grid(page, 12)
  return {
    page,
    title: 'Flam Beats',
    shape: 'Two bars of 2/4, a beat at a time, with the flams the page marks.',
    columns: 2,
    lines: page === 16 ? 13 : 12,
    ...(page === 16 ? { blankRows: [9] } : {}),
    exercises: FLAM_SECTION.slice(first - 1, first + 23).map((line, i) => ({
      n: first + i,
      phrase: flamLine(line.spec),
      ...(line.note ? { note: line.note } : {}),
      at: at(i),
    })),
  }
}

const page16 = flamPage(16, 1)
const page17 = flamPage(17, 25)
const page18 = flamPage(18, 49)
const page19 = flamPage(19, 73)

// ── the shape pages 24 to 26, 32 and 33 share ───────────────────────
//
// Each of these exercises is one cell played over and over, and a cell is an
// opening pattern followed by a single figure: a run of strokes, or a closed
// roll held out. What varies between the pages is the note values, and whether
// a cell is a whole bar or half of one.
//
// A cell's repeat leads with the hand that follows its last stroke, so the
// repeat is the same sticking when the cell holds an even number of strokes
// and the mirror of it when the count is odd. That is why a block's six lines
// are not the same six on every page: where a cell mirrors itself one line
// already covers both hands, and the page spends the spare line on another
// shape.
//
// The one thing that does not follow is what a rest at the end of a cell does
// to that count, and the pages disagree. Pages 24 to 26 and 32 carry straight
// on from the last stroke as though the rest were not there; page 33 lets the
// rest take the hand it would have struck, and so leads the next cell with the
// other one. Both were read off the page, so a block says which it does.

const mirrorSticking = (spec: string): string =>
  spec.replace(/[RL]/g, (hand) => (hand === 'R' ? 'L' : 'R'))

/** What fills a cell after its opening pattern. */
type Figure =
  | {
      kind: 'run'
      slot: Duration
      /** Strokes struck; a rest, where there is one, takes the slot after them. */
      strokes: number
      rest: boolean
      tail: (from: string, count: number) => string
    }
  | {
      kind: 'roll'
      slot: Duration
      /** Strokes the page prints under the tremolo, which fixes the parity. */
      strokes: number
      tied: boolean
    }

/** A run of lines sharing one figure — a column, or half of one. */
type Block = {
  /** The opening patterns, in the order the block prints them. */
  patterns: readonly string[]
  /** The note value the opening pattern is written in. */
  lead: Duration
  figure: Figure
  /** Page 33 only: a closing rest takes the hand it would have struck. */
  restTakesAHand?: boolean
  note?: string
}

/** One cell, and the hand the next one leads with. */
function cell(pattern: string, block: Block): [spec: string, slots: Duration[], next: Hand] {
  const lead = repeat(block.lead, pattern.split(/\s+/).length)
  const { figure } = block
  if (figure.kind === 'roll') {
    // The roll alternates from its own first stroke, so an odd count of them
    // ends where it began and an even one ends on the other hand.
    const from = singlesAfter(pattern, 1) as Hand
    const ends = figure.strokes % 2 === 1 ? from : other(from)
    return [`${pattern} ~${from}`, [...lead, figure.slot], other(ends)]
  }
  const body = figure.tail(pattern, figure.strokes)
  const counted = block.restTakesAHand && figure.rest ? figure.strokes + 1 : figure.strokes
  return [
    figure.rest ? `${pattern} ${body} -` : `${pattern} ${body}`,
    [...lead, ...repeat(figure.slot, figure.strokes + (figure.rest ? 1 : 0))],
    other(lastHand(figure.tail(pattern, counted))),
  ]
}

/** `count` cells, each the pattern restarted on the hand the last one left. */
function cellPhrase(pattern: string, block: Block, count: number, meter: Meter): Phrase {
  const specs: string[] = []
  const slots: Duration[] = []
  let current = pattern
  for (let i = 0; i < count; i += 1) {
    const [spec, cellSlots, next] = cell(current, block)
    specs.push(spec)
    slots.push(...cellSlots)
    if (next !== current[0]) current = mirrorSticking(current)
  }
  return phraseOfSticking(specs.join(' '), slots, meter)
}

type CellPage = {
  page: number
  title: string
  shape: string
  meter: Meter
  /** Cells to a line: two on a page whose cell is a bar, four on page 33. */
  cells: number
  /** The number printed beside the first exercise; a section can run on. */
  first?: number
  columns: number
  lines: number
  blankRows?: readonly number[]
  at: (index: number) => SourceRef
  blocks: readonly Block[]
}

function cellPage(spec: CellPage): BookPage {
  const first = spec.first ?? 1
  let n = 0
  return {
    page: spec.page,
    title: spec.title,
    shape: spec.shape,
    columns: spec.columns,
    lines: spec.lines,
    ...(spec.blankRows ? { blankRows: spec.blankRows } : {}),
    exercises: spec.blocks.flatMap((block) =>
      block.patterns.map((pattern) => {
        const index = n
        n += 1
        return {
          n: first + index,
          phrase: cellPhrase(pattern, block, spec.cells, spec.meter),
          ...(block.note ? { note: block.note } : {}),
          at: spec.at(index),
        }
      }),
    ),
  }
}

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

const page24 = sixEightPage(24, 'Three eighth notes, then six sixteenths.', [
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

const page25 = sixEightPage(
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

const page26 = sixEightPage(
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

// ── page 32 — Combinations in 3/8, continued ────────────────────────
//
// Where page 31 left off, at 49. The cell is a bar again: four sixteenths,
// then four thirty-seconds or a closed roll held for an eighth.

const page32 = cellPage({
  page: 32,
  title: 'Combinations in 3/8, concluded',
  shape: 'Four sixteenths, then four thirty-seconds or a closed roll.',
  meter: THREE_EIGHT,
  cells: 2,
  first: 49,
  columns: 2,
  lines: 12,
  at: grid(32, 12),
  blocks: [
    {
      patterns: ['L L R R', 'R L R R', 'R L L R', 'R L L L', 'L R R R', 'R R R L', 'L L L R'],
      lead: '16',
      figure: { kind: 'run', slot: '32', strokes: 4, rest: false, tail: doublesAfter },
    },
    {
      patterns: ['R L R L', 'L R L R', 'R R L L', 'L L R R', 'R L R R'],
      lead: '16',
      figure: { kind: 'run', slot: '32', strokes: 3, rest: true, tail: doublesAfter },
      note: '3 stroke open roll. Each bar ends on a rest.',
    },
    {
      patterns: ['R L R L', 'L R L R', 'R R L L', 'L L R R', 'R L R R', 'R L L R'],
      lead: '16',
      figure: { kind: 'roll', slot: '8', strokes: 2, tied: true },
      note: '5 stroke closed roll, tied into the next bar in the book. Ties are not modelled, so this sounds the same as the 3 stroke version below.',
    },
    {
      patterns: ['R L R L', 'L R L R', 'R R L L', 'L L R R', 'R L R R', 'R R R R'],
      lead: '16',
      figure: { kind: 'roll', slot: '8', strokes: 2, tied: false },
      note: '3 stroke closed roll — untied.',
    },
  ],
})

// ── page 33 — Combinations in 2/4 ───────────────────────────────────
//
// The same idea at half the length: the cell is a beat rather than a bar — two
// sixteenths and then the figure — so a line holds four of them, two to a bar.
// This is also the page whose rests take a hand.

const page33 = cellPage({
  page: 33,
  title: 'Combinations in 2/4',
  shape: 'Two sixteenths, then a triplet, four thirty-seconds, or a closed roll. Four beats.',
  meter: TWO_FOUR,
  cells: 4,
  columns: 2,
  lines: 12,
  at: grid(33, 12),
  blocks: [
    {
      patterns: ['R L', 'R R', 'L L'],
      lead: '16',
      figure: { kind: 'run', slot: '16t', strokes: 3, rest: false, tail: singlesAfter },
    },
    {
      patterns: ['R L', 'L R', 'R R'],
      lead: '16',
      figure: { kind: 'run', slot: '16t', strokes: 3, rest: false, tail: doublesAfter },
    },
    {
      patterns: ['R L', 'L R', 'R R'],
      lead: '16',
      figure: { kind: 'run', slot: '32', strokes: 4, rest: false, tail: singlesAfter },
    },
    {
      patterns: ['R L', 'L R', 'R R'],
      lead: '16',
      figure: { kind: 'run', slot: '32', strokes: 3, rest: true, tail: singlesAfter },
      restTakesAHand: true,
      note: 'Each beat ends on a rest.',
    },
    {
      patterns: ['R L', 'L R', 'R R'],
      lead: '16',
      figure: { kind: 'run', slot: '32', strokes: 4, rest: false, tail: doublesAfter },
      note: '5 stroke open roll.',
    },
    {
      patterns: ['R L', 'L R', 'R R'],
      lead: '16',
      figure: { kind: 'run', slot: '32', strokes: 3, rest: true, tail: doublesAfter },
      restTakesAHand: true,
      note: '3 stroke open roll. Each beat ends on a rest.',
    },
    {
      patterns: ['R L', 'L R', 'R R'],
      lead: '16',
      figure: { kind: 'roll', slot: '8', strokes: 2, tied: true },
      note: '5 stroke closed roll, tied in the book. Ties are not modelled, so this sounds the same as the 3 stroke version below.',
    },
    {
      patterns: ['R L', 'L R', 'R R'],
      lead: '16',
      figure: { kind: 'roll', slot: '8', strokes: 2, tied: false },
      note: '3 stroke closed roll — untied.',
    },
  ],
})

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

const page34: BookPage = {
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

const page35: BookPage = {
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

// ── page 42 — Short Roll Progressions ───────────────────────────────
//
// Three blocks of eight, ruled off from one another. Every line is a bar
// played twice, and the second is the first restarted on the hand that follows
// its last stroke — which this page states outright in its third block, where
// the second bar is a repeat sign and the letters printed after it name the
// hand to start the repeat on.
//
// The roll that opens a bar is generated, since it is only doubles and the
// page labels it a 9 or 7 stroke roll. The bracketed group answering it is
// written out: it is the thing being progressed through, and follows no rule.

/** One of five eighth notes in the space of four — the page's `5` bracket. */
const FIVE: Duration = QUINTUPLET_EIGHTH
/**
 * Six in the space of four, which is an eighth-note triplet twice over and so
 * needs no bracket of its own. The page draws one `6` where this draws two
 * `3`s; the rhythm is the same and the notes fall in the same places.
 */
const SIX: Duration = '8t'

const handsOfSpec = (spec: string): Hand[] =>
  spec
    .trim()
    .split(/\s+/)
    .filter((token) => token !== '-')
    .map((token) => (token.endsWith('L') ? 'L' : 'R'))

/** A bar, then the same bar led by the hand that follows its last stroke. */
function progressionPhrase(spec: string, slots: Duration[], endsOn: Hand): Phrase {
  const second = other(endsOn) === spec[0] ? spec : mirrorSticking(spec)
  return phraseOfSticking(`${spec} ${second}`, [...slots, ...slots], CUT)
}

/** An open roll in sixteenths, then the bracketed group that answers it. */
function rolledProgression(
  lead: Hand,
  strokes: number,
  rest: boolean,
  tail: string,
  tailSlot: Duration,
): Phrase {
  const spec = `${doublesFrom(lead, strokes)}${rest ? ' -' : ''} ${tail}`
  const slots = [
    ...repeat('16', strokes + (rest ? 1 : 0)),
    ...repeat(tailSlot, tail.split(/\s+/).length),
  ]
  const hands = handsOfSpec(tail)
  return progressionPhrase(spec, slots, hands[hands.length - 1]!)
}

/** The bracketed group, then a closed roll held for a half note. */
function rolledClose(tail: string): Phrase {
  const hands = handsOfSpec(tail)
  const from = other(hands[hands.length - 1]!)
  // Four strokes are printed under the tremolo, so it ends on the other hand.
  return progressionPhrase(
    `${tail} ~${from}`,
    [...repeat(FIVE, hands.length), 'h'],
    other(from),
  )
}

/** Four lines to a block, three blocks, with a rule between each pair. */
const progressionAt = (index: number): SourceRef => ({
  file: sourceFile(42),
  column: Math.floor((index % 8) / 4),
  row: Math.floor(index / 8) * 5 + (index % 4),
  rows: 1,
})

const P42: readonly { phrase: Phrase; note?: string }[] = [
  // 1–8: a roll, then five in the space of four.
  { phrase: rolledProgression('R', 8, false, 'R L R L R', FIVE), note: '9 stroke open roll.' },
  { phrase: rolledProgression('R', 8, false, 'R R L L R', FIVE) },
  { phrase: rolledProgression('R', 8, false, 'R L R R L', FIVE) },
  { phrase: rolledProgression('L', 8, false, 'L R L L R', FIVE) },
  { phrase: rolledProgression('R', 7, true, 'R L R L R', FIVE), note: '7 stroke open roll. The roll ends on a rest.' },
  { phrase: rolledProgression('R', 7, true, 'R R L L R', FIVE), note: 'The roll ends on a rest.' },
  { phrase: rolledProgression('R', 7, true, 'R L R R L', FIVE), note: 'The roll ends on a rest.' },
  { phrase: rolledProgression('L', 7, true, 'L R L L R', FIVE), note: 'The roll ends on a rest.' },

  // 9–16: the five, then a closed roll held out instead.
  { phrase: rolledClose('R L R L R'), note: '9 stroke closed roll, tied into the next bar in the book. Ties are not modelled, so this sounds the same as the 7 stroke version opposite.' },
  { phrase: rolledClose('R R L L R'), note: 'Closed roll, tied into the next bar.' },
  { phrase: rolledClose('R L R R L'), note: 'Closed roll, tied into the next bar.' },
  { phrase: rolledClose('L R L L R'), note: 'Closed roll, tied into the next bar.' },
  { phrase: rolledClose('R L R L R'), note: '7 stroke closed roll — untied.' },
  { phrase: rolledClose('R R L L R'), note: 'Closed roll, untied.' },
  { phrase: rolledClose('R L R R L'), note: 'Closed roll, untied.' },
  { phrase: rolledClose('L R L L R'), note: 'Closed roll, untied.' },

  // 17–24: a roll, then six in the space of four.
  { phrase: rolledProgression('R', 8, false, 'R L R L R L', SIX), note: '9 stroke open roll. The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('L', 8, false, 'L R L R L R', SIX), note: 'The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('R', 8, false, 'R R L L R R', SIX), note: 'The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('R', 8, false, 'R R R L L L', SIX), note: 'The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('R', 7, true, 'R L R L R L', SIX), note: '7 stroke open roll, ending on a rest. The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('L', 7, true, 'L R L R L R', SIX), note: 'The roll ends on a rest. The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('R', 7, true, 'R R L L R R', SIX), note: 'The roll ends on a rest. The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
  { phrase: rolledProgression('R', 7, true, 'R R R L L L', SIX), note: 'The roll ends on a rest. The book writes the second bar as a repeat sign, and brackets the six as one group where this draws two triplets.' },
]

const page42: BookPage = {
  page: 42,
  title: 'Short Roll Progressions',
  shape: 'A bar of cut time played twice: an open roll and a bracketed group, or a group and a closed roll.',
  columns: 2,
  lines: 14,
  blankRows: [4, 9],
  exercises: P42.map((line, i) => ({
    n: i + 1,
    phrase: line.phrase,
    ...(line.note ? { note: line.note } : {}),
    at: progressionAt(i),
  })),
}

export const BOOK_PAGES: readonly BookPage[] = [
  page9, page10, page11, page12, page13, page14, page15, page16, page17, page18, page19,
  page24, page25, page26, page30, page31, page32, page33, page34, page35, page42,
]

export const BOOK_PAGES_BY_NUMBER: ReadonlyMap<number, BookPage> = new Map(
  BOOK_PAGES.map((page) => [page.page, page]),
)

export const bookExerciseCount = BOOK_PAGES.reduce((n, p) => n + p.exercises.length, 0)
