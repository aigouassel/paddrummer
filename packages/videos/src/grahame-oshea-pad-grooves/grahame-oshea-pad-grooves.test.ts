import { describe, expect, it } from 'vitest'
import {
  GROOVE_SECTIONS,
  GROOVE_SECTIONS_BY_ID,
  PAD_GROOVE,
  playedTimes,
} from './grahame-oshea-pad-grooves'
import { barBeats, isRest, placedStrokes } from '@paddrummer/core/phrase'
import { toNumber } from '@paddrummer/core/fraction'
import { RUDIMENTS } from '@paddrummer/rudiments'
import { BOOK_PAGES } from '@paddrummer/stick-control'
import { STUDIES } from '@paddrummer/exercises/studies'

describe('pad grooves', () => {
  it.each(GROOVE_SECTIONS)('$id fills a whole number of bars', (groove) => {
    // The same arithmetic that guards the book transcriptions. A misread
    // rhythm cannot fill its metre, so this fails loudly where a misread
    // sticking would not.
    const bar = toNumber(barBeats(groove.phrase.meter!))
    const total = toNumber(groove.phrase.beats)
    expect(total % bar).toBeCloseTo(0, 9)
    expect(total).toBeGreaterThan(0)
  })

  it('says which part of the stick sounds every note of the chart', () => {
    // A piece that distinguishes voices has to do so everywhere: a stroke with
    // no part would be read as "not modelled", which would be a lie here.
    for (const { stroke } of placedStrokes(PAD_GROOVE.phrase)) {
      expect(stroke.part).toBeDefined()
    }
  })

  it('keeps the two voices on their own lines', () => {
    const groove = GROOVE_SECTIONS_BY_ID.get('pad-groove-quarters')!
    const [snare, bass] = groove.phrase.lines
    expect(snare!.hand).toBe('R')
    expect(bass!.hand).toBe('L')
    for (const event of snare!.events) {
      if (!isRest(event)) expect(event.part).toBe('shoulder')
    }
    for (const event of bass!.events) {
      if (!isRest(event)) expect(event.part).toBe('butt')
    }
  })

  /**
   * Spot checks, in the sense the Stick Control tests use them: the rhythm is
   * proved by arithmetic, so these pin the part no arithmetic can check. Each
   * beat below was read off a named video frame and then seen again on the
   * repeat eight beats later.
   */
  it('places the strokes where the frames put them', () => {
    const groove = GROOVE_SECTIONS_BY_ID.get('pad-groove-quarters')!
    const at = placedStrokes(groove.phrase).map((placed) => ({
      beat: toNumber(placed.atBeat),
      part: placed.stroke.part,
    }))
    // Bar 1: bass on 1 and 4, snare on 3.  Bar 2: bass on 2, snare on 3.
    expect(at.filter((s) => s.part === 'butt').map((s) => s.beat).sort((a, b) => a - b))
      .toEqual([0, 3, 5])
    expect(at.filter((s) => s.part === 'shoulder').map((s) => s.beat).sort((a, b) => a - b))
      .toEqual([2, 6])
    expect(at).toHaveLength(5)
  })

  it('says how much of each piece was actually seen', () => {
    // A piece whose sticking is conventional rather than observed has to admit
    // it where a reader will meet it, not only in a doc.
    for (const groove of GROOVE_SECTIONS) {
      if (groove.reading === 'rhythm') {
        expect(groove.note, `${groove.id} must explain its sticking`).toMatch(
          /sticking|lead hand|conventional/i,
        )
      }
    }
    expect(GROOVE_SECTIONS.filter((g) => g.reading === 'frames')).toHaveLength(1)
  })

  it('covers the clip end to end without gaps or overlaps', () => {
    // The point of "transcribe it fully": every second of playing is in one
    // piece or another, in order.
    const spans = [...GROOVE_SECTIONS].sort((a, b) => a.at.from - b.at.from)
    expect(spans[0]!.at.from).toBeLessThan(2.0)
    expect(spans[spans.length - 1]!.at.to).toBeGreaterThan(33)
    spans.forEach((groove, i) => {
      if (i > 0) expect(groove.at.from).toBeCloseTo(spans[i - 1]!.at.to, 2)
    })
  })

  it('subdivides each section the way the recording measures', () => {
    const beatsOf = (id: string) => {
      const phrase = GROOVE_SECTIONS_BY_ID.get(id)!.phrase
      return { beats: toNumber(phrase.beats), strokes: placedStrokes(phrase).length }
    }
    // Two bars of quarters, then the same filled twice over.
    expect(beatsOf('pad-groove-quarters')).toEqual({ beats: 8, strokes: 5 })
    expect(beatsOf('pad-groove-eighths')).toEqual({ beats: 8, strokes: 16 })
    // One bar of sixteenths, less the two after the backbeat.
    expect(beatsOf('pad-groove-sixteenths')).toEqual({ beats: 4, strokes: 14 })
    expect(beatsOf('pad-groove-sixteenths-switched')).toEqual({ beats: 4, strokes: 14 })
    // Sextuplets: three strokes a hand, one triple to each eighth.
    expect(beatsOf('pad-triple-stroke-roll')).toEqual({ beats: 4, strokes: 24 })
  })

  it('alternates hands through the sixteenth fills', () => {
    for (const id of ['pad-groove-sixteenths', 'pad-groove-sixteenths-switched']) {
      const hands = placedStrokes(GROOVE_SECTIONS_BY_ID.get(id)!.phrase)
        .sort((a, b) => toNumber(a.atBeat) - toNumber(b.atBeat))
        .map((placed) => placed.stroke.hand)
      hands.forEach((hand, i) => {
        if (i > 0) expect(hand, `${id} repeats a hand at stroke ${i}`).not.toBe(hands[i - 1])
      })
    }
  })

  it('groups the roll three strokes to a hand', () => {
    const hands = placedStrokes(GROOVE_SECTIONS_BY_ID.get('pad-triple-stroke-roll')!.phrase)
      .sort((a, b) => toNumber(a.atBeat) - toNumber(b.atBeat))
      .map((placed) => placed.stroke.hand)
      .join('')
    expect(hands).toBe('RRRLLL'.repeat(4))
  })

  it('records where it was read from', () => {
    for (const groove of GROOVE_SECTIONS) {
      expect(groove.at.file).toMatch(/\.(mp4|mov|webm)$/)
      expect(groove.at.to).toBeGreaterThan(groove.at.from)
    }
    expect(PAD_GROOVE.at.file).toMatch(/\.(mp4|mov|webm)$/)
    expect(PAD_GROOVE.bpm).toBeGreaterThan(0)
  })
})

/**
 * The chart against the grid map.
 *
 * `grid.json`'s README reads the clip as bars 2–5 the quarter-note groove, 6–9
 * filled with eighths, 10–15 with sixteenths, 16–17 the triple stroke roll and
 * 18–21 the sixteenths with the hands switched. Writing those bars out is only
 * honest if the written music actually fits them, which is what this checks:
 * the arithmetic has to close, or a repeat count was invented.
 */
describe('the chart matches the measured grid', () => {
  it.each(GROOVE_SECTIONS)('$id repeats a whole number of times', (section) => {
    const times = playedTimes(section)
    expect(Number.isInteger(times), `${section.id} plays ${times} times`).toBe(true)
    expect(times).toBeGreaterThan(0)
  })

  it('tiles bars 2 to 21 with no gap and no overlap', () => {
    const spans = [...GROOVE_SECTIONS].sort((a, b) => a.bars[0] - b.bars[0])
    expect(spans[0]!.bars[0]).toBe(2)
    expect(spans[spans.length - 1]!.bars[1]).toBe(21)
    spans.forEach((section, i) => {
      if (i > 0) expect(section.bars[0]).toBe(spans[i - 1]!.bars[1] + 1)
    })
  })

  it('is twenty bars long', () => {
    const bar = toNumber(barBeats(PAD_GROOVE.phrase.meter!))
    expect(toNumber(PAD_GROOVE.phrase.beats) / bar).toBe(20)
  })

  it('lasts as long as the passage it was read from', () => {
    // 20 bars of 4/4 at 150bpm is 32.0s; the clip's transcribed passage runs
    // 1.86 to 33.84. If these ever drift apart, a section is the wrong length.
    const seconds = (toNumber(PAD_GROOVE.phrase.beats) * 60) / PAD_GROOVE.bpm
    expect(seconds).toBeCloseTo(PAD_GROOVE.at.to - PAD_GROOVE.at.from, 1)
  })

  it('marks each section over the bar it opens', () => {
    expect(PAD_GROOVE.phrase.sections?.map((s) => [toNumber(s.at), s.label])).toEqual([
      [0, 'the groove'],
      [16, 'fill in gaps with 8ths'],
      [32, 'or…. 16ths'],
      [56, 'triple stroke roll'],
      [64, 'switch hands'],
    ])
  })
})

/**
 * The contract that makes `part` optional safe: absent means "this piece does
 * not distinguish", never "shoulder". If a default ever creeps in, or the
 * field gets set on material that has no second voice, this is what notices.
 */
describe('stick part stays absent where a piece does not voice two drums', () => {
  it('is unset on every rudiment, study and book exercise', () => {
    const strokes = [
      ...RUDIMENTS.flatMap((r) => r.pattern),
      ...STUDIES.flatMap((p) => placedStrokes(p.phrase).map((s) => s.stroke)),
      ...BOOK_PAGES.flatMap((page) =>
        page.exercises.flatMap((ex) => placedStrokes(ex.phrase).map((s) => s.stroke))),
    ]
    expect(strokes.length).toBeGreaterThan(1000)
    expect(strokes.filter((s) => s.part !== undefined)).toEqual([])
  })
})
