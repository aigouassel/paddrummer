import { type Duration, toNoteValue } from '../domain/duration'

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
 */
export type VexDuration = {
  /** A VexFlow duration string: 'q', '8', '16'... */
  duration: string
  dots: number
  /** How many of this note fill the space of two, or null when not a tuplet. */
  tupletOf: number | null
}

const PLAIN = new Set(['w', 'h', 'q', '8', '16', '32', '64'])

export function toVexDuration(value: Duration): VexDuration {
  const note = toNoteValue(value)
  if (note === null) {
    throw new Error(`toVexDuration: no glyph for duration ${JSON.stringify(value)}`)
  }
  if (PLAIN.has(note)) return { duration: note, dots: 0, tupletOf: null }
  if (note.endsWith('.')) return { duration: note.slice(0, -1), dots: 1, tupletOf: null }
  if (note.endsWith('t')) return { duration: note.slice(0, -1), dots: 0, tupletOf: 3 }
  throw new Error(`toVexDuration: unhandled note value ${note}`)
}
