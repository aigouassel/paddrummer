import { type Fraction, equals, toNumber } from './fraction'

/**
 * A duration can be written two ways, and both are first-class:
 *
 *   - as a Fraction of a quarter-note beat  — [1, 4] is a 16th note
 *   - as a symbolic NoteValue              — '16' is a 16th note
 *
 * Fractions are canonical: the scheduler and the scorer always normalise to
 * beats via `toBeats`, so their arithmetic stays exact and triplets cost
 * nothing. NoteValue exists because the notation layer needs a glyph name,
 * and because `'8t'` reads better than `[1, 3]` when hand-writing a rudiment.
 *
 * The conversion is total in one direction (every NoteValue is a Fraction)
 * and partial in the other (not every Fraction is drawable), which is exactly
 * the asymmetry between time and notation.
 */

export type NoteValue =
  | 'w' | 'h' | 'q' | '8' | '16' | '32' | '64'
  | 'h.' | 'q.' | '8.' | '16.'
  | 'ht' | 'qt' | '8t' | '16t' | '32t'

/** Beats, where one beat is a quarter note. */
const BEATS: Record<NoteValue, Fraction> = {
  w: [4, 1], h: [2, 1], q: [1, 1], '8': [1, 2], '16': [1, 4], '32': [1, 8], '64': [1, 16],
  'h.': [3, 1], 'q.': [3, 2], '8.': [3, 4], '16.': [3, 8],
  ht: [4, 3], qt: [2, 3], '8t': [1, 3], '16t': [1, 6], '32t': [1, 12],
}

export type Duration = Fraction | NoteValue

export const isNoteValue = (d: Duration): d is NoteValue => typeof d === 'string'

/** Discriminates a single Fraction from an array of Durations. */
export const isFraction = (d: unknown): d is Fraction =>
  Array.isArray(d) && d.length === 2 && typeof d[0] === 'number' && typeof d[1] === 'number'

export const toBeats = (d: Duration): Fraction => (isNoteValue(d) ? BEATS[d] : d)

/** The notation layer's lookup: null when a duration has no single glyph. */
export function toNoteValue(d: Duration): NoteValue | null {
  if (isNoteValue(d)) return d
  for (const [name, beats] of Object.entries(BEATS) as [NoteValue, Fraction][]) {
    if (equals(beats, d)) return name
  }
  return null
}

export const beatsToSeconds = (beats: Fraction, bpm: number): number =>
  (toNumber(beats) * 60) / bpm

// Convenience constants, since rudiments are authored fractionally.
export const WHOLE: Fraction = [4, 1]
export const HALF: Fraction = [2, 1]
export const QUARTER: Fraction = [1, 1]
export const EIGHTH: Fraction = [1, 2]
export const SIXTEENTH: Fraction = [1, 4]
export const THIRTY_SECOND: Fraction = [1, 8]
export const EIGHTH_TRIPLET: Fraction = [1, 3]
export const SIXTEENTH_TRIPLET: Fraction = [1, 6]
