import { describe, expect, it } from 'vitest'
import { toNumber } from '@paddrummer/core/fraction'
import { barBeats, isRest, placedStrokes } from '@paddrummer/core/phrase'
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

  it('page 14 no. 13 restarts its doubles inside each triplet', () => {
    // The answering bar is `R R L L | R R L | R R L`. Carrying the doubles
    // across the bracket would give `R R L | L R R`, which is not the page.
    expect(handsOf(14, 13)).toBe('RRLLRLRLRLRL' + 'RRLLRRLRRL')
  })

  it('page 15 answers with the pattern led by the other hand', () => {
    // `R L R R` ends on the right, so the second bar opens `L R L L`.
    expect(handsOf(15, 1)).toBe('RLRRLRLRLRLR' + 'LRLLRLRLRL')
  })

  it('page 16 no. 1 is a right hand flam and two lefts, four times over', () => {
    const strokes = placedStrokes(BOOK_PAGES_BY_NUMBER.get(16)!.exercises[0]!.phrase)
    expect(strokes).toHaveLength(12)
    expect(strokes[0]!.stroke.grace).toEqual(['L'])
    expect(strokes[0]!.stroke.hand).toBe('R')
    expect(strokes[1]!.stroke.grace).toBeUndefined()
    expect(handsOf(16, 1)).toBe('RLLRLLRLLRLL')
  })

  it('page 19 no. 74 is where the section starts again on the other hand', () => {
    // 19–73 combine the right-led bars; 74 begins the same run mirrored, so
    // its opening flam is a left hand one.
    const first = placedStrokes(
      BOOK_PAGES_BY_NUMBER.get(19)!.exercises.find((e) => e.n === 74)!.phrase,
    )[0]!
    expect(first.stroke.hand).toBe('L')
    expect(first.stroke.grace).toEqual(['R'])
  })

  it('page 24 no. 9 mirrors into its second bar and no. 7 does not', () => {
    // Both bars are three eighths and five sixteenths, and what decides it is
    // only where the first bar's last stroke fell.
    expect(handsOf(24, 7)).toBe('RLRLRLRL' + 'RLRLRLRL')
    expect(handsOf(24, 9)).toBe('RRLRLRLR' + 'LLRLRLRL')
  })

  it('page 26 no. 13 holds a four stroke roll, which flips the next bar', () => {
    expect(handsOf(26, 13)).toBe('RLRL' + 'LRLR')
  })

  it('page 33 no. 10 repeats its beat, because the rest takes a hand', () => {
    // Five strokes would flip the lead. The page does not, and the rest is
    // why: it takes the sixth position. Compare no. 12, which does flip.
    expect(handsOf(33, 10)).toBe('RLRLR'.repeat(4))
    expect(handsOf(33, 12)).toBe('RRLRL' + 'LLRLR' + 'RRLRL' + 'LLRLR')
  })

  it('page 34 nos. 7 and 10 are the same sticking at different rhythms', () => {
    const durations = (n: number) =>
      BOOK_PAGES_BY_NUMBER.get(34)!
        .exercises.find((e) => e.n === n)!
        .phrase.lines[0]!.events.map((event) => event.duration)
    expect(handsOf(34, 7)).toBe(handsOf(34, 10))
    expect(durations(7)).toEqual(['8.', '16', '8.', '16', '8.', '16', '8.', '16'])
    expect(durations(10)).toEqual(['8', '8', '8', '8', '8', '8', '8', '8'])
  })

  it('page 42 no. 19 mirrors its repeat and no. 20 does not', () => {
    // The page prints the answer: a repeat sign, with the hand to start it on
    // spelled out underneath — `L L -` for 19 and `R R -` for 20.
    expect(handsOf(42, 19)).toBe('RRLLRRLLRRLLRR' + 'LLRRLLRRLLRRLL')
    expect(handsOf(42, 20)).toBe('RRLLRRLLRRRLLL' + 'RRLLRRLLRRRLLL')
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

  it('page 42 no. 5 rests inside the bar, where the roll gives out', () => {
    // The rest is the eighth sixteenth, not the end of the bar: the quintuplet
    // that answers the roll comes after it.
    const events = BOOK_PAGES_BY_NUMBER.get(42)!
      .exercises.find((e) => e.n === 5)!.phrase.lines[0]!.events
    expect(events.filter(isRest)).toHaveLength(2)
    expect(isRest(events[7]!)).toBe(true)
    expect(isRest(events[12]!)).toBe(false)
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
        expect(at.column + (at.columns ?? 1), `page ${page.page} no. ${n}`)
          .toBeLessThanOrEqual(page.columns)
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
          for (let column = at.column; column < at.column + (at.columns ?? 1); column += 1) {
            const key = `${column}:${row}`
            expect(taken.has(key), `page ${page.page} no. ${n} collides at ${key}`).toBe(false)
            taken.add(key)
          }
        }
      }
    }
  })

  it('accounts for every line slot down the page', () => {
    // Page 9 is the one that matters here: nine exercises over twelve lines,
    // because three of them print a mirror line underneath. Page 16 is the
    // other: a rule across the page takes a slot that holds no staff.
    for (const page of BOOK_PAGES) {
      const claimed = page.exercises.reduce((n, e) => n + e.at.rows * (e.at.columns ?? 1), 0)
      const blank = (page.blankRows?.length ?? 0) * page.columns
      expect(claimed + blank, `page ${page.page}`).toBe(page.columns * page.lines)
    }
  })

  it('never puts an exercise on a slot the page leaves blank', () => {
    for (const page of BOOK_PAGES) {
      for (const blank of page.blankRows ?? []) {
        for (const { n, at } of page.exercises) {
          expect(blank >= at.row && blank < at.row + at.rows, `page ${page.page} no. ${n}`)
            .toBe(false)
        }
      }
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
