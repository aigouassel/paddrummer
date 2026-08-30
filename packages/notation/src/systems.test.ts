import { describe, expect, it } from 'vitest'
import { line, phraseOfLines, phraseOfSticking, type Phrase } from '@paddrummer/core/phrase'
import { BOOK_PAGES_BY_NUMBER } from '@paddrummer/stick-control'
import { FIXED_WIDTH, PADDING, planScore, splitBars } from './systems'

/**
 * The layout arithmetic, checked without a browser.
 *
 * `renderScore` needs a real `HTMLDivElement` and an SVG backend, so nothing
 * inside it can be reached from here. Everything that decides *where the music
 * goes* — as opposed to what it looks like — lives in `systems.ts` for exactly
 * that reason, and this is the test that makes keeping it there worthwhile.
 */

const FOUR_FOUR = [4, 4] as const

/** `n` bars of plain quarter notes, one line. */
const quarters = (bars: number): Phrase =>
  phraseOfSticking(Array.from({ length: bars * 4 }, () => 'R').join(' '), 'q', FOUR_FOUR)

describe('splitBars', () => {
  it('leaves a rudiment whole, because a rudiment has no bars', () => {
    // meter is null for a repeating cell, so there is nothing to split at.
    const phrase = phraseOfSticking('R L R L', '8')
    expect(phrase.meter).toBeNull()
    expect(splitBars(phrase)).toEqual([[{ start: 0, end: 4 }]])
  })

  // Page 34 in 2/4, where the bars genuinely have to be found: its first
  // twelve exercises are one bar played twice, and from no. 13 they are two
  // bars answered by two more. The bars mix flam triplets, dotted eighths and
  // plain eighths, so the boundary is never a fixed number of events.
  it.each([
    [1, 2],
    [13, 4],
  ])('splits page 34 no. %i into %i bars', (n, bars) => {
    const exercise = BOOK_PAGES_BY_NUMBER.get(34)!.exercises.find((e) => e.n === n)!
    const slices = splitBars(exercise.phrase)

    // Contiguous, and between them they account for every event.
    for (const lineSlices of slices) {
      expect(lineSlices[0]!.start).toBe(0)
      lineSlices.forEach((slice, i) => {
        if (i > 0) expect(slice.start).toBe(lineSlices[i - 1]!.end)
      })
    }
    expect(slices[0]!.at(-1)!.end).toBe(exercise.phrase.lines[0]!.events.length)
    expect(slices[0]!).toHaveLength(bars)
  })

  it('cuts four bars of quarters at every fourth note', () => {
    expect(splitBars(quarters(4))).toEqual([
      [
        { start: 0, end: 4 },
        { start: 4, end: 8 },
        { start: 8, end: 12 },
        { start: 12, end: 16 },
      ],
    ])
  })

  it('splits two lines at the same musical position, not the same index', () => {
    // The right hand plays eighths against the left hand's quarters, so bar
    // one is eight events on top and four underneath.
    const phrase = phraseOfLines(FOUR_FOUR, [
      line('R', 'x x x x x x x x | x x x x x x x x', '8'),
      line('L', 'x x x x | x x x x', 'q'),
    ])
    expect(splitBars(phrase)).toEqual([
      [
        { start: 0, end: 8 },
        { start: 8, end: 16 },
      ],
      [
        { start: 0, end: 4 },
        { start: 4, end: 8 },
      ],
    ])
  })

  it('keeps a short final bar rather than dropping it', () => {
    // Five quarters in 4/4: one full bar and a stub. The stub still draws.
    const phrase = phraseOfSticking('R R R R R', 'q', FOUR_FOUR)
    expect(splitBars(phrase)).toEqual([[{ start: 0, end: 4 }, { start: 4, end: 5 }]])
  })

  it('refuses a note that crosses a barline', () => {
    // Two whole bars, so `phraseOfLines` accepts it: it checks the total, not
    // where the notes fall. The half starts on beat 4 and ends on beat 2 of
    // the next bar, which needs a tie, and ties are not in the model. This is
    // the case the upstream guard cannot see and this one can.
    const phrase = phraseOfLines(FOUR_FOUR, [
      line('R', 'x x x x x x x', ['q', 'q', 'q', 'h', 'q', 'q', 'q']),
    ])
    expect(phrase.beats).toEqual([8, 1])
    expect(() => splitBars(phrase)).toThrow(/crossing the barline/)
  })
})

describe('planScore', () => {
  const WIDE = 900

  it('draws a short phrase on one system, scaled up, exactly as before', () => {
    const plan = planScore(quarters(1), WIDE, 1.5)
    expect(plan.systems).toHaveLength(1)
    expect(plan.systems[0]).toHaveLength(1)
    // Four notes in a wide column: zoom is capped by maxZoom, not by the music.
    expect(plan.zoom).toBe(1.5)
  })

  it('never scales below 1, whatever the column', () => {
    const plan = planScore(quarters(1), 120, 1.5)
    expect(plan.zoom).toBe(1)
  })

  it('wraps a long chart onto several systems at 1x', () => {
    const plan = planScore(quarters(20), WIDE, 1.5)
    expect(plan.systems.length).toBeGreaterThan(1)
    expect(plan.zoom).toBe(1)
    expect(plan.logicalWidth).toBe(WIDE)
  })

  it('accounts for every bar exactly once, in order', () => {
    const plan = planScore(quarters(20), WIDE, 1.5)
    const starts = plan.systems.flat().map((bar) => bar.slices[0]!.start)
    expect(starts).toEqual(Array.from({ length: 20 }, (_, i) => i * 4))
  })

  it('keeps every system inside the column', () => {
    const plan = planScore(quarters(20), WIDE, 1.5)
    expect(plan.logicalWidth).toBeLessThanOrEqual(WIDE)
    for (const system of plan.systems) {
      const notes = system.reduce((total, bar) => total + bar.width, 0)
      expect(notes).toBeLessThanOrEqual(WIDE - PADDING * 2 - FIXED_WIDTH)
    }
  })

  it('gives a busy bar more room than a sparse one', () => {
    // Sixteen sixteenths against four quarters: same bar, four times the notes.
    const dense = planScore(
      phraseOfSticking(Array.from({ length: 16 }, () => 'R').join(' '), '16', FOUR_FOUR),
      WIDE,
      1.5,
    )
    const sparse = planScore(quarters(1), WIDE, 1.5)
    expect(dense.systems[0]![0]!.width).toBeGreaterThan(sparse.systems[0]![0]!.width)
  })
})
