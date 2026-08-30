import {
  type Duration,
  OCTUPLET_SIXTEENTH,
  QUINTUPLET_EIGHTH,
  toBeats,
  toNoteValue,
} from '../domain/duration'
import { type Fraction, equals } from '../domain/fraction'

/**
 * Translates a domain duration into what VexFlow needs to draw it.
 *
 * The two models disagree in an interesting way. Our durations are lengths of
 * time, so a 16th-note triplet is simply 1/6 of a beat. VexFlow, like notation
 * itself, has no glyph for "one sixth": it draws a 16th note and relies on a
 * tuplet bracket to say that three of them occupy the space of two. Dots work
 * the same way — 3/2 of a beat is a quarter note plus a dot, not a duration in
 * its own right.
 *
 * So a single number splits into three facts, and this is the only place that
 * knows how.
 *
 * The dots appear twice on purpose, and both are needed. `duration` carries
 * them as VexFlow's `d` suffix, which is what sets the note's *tick value* and
 * therefore how the formatter spaces it. `dots` is the count, which is what
 * draws the dot glyphs. Attaching the glyph without the suffix produces a note
 * that is drawn dotted and spaced as though it were not — invisible in a
 * single voice, and badly wrong the moment a second voice has to line up
 * against it.
 */

/** How many of a note fill the space of how many others of it. */
export type TupletRatio = { numNotes: number; notesOccupied: number }

export type VexDuration = {
  /** A VexFlow duration string, dots included: 'q', '8', 'qd', 'hdd'. */
  duration: string
  dots: number
  /** The bracket this note belongs under, or null when it needs none. */
  tuplet: TupletRatio | null
}

/**
 * The tuplets that are not triplets. A triplet is spelled into the note value
 * itself — `8t` — because every other rudiment uses one; these two are only
 * ever met in a practice book, so they stay plain fractions in the domain and
 * are recognised here by their length. Five eighths in the space of four is
 * Stone's `5` bracket, and eight sixteenths in the space of six his `8` in 6/8.
 */
const BRACKETED: readonly [length: Fraction, glyph: string, tuplet: TupletRatio][] = [
  [QUINTUPLET_EIGHTH, '8', { numNotes: 5, notesOccupied: 4 }],
  [OCTUPLET_SIXTEENTH, '16', { numNotes: 8, notesOccupied: 6 }],
]

const PLAIN = new Set(['w', 'h', 'q', '8', '16', '32', '64'])

export function toVexDuration(value: Duration): VexDuration {
  const beats = toBeats(value)
  const bracketed = BRACKETED.find(([length]) => equals(beats, length))
  if (bracketed) return { duration: bracketed[1], dots: 0, tuplet: bracketed[2] }

  const note = toNoteValue(value)
  if (note === null) {
    throw new Error(`toVexDuration: no glyph for duration ${JSON.stringify(value)}`)
  }
  if (PLAIN.has(note)) return { duration: note, dots: 0, tuplet: null }
  if (note.endsWith('.')) return { duration: `${note.slice(0, -1)}d`, dots: 1, tuplet: null }
  if (note.endsWith('t')) {
    return { duration: note.slice(0, -1), dots: 0, tuplet: { numNotes: 3, notesOccupied: 2 } }
  }
  throw new Error(`toVexDuration: unhandled note value ${note}`)
}
