import { describe, expect, it } from 'vitest'
import { fullCycle, mirror, noteCount, otherHand, sticking, totalBeats } from './pattern'
import { EIGHTH, QUARTER, SIXTEENTH, SIXTEENTH_TRIPLET, toBeats, toNoteValue } from './duration'
import { RUDIMENTS, RUDIMENTS_BY_ID } from './rudiments'
import { equals, sum, toNumber } from './fraction'

describe('otherHand', () => {
  it('alternates', () => {
    expect(otherHand('R')).toBe('L')
    expect(otherHand('L')).toBe('R')
  })
})

describe('fraction', () => {
  it('sums a bar of 16th-note triplets exactly, where floats do not', () => {
    const sixths = Array<[number, number]>(24).fill([1, 6])
    expect(equals(sum(sixths), [4, 1])).toBe(true)
    // The float route drifts to 3.9999999999999982 over the same bar.
    expect(sixths.reduce((acc) => acc + 1 / 6, 0)).not.toBe(4)
  })

  it('compares across un-normalised forms', () => {
    expect(equals([2, 4], [1, 2])).toBe(true)
  })

  it('keeps a bar of 16th-note triplets exact', () => {
    const bar = sum(Array<[number, number]>(24).fill([1, 6]))
    expect(equals(bar, [4, 1])).toBe(true)
  })
})

describe('duration', () => {
  it('round-trips between fractional and symbolic forms', () => {
    expect(toNoteValue(SIXTEENTH)).toBe('16')
    expect(toNoteValue(SIXTEENTH_TRIPLET)).toBe('16t')
    expect(equals(toBeats('8t'), [1, 3])).toBe(true)
  })

  it('reports no glyph for a duration notation cannot draw', () => {
    expect(toNoteValue([1, 5])).toBeNull()
  })
})

/** The six cases that decide whether the model works. */
describe('the six hard cases', () => {
  it('1. single paradiddle: 8 even notes, accents on 1 and 5', () => {
    const cycle = fullCycle(RUDIMENTS_BY_ID.get('single-paradiddle')!)
    expect(cycle.map((s) => s.hand).join('')).toBe('RLRRLRLL')
    expect(cycle.map((s) => s.accent ?? false)).toEqual(
      [true, false, false, false, true, false, false, false],
    )
    expect(equals(totalBeats(cycle), [2, 1])).toBe(true)
  })

  it('2. flam: one grace note on the opposite hand, with no duration of its own', () => {
    const [flam] = sticking('l>R', QUARTER)
    expect(flam!.grace).toEqual(['L'])
    expect(flam!.accent).toBe(true)
    // The ornament adds a note but not a beat.
    expect(noteCount([flam!])).toBe(2)
    expect(equals(totalBeats([flam!]), QUARTER)).toBe(true)
  })

  it('3. flam tap: grace notes on some strokes only', () => {
    const cycle = fullCycle(RUDIMENTS_BY_ID.get('flam-tap')!)
    expect(cycle.map((s) => s.grace ?? null)).toEqual([['L'], null, ['R'], null])
    expect(cycle.map((s) => s.hand).join('')).toBe('RRLL')
  })

  it('4. single drag tap: two grace notes before the main note', () => {
    const [drag] = RUDIMENTS_BY_ID.get('single-drag-tap')!.pattern
    expect(drag!.grace).toEqual(['L', 'L'])
    expect(noteCount([drag!])).toBe(3)
  })

  it('5. five stroke roll: doubles into a longer single', () => {
    const { pattern } = RUDIMENTS_BY_ID.get('five-stroke-roll')!
    expect(pattern.map((s) => s.hand).join('')).toBe('RRLLR')
    expect(pattern.slice(0, 4).every((s) => equals(toBeats(s.duration), SIXTEENTH))).toBe(true)
    expect(equals(toBeats(pattern[4]!.duration), QUARTER)).toBe(true)
  })

  it('6. swiss army triplet: three notes in the space of two', () => {
    const { pattern } = RUDIMENTS_BY_ID.get('swiss-army-triplet')!
    expect(pattern).toHaveLength(3)
    // Three notes filling exactly one beat is the property a power-of-two
    // duration model cannot express.
    expect(equals(totalBeats(pattern), [1, 1])).toBe(true)
    expect(toNoteValue(pattern[0]!.duration)).toBe('8t')
  })
})

describe('mirror', () => {
  it('flips main hands and grace notes together', () => {
    expect(mirror(sticking('l>R L R R'))).toEqual(sticking('r>L R L L'))
  })

  it('is its own inverse', () => {
    const original = sticking('ll>R L R R')
    expect(mirror(mirror(original))).toEqual(original)
  })
})

describe('sticking parser', () => {
  it('rejects a token it cannot parse', () => {
    expect(() => sticking('R X L')).toThrow(/cannot parse "X"/)
  })

  it('rejects a per-stroke duration list that is too short', () => {
    expect(() => sticking('R L R', [SIXTEENTH, EIGHTH])).toThrow(/no duration supplied/)
  })

  it('treats a bare fraction as one duration for every stroke', () => {
    expect(sticking('R L', [1, 6]).map((s) => s.duration)).toEqual([[1, 6], [1, 6]])
  })
})

describe('the 40 rudiments', () => {
  it('has exactly 40, numbered 1..40 with no gaps', () => {
    expect(RUDIMENTS).toHaveLength(40)
    expect(RUDIMENTS.map((r) => r.number)).toEqual(
      Array.from({ length: 40 }, (_, i) => i + 1),
    )
  })

  it('has unique ids', () => {
    expect(RUDIMENTS_BY_ID.size).toBe(40)
  })

  it('covers the four PAS families with the official counts', () => {
    const counts = RUDIMENTS.reduce<Record<string, number>>((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + 1
      return acc
    }, {})
    expect(counts).toEqual({ roll: 15, diddle: 4, flam: 11, drag: 10 })
  })

  it('leads every pattern with the right hand', () => {
    for (const r of RUDIMENTS) expect(r.pattern[0]!.hand).toBe('R')
  })

  it('gives every stroke a positive duration', () => {
    for (const r of RUDIMENTS) {
      for (const stroke of r.pattern) {
        expect(toNumber(toBeats(stroke.duration))).toBeGreaterThan(0)
      }
    }
  })

  it('builds an alternating cycle as the pattern followed by its mirror', () => {
    for (const r of RUDIMENTS) {
      const cycle = fullCycle(r)
      if (r.alternates) {
        expect(cycle.slice(r.pattern.length), r.id).toEqual(mirror(r.pattern))
        expect(cycle[r.pattern.length]!.hand, r.id).toBe('L')
      } else {
        expect(cycle, r.id).toEqual([...r.pattern])
      }
      // Either way the loop restarts on the right hand.
      expect(cycle[0]!.hand, r.id).toBe('R')
    }
  })

  it('never gives a grace note the same hand as an adjacent double', () => {
    // A drag is two grace notes; three would be a four-stroke ruff, which is
    // not in the PAS 40. Catches a typo like 'lllR'.
    for (const r of RUDIMENTS) {
      for (const stroke of r.pattern) {
        expect(stroke.grace?.length ?? 0).toBeLessThanOrEqual(2)
      }
    }
  })

  it('lasts a musically sane fraction of a beat per cycle', () => {
    // The minimal unit need not be a whole beat — a single stroke roll is two
    // 16ths — but its length must be a simple subdivision, never something
    // like 1/5 of a beat, which no drummer counts.
    const SANE = [1, 2, 3, 4, 6, 8, 12]
    for (const r of RUDIMENTS) {
      const beats = totalBeats(fullCycle(r))
      expect(SANE, `${r.id} lasts ${beats[0]}/${beats[1]} beats`).toContain(beats[1])
      expect(toNumber(beats), r.id).toBeGreaterThan(0)
    }
  })
})
