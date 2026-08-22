import { describe, expect, it } from 'vitest'
import { StaveNote } from 'vexflow'
import { toVexDuration } from './vexDuration'
import {
  EIGHTH_TRIPLET,
  type NoteValue,
  QUARTER,
  SIXTEENTH,
  SIXTEENTH_TRIPLET,
  toBeats,
} from '../domain/duration'
import { toNumber } from '../domain/fraction'

describe('toVexDuration', () => {
  it('passes plain note values straight through', () => {
    expect(toVexDuration(SIXTEENTH)).toEqual({ duration: '16', dots: 0, tupletOf: null })
    expect(toVexDuration(QUARTER)).toEqual({ duration: 'q', dots: 0, tupletOf: null })
  })

  it('splits a triplet into a plain glyph plus a tuplet ratio', () => {
    // A 16th-note triplet is drawn as a 16th note; the bracket carries the rest.
    expect(toVexDuration(SIXTEENTH_TRIPLET)).toEqual({ duration: '16', dots: 0, tupletOf: 3 })
    expect(toVexDuration(EIGHTH_TRIPLET)).toEqual({ duration: '8', dots: 0, tupletOf: 3 })
  })

  it('puts the dot in the duration string as well as the dot count', () => {
    // Both matter: the `d` suffix sets the tick value the formatter spaces by,
    // the count draws the glyph. See the tick test below for why.
    expect(toVexDuration('q.')).toEqual({ duration: 'qd', dots: 1, tupletOf: null })
    expect(toVexDuration('8.')).toEqual({ duration: '8d', dots: 1, tupletOf: null })
  })

  it('accepts symbolic and fractional spellings of the same duration', () => {
    expect(toVexDuration('16')).toEqual(toVexDuration([1, 4]))
  })

  it('refuses a duration notation cannot draw', () => {
    expect(() => toVexDuration([1, 5])).toThrow(/no glyph/)
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
    const { duration, tupletOf } = toVexDuration('8t')
    expect(tupletOf).toBe(3)
    const note = new StaveNote({ keys: ['c/5'], duration })
    expect(note.getTicks().value() / TICKS_PER_BEAT).toBe(0.5)
    expect(toNumber(toBeats('8t'))).toBeCloseTo(1 / 3, 9)
  })
})
