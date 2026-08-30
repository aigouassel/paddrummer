import { type Duration } from '@paddrummer/core/duration'
import { type Hand } from '@paddrummer/core/pattern'
import { type Meter } from '@paddrummer/core/phrase'

// ── Sticking helpers ────────────────────────────────────────────────
//
// Most of these exercises are a short pattern followed by a tail that simply
// carries on alternating. Writing the tail out by hand would be 5,000 letters
// of copy typing with no way to check it; generating it from the rule that the
// page actually follows is both shorter and verifiable. The rule was checked
// against the printed page for every exercise, and where a page breaks it —
// page 30's second half — the tail is written out literally instead.

export const lastHand = (spec: string): Hand => {
  const letters = spec.trim().split(/\s+/).filter((t) => t !== '|')
  const last = letters[letters.length - 1]
  return last?.endsWith('L') ? 'L' : 'R'
}

export const other = (hand: Hand): Hand => (hand === 'R' ? 'L' : 'R')

/** `n` alternating single strokes, continuing from where the prefix left off. */
export function singlesAfter(prefix: string, n: number): string {
  let hand = other(lastHand(prefix))
  const out: string[] = []
  for (let i = 0; i < n; i += 1) {
    out.push(hand)
    hand = other(hand)
  }
  return out.join(' ')
}

/** `n` strokes in doubles (RRLL…), continuing from where the prefix left off. */
export function doublesAfter(prefix: string, n: number): string {
  let hand = other(lastHand(prefix))
  const out: string[] = []
  for (let i = 0; i < n; i += 1) {
    out.push(hand)
    if (i % 2 === 1) hand = other(hand)
  }
  return out.join(' ')
}

export const repeat = (value: Duration, n: number): Duration[] => Array.from({ length: n }, () => value)

/** Stone's twelve four-stroke patterns, in the order the book presents them. */
export const TWELVE = [
  'R L R L', 'L R L R', 'R R L L', 'L L R R',
  'R L R R', 'R L L R', 'R R L R', 'R R R L',
  'L L L R', 'R L L L', 'L R R R', 'R R R R',
] as const

export const CUT: Meter = [2, 2]
export const THREE_EIGHT: Meter = [3, 8]

export const TWO_FOUR: Meter = [2, 4]

/** `n` strokes of the given tail shape, starting from `hand`. */
export const runFrom = (hand: Hand, n: number, shape: (h: Hand, i: number) => Hand): string => {
  const out: string[] = []
  let current = hand
  for (let i = 0; i < n; i += 1) {
    out.push(current)
    current = shape(current, i)
  }
  return out.join(' ')
}

export const singlesFrom = (hand: Hand, n: number) => runFrom(hand, n, (h) => other(h))
export const doublesFrom = (hand: Hand, n: number) => runFrom(hand, n, (h, i) => (i % 2 === 1 ? other(h) : h))

export const mirrorSticking = (spec: string): string =>
  spec.replace(/[RL]/g, (hand) => (hand === 'R' ? 'L' : 'R'))

export const flamStroke = (token: string): string =>
  token === 'F' ? 'lR' : token === 'f' ? 'rL' : token
