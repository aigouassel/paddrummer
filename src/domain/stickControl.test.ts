import { describe, expect, it } from 'vitest'
import { toNumber } from './fraction'
import { barBeats, isRest, placedStrokes } from './phrase'
import { ASSET_DIR, BOOK_PAGES, BOOK_PAGES_BY_NUMBER, sourceFile } from './stickControl'

const handsOf = (page: number, n: number) =>
  placedStrokes(BOOK_PAGES_BY_NUMBER.get(page)!.exercises.find((e) => e.n === n)!.phrase)
    .map((p) => p.stroke.hand)
    .join('')

describe('the transcribed pages', () => {
  it('numbers every exercise contiguously, from wherever the page starts', () => {
    // A section can run across several pages, so page 31 picks up at 25 where
    // page 30 left off — but within a page the numbering never skips.
    for (const page of BOOK_PAGES) {
      const numbers = page.exercises.map((e) => e.n)
      const first = numbers[0]!
      expect(numbers, `page ${page.page}`).toEqual(
        Array.from({ length: numbers.length }, (_, i) => first + i),
      )
    }
  })

  it('fills a whole number of bars of its own metre', () => {
    // The strongest check available on a transcription: if a duration template
    // were wrong, the bars would not add up.
    for (const page of BOOK_PAGES) {
      for (const exercise of page.exercises) {
        const meter = exercise.phrase.meter!
        expect(meter, `page ${page.page} no. ${exercise.n}`).not.toBeNull()
        const bars = toNumber(exercise.phrase.beats) / toNumber(barBeats(meter))
        expect(Math.abs(bars - Math.round(bars)), `page ${page.page} no. ${exercise.n}`)
          .toBeLessThan(1e-9)
        expect(bars, `page ${page.page} no. ${exercise.n}`).toBeGreaterThan(0)
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

/**
 * A transcription is only worth as much as its traceability. If two exercises
 * claim the same staff line, or a line nobody claims goes missing, then the
 * mapping back to the photograph is wrong and a bad sticking becomes
 * impossible to track down.
 */
describe('every exercise can be traced back to the page it was read from', () => {
  it('names the image its own page number', () => {
    for (const page of BOOK_PAGES) {
      for (const exercise of page.exercises) {
        expect(exercise.at.file, `page ${page.page} no. ${exercise.n}`).toBe(sourceFile(page.page))
        expect(exercise.at.file).toContain(ASSET_DIR)
      }
    }
  })

  it('places every exercise inside the page it claims', () => {
    for (const page of BOOK_PAGES) {
      for (const { n, at } of page.exercises) {
        expect(at.column, `page ${page.page} no. ${n}`).toBeGreaterThanOrEqual(0)
        expect(at.column, `page ${page.page} no. ${n}`).toBeLessThan(page.columns)
        expect(at.row, `page ${page.page} no. ${n}`).toBeGreaterThanOrEqual(0)
        expect(at.row + at.rows, `page ${page.page} no. ${n}`).toBeLessThanOrEqual(page.lines)
      }
    }
  })

  it('never puts two exercises on the same staff line', () => {
    for (const page of BOOK_PAGES) {
      const taken = new Set<string>()
      for (const { n, at } of page.exercises) {
        for (let row = at.row; row < at.row + at.rows; row += 1) {
          const key = `${at.column}:${row}`
          expect(taken.has(key), `page ${page.page} no. ${n} collides at ${key}`).toBe(false)
          taken.add(key)
        }
      }
    }
  })

  it('accounts for every staff line printed on the page', () => {
    // Page 9 is the one that matters here: nine exercises over twelve lines,
    // because three of them print a mirror line underneath.
    for (const page of BOOK_PAGES) {
      const claimed = page.exercises.reduce((n, e) => n + e.at.rows, 0)
      expect(claimed, `page ${page.page}`).toBe(page.columns * page.lines)
    }
  })

  it('runs down each column in printed order', () => {
    for (const page of BOOK_PAGES) {
      const sorted = [...page.exercises].sort((a, b) => a.n - b.n)
      let previous = -1
      let column = 0
      for (const { at } of sorted) {
        if (at.column !== column) {
          column = at.column
          previous = -1
        }
        expect(at.row, `page ${page.page}`).toBeGreaterThan(previous)
        previous = at.row
      }
    }
  })
})
