import { describe, expect, it } from 'vitest'
import { PAD_GROOVES, PAD_GROOVES_BY_ID } from './padGrooves'
import { barBeats, isRest, placedStrokes } from './phrase'
import { toNumber } from './fraction'
import { RUDIMENTS } from './rudiments'
import { BOOK_PAGES } from './stickControl'
import { STUDIES } from './studies'

describe('pad grooves', () => {
  it.each(PAD_GROOVES)('$id fills a whole number of bars', (groove) => {
    // The same arithmetic that guards the book transcriptions. A misread
    // rhythm cannot fill its metre, so this fails loudly where a misread
    // sticking would not.
    const bar = toNumber(barBeats(groove.phrase.meter!))
    const total = toNumber(groove.phrase.beats)
    expect(total % bar).toBeCloseTo(0, 9)
    expect(total).toBeGreaterThan(0)
  })

  it.each(PAD_GROOVES)('$id says which part of the stick sounds every note', (groove) => {
    // A piece that distinguishes voices has to do so everywhere: a stroke with
    // no part would be read as "not modelled", which would be a lie here.
    for (const { stroke } of placedStrokes(groove.phrase)) {
      expect(stroke.part, `${groove.id} has a stroke with no stick part`).toBeDefined()
    }
  })

  it('keeps the two voices on their own lines', () => {
    const groove = PAD_GROOVES_BY_ID.get('pad-groove-quarters')!
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
    const groove = PAD_GROOVES_BY_ID.get('pad-groove-quarters')!
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
    for (const groove of PAD_GROOVES) {
      if (groove.reading === 'rhythm') {
        expect(groove.note, `${groove.id} must explain its sticking`).toMatch(
          /sticking|lead hand|conventional/i,
        )
      }
    }
    expect(PAD_GROOVES.filter((g) => g.reading === 'frames')).toHaveLength(1)
  })

  it('covers the clip end to end without gaps or overlaps', () => {
    // The point of "transcribe it fully": every second of playing is in one
    // piece or another, in order.
    const spans = [...PAD_GROOVES].sort((a, b) => a.at.from - b.at.from)
    expect(spans[0]!.at.from).toBeLessThan(2.0)
    expect(spans[spans.length - 1]!.at.to).toBeGreaterThan(33)
    spans.forEach((groove, i) => {
      if (i > 0) expect(groove.at.from).toBeCloseTo(spans[i - 1]!.at.to, 2)
    })
  })

  it('subdivides each section the way the recording measures', () => {
    const beatsOf = (id: string) => {
      const phrase = PAD_GROOVES_BY_ID.get(id)!.phrase
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
      const hands = placedStrokes(PAD_GROOVES_BY_ID.get(id)!.phrase)
        .sort((a, b) => toNumber(a.atBeat) - toNumber(b.atBeat))
        .map((placed) => placed.stroke.hand)
      hands.forEach((hand, i) => {
        if (i > 0) expect(hand, `${id} repeats a hand at stroke ${i}`).not.toBe(hands[i - 1])
      })
    }
  })

  it('groups the roll three strokes to a hand', () => {
    const hands = placedStrokes(PAD_GROOVES_BY_ID.get('pad-triple-stroke-roll')!.phrase)
      .sort((a, b) => toNumber(a.atBeat) - toNumber(b.atBeat))
      .map((placed) => placed.stroke.hand)
      .join('')
    expect(hands).toBe('RRRLLL'.repeat(4))
  })

  it('records where it was read from', () => {
    for (const groove of PAD_GROOVES) {
      expect(groove.at.file).toMatch(/\.(mp4|mov|webm)$/)
      expect(groove.at.to).toBeGreaterThan(groove.at.from)
      expect(groove.bpm).toBeGreaterThan(0)
    }
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
