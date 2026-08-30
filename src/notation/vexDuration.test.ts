import { describe, expect, it } from 'vitest'
import { StaveNote } from 'vexflow'
import { toVexDuration } from './vexDuration'
import {
  EIGHTH_TRIPLET,
  type NoteValue,
  OCTUPLET_SIXTEENTH,
  QUARTER,
  QUINTUPLET_EIGHTH,
  SIXTEENTH,
  SIXTEENTH_TRIPLET,
  toBeats,
} from '../domain/duration'
import { toNumber } from '../domain/fraction'
import { BOOK_PAGES } from '../domain/stickControl'

const TRIPLET = { numNotes: 3, notesOccupied: 2 }

describe('toVexDuration', () => {
  it('passes plain note values straight through', () => {
    expect(toVexDuration(SIXTEENTH)).toEqual({ duration: '16', dots: 0, tuplet: null })
    expect(toVexDuration(QUARTER)).toEqual({ duration: 'q', dots: 0, tuplet: null })
  })

  it('splits a triplet into a plain glyph plus a tuplet ratio', () => {
    // A 16th-note triplet is drawn as a 16th note; the bracket carries the rest.
    expect(toVexDuration(SIXTEENTH_TRIPLET)).toEqual({ duration: '16', dots: 0, tuplet: TRIPLET })
    expect(toVexDuration(EIGHTH_TRIPLET)).toEqual({ duration: '8', dots: 0, tuplet: TRIPLET })
  })

  it('puts the dot in the duration string as well as the dot count', () => {
    // Both matter: the `d` suffix sets the tick value the formatter spaces by,
    // the count draws the glyph. See the tick test below for why.
    expect(toVexDuration('q.')).toEqual({ duration: 'qd', dots: 1, tuplet: null })
    expect(toVexDuration('8.')).toEqual({ duration: '8d', dots: 1, tuplet: null })
  })

  it('accepts symbolic and fractional spellings of the same duration', () => {
    expect(toVexDuration('16')).toEqual(toVexDuration([1, 4]))
  })

  it('brackets the tuplets that have no note value of their own', () => {
    // Five eighths in the space of four, and eight sixteenths in the space of
    // six: both are drawn as a plain note, with the number over the group.
    expect(toVexDuration(QUINTUPLET_EIGHTH)).toEqual({
      duration: '8',
      dots: 0,
      tuplet: { numNotes: 5, notesOccupied: 4 },
    })
    expect(toVexDuration(OCTUPLET_SIXTEENTH)).toEqual({
      duration: '16',
      dots: 0,
      tuplet: { numNotes: 8, notesOccupied: 6 },
    })
  })

  it('refuses a duration notation cannot draw', () => {
    expect(() => toVexDuration([1, 7])).toThrow(/no glyph/)
  })
})

/**
 * The invariant that matters: what VexFlow *thinks* a note lasts has to agree
 * with what the domain says it lasts.
 *
 * These are two independent duration systems, and nothing downstream reads
 * VexFlow's back, so they can disagree silently for a long time. They did:
 * dotted notes were drawn with a dot but given a plain note's tick value,
 * which only became visible when a second voice had to line up against them.
 */
describe('VexFlow agrees with the domain about how long a note is', () => {
  const TICKS_PER_BEAT = 4096

  const VALUES: NoteValue[] = [
    'w', 'h', 'q', '8', '16', '32', '64',
    'h.', 'q.', '8.', '16.',
  ]

  it.each(VALUES)('%s lasts the same in both systems', (value) => {
    const { duration } = toVexDuration(value)
    const note = new StaveNote({ keys: ['c/5'], duration })
    expect(note.getTicks().value() / TICKS_PER_BEAT).toBeCloseTo(toNumber(toBeats(value)), 9)
  })

  it('gives a rest the same length as the note it replaces', () => {
    const { duration } = toVexDuration('q.')
    const rest = new StaveNote({ keys: ['c/5'], duration: `${duration}r` })
    expect(rest.isRest()).toBe(true)
    expect(rest.getTicks().value() / TICKS_PER_BEAT).toBeCloseTo(1.5, 9)
  })

  it('draws a triplet as its plain glyph, the bracket carrying the ratio', () => {
    // The tuplet is the exception: the glyph deliberately lasts longer than
    // the domain value, and the bracket is what makes three fit in two.
    const { duration, tuplet } = toVexDuration('8t')
    expect(tuplet).toEqual(TRIPLET)
    const note = new StaveNote({ keys: ['c/5'], duration })
    expect(note.getTicks().value() / TICKS_PER_BEAT).toBe(0.5)
    expect(toNumber(toBeats('8t'))).toBeCloseTo(1 / 3, 9)
  })
})

/**
 * The practice book is where the odd durations come from, and a page whose
 * lengths this layer could not draw would throw only when someone opened it.
 * Pages 25, 26 and 42 all use groups that need a bracket rather than a glyph.
 */
describe('every duration the transcribed pages use', () => {
  it('has a glyph, or a bracket', () => {
    for (const page of BOOK_PAGES) {
      for (const exercise of page.exercises) {
        for (const line of exercise.phrase.lines) {
          for (const event of line.events) {
            expect(
              () => toVexDuration(event.duration),
              `page ${page.page} no. ${exercise.n}`,
            ).not.toThrow()
          }
        }
      }
    }
  })
})
