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
