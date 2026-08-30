import { beforeEach, describe, expect, it } from 'vitest'
import { Sequencer } from './sequencer'
import { phraseOfStrokes } from '@paddrummer/core/phrase'
import { sticking } from '@paddrummer/core/pattern'
import type { TimedNote } from '@paddrummer/core/timeline'

/** Drives the sequencer from a fake clock, collecting what it emits. */
const drive = (seq: Sequencer, from: number, to: number, stepSec = 0.025) => {
  const emitted: TimedNote[] = []
  for (let t = from; t <= to; t += stepSec) seq.tick(t, (n) => emitted.push(n))
  return emitted
}

describe('Sequencer', () => {
  let seq: Sequencer

  beforeEach(() => {
    seq = new Sequencer(0.12)
    seq.setPattern(phraseOfStrokes(sticking('R L R R'))) // four 16ths
    seq.setTempo(120) // 0.5s per beat, so 0.125s per note, 0.5s per cycle
  })

  it('emits nothing before it is started', () => {
    expect(drive(seq, 0, 1)).toHaveLength(0)
  })

  it('only emits notes inside the lookahead window', () => {
    seq.start(0)
    const emitted: TimedNote[] = []
    seq.tick(0, (n) => emitted.push(n))
    // Window is 0.12s, notes sit at 0, 0.125, 0.25... so only the first is due.
    expect(emitted.map((n) => n.timeSec)).toEqual([0])
  })

  it('emits each note exactly once, however often it is ticked', () => {
    seq.start(0)
    const dense = drive(seq, 0, 2, 0.001)
    const sparse = new Sequencer(0.12)
    sparse.setPattern(phraseOfStrokes(sticking('R L R R')))
    sparse.setTempo(120)
    sparse.start(0)
    const coarse = drive(sparse, 0, 2, 0.05)

    expect(dense.map((n) => n.timeSec)).toEqual(coarse.map((n) => n.timeSec))
    expect(new Set(dense.map((n) => n.timeSec)).size).toBe(dense.length)
  })

  it('loops, advancing the cycle start by exactly one cycle', () => {
    seq.start(0)
    const times = drive(seq, 0, 1.1).map((n) => n.timeSec)
    expect(times.slice(0, 8)).toEqual([0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875])
  })

  it('emits in non-decreasing time order', () => {
    seq.setPattern(phraseOfStrokes(sticking('l>R L r>L R'))) // flams, whose grace notes precede the beat
    seq.start(0)
    const times = drive(seq, 0, 2).map((n) => n.timeSec)
    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })

  it('survives jitter in the driving timer', () => {
    seq.start(0)
    const emitted: TimedNote[] = []
    // A main thread that stalls: 5ms, then 100ms, then 5ms again.
    for (const t of [0, 0.005, 0.105, 0.11, 0.2, 0.3, 0.4, 0.5]) {
      seq.tick(t, (n) => emitted.push(n))
    }
    // Nothing dropped and nothing scheduled in the past.
    expect(emitted.map((n) => n.timeSec)).toEqual([0, 0.125, 0.25, 0.375, 0.5])
  })
})

describe('tempo changes mid-loop', () => {
  it('does not move the note already queued next', () => {
    const seq = new Sequencer(0.12)
    seq.setPattern(phraseOfStrokes(sticking('R L R R')))
    seq.setTempo(120)
    seq.start(0)
    drive(seq, 0, 0.2)

    const before = seq.nextNoteTimeSec
    seq.setTempo(60)
    expect(seq.nextNoteTimeSec).toBeCloseTo(before, 10)
  })

  it('applies the new tempo to the notes after it', () => {
    const seq = new Sequencer(0.12)
    seq.setPattern(phraseOfStrokes(sticking('R L R R')))
    seq.setTempo(120)
    seq.start(0)
    drive(seq, 0, 0.2)
    seq.setTempo(60) // half speed: 0.25s per 16th

    const times = drive(seq, 0.2, 1.5).map((n) => n.timeSec)
    const gaps = times.slice(1).map((t, i) => t - times[i]!)
    for (const gap of gaps) expect(gap).toBeCloseTo(0.25, 6)
  })

  it('never emits a note twice across a tempo change', () => {
    const seq = new Sequencer(0.12)
    seq.setPattern(phraseOfStrokes(sticking('R L R R')))
    seq.setTempo(120)
    seq.start(0)
    const all = [...drive(seq, 0, 0.3)]
    seq.setTempo(200)
    all.push(...drive(seq, 0.3, 1.5))
    expect(new Set(all.map((n) => n.timeSec.toFixed(9))).size).toBe(all.length)
  })

  it('rejects a non-positive tempo', () => {
    expect(() => new Sequencer().setTempo(0)).toThrow(/must be positive/)
  })
})

describe('cycle duration', () => {
  it('reports a full pass at the current tempo', () => {
    const seq = new Sequencer()
    seq.setPattern(phraseOfStrokes(sticking('R L R R'))) // one beat
    seq.setTempo(60)
    expect(seq.cycleDurationSec).toBeCloseTo(1, 10)
    seq.setTempo(120)
    expect(seq.cycleDurationSec).toBeCloseTo(0.5, 10)
  })
})
