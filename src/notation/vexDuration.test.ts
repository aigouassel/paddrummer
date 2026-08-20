import { describe, expect, it } from 'vitest'
import { toVexDuration } from './vexDuration'
import { EIGHTH_TRIPLET, QUARTER, SIXTEENTH, SIXTEENTH_TRIPLET } from '../domain/duration'

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

  it('splits a dotted value into a glyph plus a dot', () => {
    expect(toVexDuration('q.')).toEqual({ duration: 'q', dots: 1, tupletOf: null })
  })

  it('accepts symbolic and fractional spellings of the same duration', () => {
    expect(toVexDuration('16')).toEqual(toVexDuration([1, 4]))
  })

  it('refuses a duration notation cannot draw', () => {
    expect(() => toVexDuration([1, 5])).toThrow(/no glyph/)
  })
})
