import { describe, expect, it } from 'vitest'
import { toNumber } from './fraction'
import { barBeats, isRest, placedStrokes } from './phrase'
import { BOOK_PAGES, BOOK_PAGES_BY_NUMBER } from './stickControl'

const handsOf = (page: number, n: number) =>
  placedStrokes(BOOK_PAGES_BY_NUMBER.get(page)!.exercises.find((e) => e.n === n)!.phrase)
    .map((p) => p.stroke.hand)
    .join('')

describe('the transcribed pages', () => {
  it('numbers every exercise contiguously from one', () => {
    for (const page of BOOK_PAGES) {
      const numbers = page.exercises.map((e) => e.n)
      expect(numbers, `page ${page.page}`).toEqual(
        Array.from({ length: numbers.length }, (_, i) => i + 1),
      )
    }
  })

  it('fills exactly one bar of its own metre', () => {
    // The strongest check available on a transcription: if a duration template
    // were wrong, the bar would not add up.
    for (const page of BOOK_PAGES) {
      for (const exercise of page.exercises) {
        const meter = exercise.phrase.meter!
        expect(meter, `page ${page.page} no. ${exercise.n}`).not.toBeNull()
        expect(
          toNumber(exercise.phrase.beats),
          `page ${page.page} no. ${exercise.n}`,
        ).toBeCloseTo(toNumber(barBeats(meter)), 9)
      }
    }
  })

  it('never produces an empty exercise', () => {
    for (const page of BOOK_PAGES) {
      for (const exercise of page.exercises) {
        expect(placedStrokes(exercise.phrase).length, `page ${page.page}`).toBeGreaterThan(0)
      }
    }
  })

  it('keeps every exercise on a single line', () => {
    for (const page of BOOK_PAGES) {
      for (const exercise of page.exercises) {
        expect(exercise.phrase.lines).toHaveLength(1)
      }
    }
  })
})

describe('spot checks against the printed page', () => {
  it('page 9 no. 1 is four eighths then two triplet groups, all singles', () => {
    expect(handsOf(9, 1)).toBe('RLRLRLRLRL')
  })

  it('page 9 no. 3 leads with a double', () => {
    expect(handsOf(9, 3)).toBe('RRLLRLRLRL')
  })

  it('page 9 no. 8 leads with three lefts', () => {
    expect(handsOf(9, 8)).toBe('RLLLRLRLRL')
  })

  it('page 10 no. 1 carries on in single strokes', () => {
    expect(handsOf(10, 1)).toBe('RLRLRLRLRLRL')
  })

  it('page 10 no. 5 turns over to the left hand for the tail', () => {
    // R L R R ends on the right, so the sixteenths start on the left.
    expect(handsOf(10, 5)).toBe('RLRRLRLRLRLR')
  })

  it('page 11 no. 1 has the same opening but a doubled tail', () => {
    expect(handsOf(11, 1)).toBe('RLRLRRLLRRLL')
  })

  it('page 11 no. 12 starts the doubles on the left', () => {
    expect(handsOf(11, 12)).toBe('RRRRLLRRLLRR')
  })

  it('page 12 ends on one buzzed stroke rather than a written-out roll', () => {
    const phrase = BOOK_PAGES_BY_NUMBER.get(12)!.exercises[0]!.phrase
    const strokes = placedStrokes(phrase)
    expect(strokes).toHaveLength(5)
    expect(strokes[4]!.stroke.buzz).toBe(true)
    expect(strokes[4]!.stroke.hand).toBe('R')
  })

  it('page 30 no. 1 is four sixteenths and a triplet', () => {
    expect(handsOf(30, 1)).toBe('RLRLRLR')
  })

  it('page 30 no. 18 breaks the alternation in its triplet', () => {
    // The tail is written out because this half of the page stops following
    // the plain-alternation rule the first half does.
    expect(handsOf(30, 18)).toBe('RLRLRRL')
  })
})

describe('bars that end on a rest', () => {
  it('page 10 no. 13 is eleven strokes and a rest, not twelve strokes', () => {
    const phrase = BOOK_PAGES_BY_NUMBER.get(10)!.exercises.find((e) => e.n === 13)!.phrase
    const events = phrase.lines[0]!.events
    expect(events).toHaveLength(12)
    expect(events.filter(isRest)).toHaveLength(1)
    expect(isRest(events[11]!)).toBe(true)
    expect(placedStrokes(phrase)).toHaveLength(11)
  })
})
