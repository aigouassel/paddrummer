import { describe, expect, it } from 'vitest'
import { StaveNote, Tuplet, Voice } from 'vexflow'
import { toVexDuration } from './vexDuration'
import { toNumber } from '@paddrummer/core/fraction'
import { isRest } from '@paddrummer/core/phrase'
import { BOOK_PAGES_BY_NUMBER } from '@paddrummer/stick-control'

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

/**
 * The same bookkeeping, over the bars that need a bracket VexFlow has to be
 * told the shape of. A quintuplet's ratio is 5:4 and an octuplet's 8:6, and
 * getting either wrong leaves the voice believing the bar is a different
 * length than it is — which the domain would never notice, because the domain
 * does its own arithmetic in fractions and is right by construction.
 *
 * This builds a line the way `score.ts` does, tuplets before voice, and asks
 * VexFlow how long it came out.
 */
describe('VexFlow measures a bracketed bar the same as the domain does', () => {
  const vexBeats = (page: number, n: number): number => {
    const events = BOOK_PAGES_BY_NUMBER.get(page)!
      .exercises.find((exercise) => exercise.n === n)!
      .phrase.lines[0]!.events

    // The `d` suffix is what carries a dotted note's ticks, so the dot glyphs
    // `score.ts` also attaches make no difference to the length asked about here.
    const notes = events.map((event) => {
      const { duration } = toVexDuration(event.duration)
      return new StaveNote({
        keys: ['c/5'],
        duration: `${duration}${isRest(event) ? 'r' : ''}`,
      })
    })

    let run: StaveNote[] = []
    let ratio: { numNotes: number; notesOccupied: number } | null = null
    events.forEach((event, index) => {
      const { tuplet } = toVexDuration(event.duration)
      if (tuplet === null) {
        run = []
        ratio = null
        return
      }
      if (ratio === null || ratio.numNotes !== tuplet.numNotes) {
        run = []
        ratio = tuplet
      }
      run.push(notes[index]!)
      if (run.length === tuplet.numNotes) {
        new Tuplet(run, tuplet)
        run = []
        ratio = null
      }
    })

    const voice = new Voice().setMode(Voice.Mode.SOFT).addTickables(notes)
    return voice.getTicksUsed().value() / QUARTER_TICKS
  }

  const domainBeats = (page: number, n: number): number =>
    toNumber(
      BOOK_PAGES_BY_NUMBER.get(page)!.exercises.find((exercise) => exercise.n === n)!.phrase.beats,
    )

  it.each([
    ['page 25, eight sixteenths in the space of six', 25, 13],
    ['page 26, the same, in doubles', 26, 1],
    ['page 42, five eighths in the space of four', 42, 1],
    ['page 42, six in the space of four', 42, 17],
    ['page 33, a triplet inside a beat', 33, 1],
  ])('agrees about %s', (_name, page, n) => {
    expect(vexBeats(page as number, n as number)).toBeCloseTo(domainBeats(page as number, n as number), 6)
  })

  it('is not fooled by a dot either', () => {
    expect(vexBeats(34, 7)).toBeCloseTo(domainBeats(34, 7), 6)
  })
})
