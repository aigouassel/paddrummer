import { describe, expect, it } from 'vitest'
import { toNumber } from './fraction'
import { sticking } from './pattern'
import {
  barBeats,
  isRest,
  line,
  lineBeats,
  meterText,
  phraseNoteCount,
  phraseOfLines,
  phraseOfStrokes,
  placedStrokes,
} from './phrase'

const beatsOf = (phrase: ReturnType<typeof phraseOfLines>) =>
  placedStrokes(phrase).map((p) => toNumber(p.atBeat))

describe('barBeats', () => {
  it('counts a 4/4 bar as four quarter-note beats', () => {
    expect(toNumber(barBeats([4, 4]))).toBe(4)
  })

  it('counts a 7/4 bar as seven', () => {
    expect(toNumber(barBeats([7, 4]))).toBe(7)
  })

  it('counts a 7/8 bar as three and a half, not seven', () => {
    // The unit of `Duration` is the quarter note, so an eighth-note meter is
    // half as long as its top number suggests.
    expect(toNumber(barBeats([7, 8]))).toBe(3.5)
  })

  it('names the meter for the stave', () => {
    expect(meterText([7, 4])).toBe('7/4')
  })
})

describe('line', () => {
  it('reads x as a stroke and - as a rest', () => {
    const part = line('R', 'x - x', 'q')
    expect(part.events.map(isRest)).toEqual([false, true, false])
    expect(part.hand).toBe('R')
  })

  it('ignores bar lines, which are only there to be read', () => {
    expect(line('L', 'x x | x x', '8').events).toHaveLength(4)
    expect(toNumber(lineBeats(line('L', 'x x | x x', '8')))).toBe(2)
  })

  it('gives every stroke the line s own hand', () => {
    const part = line('L', 'x x x', 'q')
    for (const event of part.events) {
      expect(isRest(event) ? null : event.hand).toBe('L')
    }
  })

  it('marks accents', () => {
    const part = line('R', '>x x', 'q')
    const first = part.events[0]!
    expect(isRest(first) ? null : first.accent).toBe(true)
  })

  it('puts grace notes on the opposite hand', () => {
    const part = line('R', 'lx', 'q')
    const first = part.events[0]!
    expect(isRest(first) ? null : first.grace).toEqual(['L'])
  })

  it('accepts a duration per event', () => {
    const part = line('R', 'x x x', ['h', 'q', 'q'])
    expect(toNumber(lineBeats(part))).toBe(4)
  })

  it('rejects an unparseable token', () => {
    expect(() => line('R', 'x y x', 'q')).toThrow(/cannot parse "y"/)
  })

  it('rejects a missing duration', () => {
    expect(() => line('R', 'x x x', ['q', 'q'])).toThrow(/no duration/)
  })
})

describe('phraseOfStrokes', () => {
  it('turns a rudiment into a single line with no meter', () => {
    const phrase = phraseOfStrokes(sticking('R L R R'))
    expect(phrase.lines).toHaveLength(1)
    expect(phrase.meter).toBeNull()
    expect(toNumber(phrase.beats)).toBe(1)
  })

  it('places consecutive strokes one after another', () => {
    const phrase = phraseOfStrokes(sticking('R L R R'))
    expect(beatsOf(phrase)).toEqual([0, 0.25, 0.5, 0.75])
  })

  it('survives an empty pattern', () => {
    const phrase = phraseOfStrokes([])
    expect(phrase.lines).toEqual([])
    expect(placedStrokes(phrase)).toEqual([])
  })
})

describe('phraseOfLines', () => {
  it('merges two hands into one timeline in playing order', () => {
    // 3/4: the right hand plays three quarters, the left two dotted quarters.
    const phrase = phraseOfLines([3, 4], [
      line('R', 'x x x', 'q'),
      line('L', 'x x', 'q.'),
    ])
    expect(beatsOf(phrase)).toEqual([0, 0, 1, 1.5, 2])
  })

  it('places three against two exactly, with no drift', () => {
    const phrase = phraseOfLines([3, 4], [
      line('R', 'x x x', 'q'),
      line('L', 'x x', 'q.'),
    ])
    const left = placedStrokes(phrase).filter((p) => p.lineIndex === 1)
    // 1.5 exactly, not 1.4999999999999998.
    expect(left.map((p) => p.atBeat)).toEqual([
      [0, 1],
      [3, 2],
    ])
  })

  it('places four against three exactly', () => {
    const phrase = phraseOfLines([3, 4], [
      line('R', 'x x x', 'q'),
      line('L', 'x x x x', '8.'),
    ])
    expect(beatsOf(phrase)).toEqual([0, 0, 0.75, 1, 1.5, 2, 2.25])
  })

  it('breaks ties with the upper line first', () => {
    const phrase = phraseOfLines([2, 4], [
      line('R', 'x x', 'q'),
      line('L', 'x x', 'q'),
    ])
    expect(placedStrokes(phrase).map((p) => p.lineIndex)).toEqual([0, 1, 0, 1])
  })

  it('rejects lines of different lengths', () => {
    expect(() =>
      phraseOfLines([4, 4], [line('R', 'x x x x', 'q'), line('L', 'x x x', 'q')]),
    ).toThrow(/lasts 3 beats/)
  })

  it('rejects a phrase that is not a whole number of bars', () => {
    expect(() => phraseOfLines([4, 4], [line('R', 'x x x', 'q')])).toThrow(/whole number/)
  })

  it('accepts several bars', () => {
    const phrase = phraseOfLines([7, 4], [
      line('R', 'x x x x x x x | x x x x x x x', 'q'),
      line('L', 'x x x x x x x | x x x x x x x', 'q'),
    ])
    expect(toNumber(phrase.beats)).toBe(14)
  })

  it('handles an eighth-note meter', () => {
    // 7/8 grouped 2+2+3, the left hand marking only the group heads.
    const phrase = phraseOfLines([7, 8], [
      line('R', 'x x x x x x x', '8'),
      line('L', 'x - x - x - -', '8'),
    ])
    expect(toNumber(phrase.beats)).toBe(3.5)
    expect(placedStrokes(phrase).filter((p) => p.lineIndex === 1).map((p) => toNumber(p.atBeat)))
      .toEqual([0, 1, 2])
  })
})

describe('phraseNoteCount', () => {
  it('counts grace notes as struck', () => {
    const phrase = phraseOfLines([2, 4], [line('R', 'lx x', 'q')])
    expect(phraseNoteCount(phrase)).toBe(3)
  })

  it('ignores rests', () => {
    const phrase = phraseOfLines([2, 4], [line('R', 'x - x -', '8')])
    expect(phraseNoteCount(phrase)).toBe(2)
  })
})
