import { type Duration } from '@paddrummer/core/duration'
import { phraseOfSticking } from '@paddrummer/core/phrase'
import { type BookPage, grid } from '../book'
import { THREE_EIGHT, TWO_FOUR, doublesAfter, repeat, singlesAfter } from '../sticking'
import { cellPage } from '../cells'

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

export const page30: BookPage = {
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

export const page31: BookPage = {
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

// ── page 32 — Combinations in 3/8, continued ────────────────────────
//
// Where page 31 left off, at 49. The cell is a bar again: four sixteenths,
// then four thirty-seconds or a closed roll held for an eighth.

export const page32 = cellPage({
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

export const page33 = cellPage({
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
