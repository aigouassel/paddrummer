import { describe, expect, it } from 'vitest'
import { StaveNote, Tuplet, Voice } from 'vexflow'

/**
 * Guards an ordering requirement `score.ts` depends on and cannot express.
 *
 * VexFlow keeps a note's duration in two places that are updated at different
 * times. Constructing a `Tuplet` rewrites its notes' ticks in place, but a
 * `Voice` caches its own total the moment tickables are added to it. Build the
 * voice first and it is left believing a triplet group lasts half again as
 * long as it does; the formatter then spreads that voice across too much of
 * the bar. With one voice on the stave nothing looks wrong. With two, the
 * hands drift apart — a triplet lands to the right of a straight eighth that
 * is played after it.
 *
 * If a VexFlow upgrade ever makes the order stop mattering, this test fails
 * and the comment in `buildLine` can go.
 */
const QUARTER_TICKS = 4096

const threeEighths = () => [0, 1, 2].map(() => new StaveNote({ keys: ['c/5'], duration: '8' }))

describe('VexFlow tick bookkeeping is order-dependent', () => {
  it('rewrites a note s ticks when the tuplet is constructed', () => {
    const notes = threeEighths()
    expect(notes[0]!.getTicks().value()).toBe(QUARTER_TICKS / 2)
    new Tuplet(notes, { numNotes: 3, notesOccupied: 2 })
    expect(notes[0]!.getTicks().value()).toBeCloseTo(QUARTER_TICKS / 3, 6)
  })

  it('counts one beat when the voice is built after the tuplet', () => {
    const notes = threeEighths()
    new Tuplet(notes, { numNotes: 3, notesOccupied: 2 })
    const voice = new Voice().setMode(Voice.Mode.SOFT).addTickables(notes)
    expect(voice.getTicksUsed().value()).toBe(QUARTER_TICKS)
  })

  it('counts a beat and a half when the voice is built first — the bug', () => {
    const notes = threeEighths()
    const voice = new Voice().setMode(Voice.Mode.SOFT).addTickables(notes)
    new Tuplet(notes, { numNotes: 3, notesOccupied: 2 })
    expect(voice.getTicksUsed().value()).toBe(QUARTER_TICKS * 1.5)
  })
})
