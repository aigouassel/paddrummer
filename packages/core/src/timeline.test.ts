import { describe, expect, it } from 'vitest'
import { DEFAULT_GRACE_SPACING_SEC, expectedHitTimes, toTimeline } from './timeline'
import { phraseOfStrokes } from './phrase'
import { fullCycle, sticking } from './pattern'
import { RUDIMENTS_BY_ID } from '@paddrummer/rudiments'
import { SIXTEENTH_TRIPLET } from './duration'

describe('toTimeline', () => {
  it('places 16ths a sixteenth of a beat apart', () => {
    const times = expectedHitTimes(phraseOfStrokes(sticking('R L R R')), 120) // 0.5s per beat
    expect(times).toEqual([0, 0.125, 0.25, 0.375])
  })

  it('scales with tempo', () => {
    const slow = expectedHitTimes(phraseOfStrokes(sticking('R L')), 60)
    const fast = expectedHitTimes(phraseOfStrokes(sticking('R L')), 240)
    expect(slow[1]! / fast[1]!).toBeCloseTo(4, 10)
  })

  it('does not accumulate error over a bar of triplets', () => {
    const bar = sticking(Array(24).fill('R').join(' '), SIXTEENTH_TRIPLET)
    const times = expectedHitTimes(phraseOfStrokes(bar), 120)
    // Four beats at 120bpm is exactly two seconds; the 25th note would land there.
    const cycleEnd = times[23]! + (0.5 / 6)
    expect(cycleEnd).toBeCloseTo(2, 10)
  })

  it('counts one expected hit per stroke, ornaments excluded', () => {
    const drag = RUDIMENTS_BY_ID.get('double-drag-tap')!
    const strokes = fullCycle(drag)
    // Five grace notes per half-cycle, but only three notes to aim at.
    expect(expectedHitTimes(phraseOfStrokes(strokes), 100)).toHaveLength(strokes.length)
    expect(toTimeline(phraseOfStrokes(strokes), 100).length).toBeGreaterThan(strokes.length)
  })
})

describe('grace note placement', () => {
  it('puts a flam grace note just before its main note', () => {
    const notes = toTimeline(phraseOfStrokes(sticking('l>R')), 120)
    expect(notes.map((n) => n.kind)).toEqual(['grace', 'main'])
    expect(notes[0]!.hand).toBe('L')
    expect(notes[0]!.timeSec).toBeCloseTo(-DEFAULT_GRACE_SPACING_SEC, 10)
    expect(notes[1]!.timeSec).toBe(0)
  })

  it('spaces a drag so the last grace note still sits one gap ahead', () => {
    const notes = toTimeline(phraseOfStrokes(sticking('llR')), 120)
    expect(notes.map((n) => n.kind)).toEqual(['grace', 'grace', 'main'])
    expect(notes[0]!.timeSec).toBeCloseTo(-2 * DEFAULT_GRACE_SPACING_SEC, 10)
    expect(notes[1]!.timeSec).toBeCloseTo(-DEFAULT_GRACE_SPACING_SEC, 10)
  })

  it('keeps flam width constant as tempo changes, because it is a physical gap', () => {
    const width = (bpm: number) => {
      const [grace, main] = toTimeline(phraseOfStrokes(sticking('l>R')), bpm)
      return main!.timeSec - grace!.timeSec
    }
    expect(width(60)).toBeCloseTo(width(200), 10)
  })

  it('never lets a grace note collide with the previous main note', () => {
    // The fastest rudiment stroke we schedule is a 16th-note triplet. At
    // 200bpm that is 50ms, comfortably clear of the 30ms ornament gap.
    const notes = toTimeline(phraseOfStrokes(fullCycle(RUDIMENTS_BY_ID.get('flam-tap')!)), 200)
    const sorted = [...notes].sort((a, b) => a.timeSec - b.timeSec)
    expect(sorted).toEqual(notes)
  })

  it('marks accents on main notes only', () => {
    const notes = toTimeline(phraseOfStrokes(sticking('l>R')), 120)
    expect(notes.find((n) => n.kind === 'grace')!.accent).toBe(false)
    expect(notes.find((n) => n.kind === 'main')!.accent).toBe(true)
  })
})

describe('input validation', () => {
  it('rejects a non-positive tempo', () => {
    expect(() => toTimeline(phraseOfStrokes(sticking('R')), 0)).toThrow(/bpm must be positive/)
  })
})
