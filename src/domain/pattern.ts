import { type Fraction, sum } from './fraction'
import { type Duration, SIXTEENTH, isFraction, toBeats } from './duration'

/** Which hand strikes the drum. */
export type Hand = 'R' | 'L'

export const otherHand = (hand: Hand): Hand => (hand === 'R' ? 'L' : 'R')

/**
 * One note the player aims at.
 *
 * Grace notes are a PROPERTY of the stroke they decorate, not strokes in their
 * own right. That choice buys the invariant that matters most downstream:
 * one Stroke is exactly one thing the player is judged on. A flam is a single
 * musical event with a decoration, so scoring is a straight map over strokes
 * with no filtering, and the count of `pattern` is the count of hits expected.
 * The notation layer pays the small price of unpacking `grace` into VexFlow
 * grace-note groups, which is where that complexity belongs.
 */
export type Stroke = {
  hand: Hand
  duration: Duration
  /**
   * Quiet ornaments struck immediately before this stroke, in playing order.
   * One = flam, two = drag (ruff), three = four-stroke ruff. Conventionally on
   * the opposite hand, but stored explicitly rather than derived, because
   * several rudiments break that convention.
   */
  grace?: readonly Hand[]
  accent?: boolean
  /** A pressed multiple-bounce stroke rather than a discrete hit (buzz roll). */
  buzz?: boolean
}

/** The four families of the PAS 40 International Drum Rudiments. */
export type RudimentCategory = 'roll' | 'diddle' | 'flam' | 'drag'

export type Rudiment = {
  /** URL-safe identifier, e.g. `single-paradiddle`. */
  id: string
  name: string
  /** Official PAS number, 1-40. */
  number: number
  category: RudimentCategory
  /** The smallest repeating unit, written leading with the right hand. */
  pattern: readonly Stroke[]
  /**
   * True when the practice loop is `pattern` followed by its mirror image, as
   * with the paradiddle (RLRR then LRLL). False when the rudiment repeats on
   * the same lead hand, as with the paradiddle-diddle, or when `pattern`
   * already contains both hands, as with the double stroke roll.
   */
  alternates: boolean
  /** False when the sticking here still needs checking against a rudiment book. */
  verified: boolean
  notes?: string
}

const HANDS: Record<string, Hand> = { r: 'R', l: 'L', R: 'R', L: 'L' }
const TOKEN = /^([rl]*)(>?)([RL])$/

/**
 * Parses a compact sticking notation into strokes.
 *
 *   'R L R R'        four plain strokes
 *   'l>R R'          flam (grace on the left) and accent, then a tap
 *   'llR >L'         drag (two grace notes), then an accented tap
 *
 * A tiny parser rather than hand-built object literals: the 40 rudiments are
 * ~250 strokes, and `'l>R L R R'` is checkable against a drum book at a glance
 * in a way that nine lines of `{ hand: 'R', duration: SIXTEENTH }` is not.
 */
export function sticking(
  spec: string,
  duration: Duration | readonly Duration[] = SIXTEENTH,
): Stroke[] {
  // A Fraction is itself a 2-tuple, so `Array.isArray` alone cannot tell a
  // single duration from a list of them. `isFraction` breaks the tie.
  const perStroke: readonly Duration[] | null =
    Array.isArray(duration) && !isFraction(duration) ? (duration as readonly Duration[]) : null
  const uniform = perStroke ? null : (duration as Duration)

  return spec.trim().split(/\s+/).map((token, index) => {
    const match = TOKEN.exec(token)
    if (!match) throw new Error(`sticking: cannot parse "${token}" in "${spec}"`)

    const [, graceLetters = '', accentMark = '', handLetter = 'R'] = match
    const hand = HANDS[handLetter] as Hand

    const strokeDuration = perStroke ? perStroke[index] : uniform
    if (strokeDuration == null) {
      throw new Error(`sticking: no duration supplied for stroke ${index} of "${spec}"`)
    }

    const stroke: Stroke = { hand, duration: strokeDuration }
    if (graceLetters) stroke.grace = [...graceLetters].map((c) => HANDS[c] as Hand)
    if (accentMark) stroke.accent = true
    return stroke
  })
}

/** Swaps every hand, grace notes included. Turns RLRR into LRLL. */
export const mirror = (strokes: readonly Stroke[]): Stroke[] =>
  strokes.map((stroke) => ({
    ...stroke,
    hand: otherHand(stroke.hand),
    ...(stroke.grace ? { grace: stroke.grace.map(otherHand) } : {}),
  }))

/** One full practice cycle: both leads when the rudiment alternates. */
export const fullCycle = (rudiment: Rudiment): Stroke[] =>
  rudiment.alternates
    ? [...rudiment.pattern, ...mirror(rudiment.pattern)]
    : [...rudiment.pattern]

export const totalBeats = (strokes: readonly Stroke[]): Fraction =>
  sum(strokes.map((s) => toBeats(s.duration)))

/** Total notes actually struck, counting grace notes. Not the same as hits aimed at. */
export const noteCount = (strokes: readonly Stroke[]): number =>
  strokes.reduce((n, s) => n + 1 + (s.grace?.length ?? 0), 0)
