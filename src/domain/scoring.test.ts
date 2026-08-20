import { describe, expect, it } from 'vitest'
import { DEFAULT_WINDOWS, estimateLatency, judge, median, type Hit } from './scoring'
import { expectedHits } from './timeline'
import { fullCycle, sticking } from './pattern'
import { RUDIMENTS_BY_ID } from './rudiments'

const paradiddle = () => expectedHits(fullCycle(RUDIMENTS_BY_ID.get('single-paradiddle')!), 120)

/** Plays the pattern exactly, optionally shifted by a constant. */
const perfectRun = (offsetSec = 0): Hit[] =>
  paradiddle().map((e) => ({ timeSec: e.timeSec + offsetSec, hand: e.hand }))

describe('median', () => {
  it('is robust to a single wild value, where the mean is not', () => {
    const values = [0.01, 0.012, 0.011, 0.013, 5]
    expect(median(values)).toBeCloseTo(0.012, 6)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    expect(mean).toBeGreaterThan(0.9)
  })

  it('averages the middle pair when the count is even', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })

  it('returns null with nothing to average', () => {
    expect(median([])).toBeNull()
  })
})

describe('judge', () => {
  it('scores a flawless run', () => {
    const { summary } = judge(paradiddle(), perfectRun())
    expect(summary.perfect).toBe(8)
    expect(summary.missed).toBe(0)
    expect(summary.extra).toBe(0)
    expect(summary.accuracy).toBe(1)
    expect(summary.medianOffsetSec).toBe(0)
  })

  it('grades by distance from the beat', () => {
    const expected = paradiddle()
    const hits: Hit[] = [
      { timeSec: expected[0]!.timeSec + 0.01 }, // inside perfect
      { timeSec: expected[1]!.timeSec + 0.03 }, // inside close
      { timeSec: expected[2]!.timeSec + 0.08 }, // still matched, but loose
    ]
    const { judgments } = judge(expected, hits)
    expect(judgments.slice(0, 3).map((j) => j.grade)).toEqual(['perfect', 'close', 'loose'])
  })

  it('reports lateness as a positive offset', () => {
    const { summary } = judge(paradiddle(), perfectRun(0.03))
    expect(summary.medianOffsetSec).toBeCloseTo(0.03, 6)
  })

  it('marks a note with no strike as missed, not as an error elsewhere', () => {
    const expected = paradiddle()
    const hits = perfectRun().filter((_, i) => i !== 3)
    const { judgments, summary } = judge(expected, hits)
    expect(summary.missed).toBe(1)
    expect(judgments[3]!.grade).toBe('missed')
    expect(judgments[3]!.hitSec).toBeNull()
    // The surrounding notes are untouched.
    expect(judgments[2]!.grade).toBe('perfect')
    expect(judgments[4]!.grade).toBe('perfect')
  })

  it('collects strikes that belong to no note', () => {
    const expected = paradiddle()
    const hits = [...perfectRun(), { timeSec: expected[0]!.timeSec + 0.06 }]
    const { summary, extraHits } = judge(expected, hits)
    expect(summary.extra).toBe(1)
    expect(extraHits[0]!.timeSec).toBeCloseTo(expected[0]!.timeSec + 0.06, 6)
  })

  it('does not let one wild strike cascade into the following notes', () => {
    // A strike falling between notes 0 and 1 must not steal note 1's hit and
    // push every later note onto the wrong strike.
    const expected = paradiddle()
    const hits: Hit[] = [
      { timeSec: expected[0]!.timeSec - 0.09 },
      ...perfectRun().slice(1),
    ]
    const { judgments, summary } = judge(expected, hits)
    expect(judgments.slice(1).every((j) => j.grade === 'perfect')).toBe(true)
    expect(summary.missed).toBe(0)
  })

  it('catches the classic sticking error while the timing is flawless', () => {
    // RLRL played where RLRR was written: every note on time, two wrong hands.
    const expected = paradiddle()
    const wrong = sticking('R L R L L R L R')
    const hits: Hit[] = expected.map((e, i) => ({
      timeSec: e.timeSec,
      hand: wrong[i]!.hand,
    }))
    const { summary } = judge(expected, hits)
    expect(summary.accuracy).toBe(1)
    expect(summary.perfect).toBe(8)
    expect(summary.handErrors).toBe(2)
  })

  it('leaves hand correctness unknown when the source cannot tell', () => {
    const { judgments, summary } = judge(
      paradiddle(),
      paradiddle().map((e) => ({ timeSec: e.timeSec })),
    )
    expect(judgments.every((j) => j.handCorrect === null)).toBe(true)
    expect(summary.handErrors).toBe(0)
  })

  it('judges nothing played as all missed rather than throwing', () => {
    const { summary } = judge(paradiddle(), [])
    expect(summary.missed).toBe(8)
    expect(summary.accuracy).toBe(0)
    expect(summary.medianOffsetSec).toBeNull()
  })

  it('ignores grace notes as targets', () => {
    // A flam is one target even though two notes sound.
    const flams = expectedHits(fullCycle(RUDIMENTS_BY_ID.get('flam-tap')!), 100)
    expect(flams).toHaveLength(4)
    const { summary } = judge(flams, flams.map((e) => ({ timeSec: e.timeSec, hand: e.hand })))
    expect(summary.perfect).toBe(4)
    expect(summary.extra).toBe(0)
  })

  it('respects tightened windows', () => {
    const strict = { ...DEFAULT_WINDOWS, perfectSec: 0.005 }
    const { summary } = judge(paradiddle(), perfectRun(0.01), strict)
    expect(summary.perfect).toBe(0)
    expect(summary.close).toBe(8)
  })
})

describe('estimateLatency', () => {
  const clicks = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]

  it('recovers a constant delay', () => {
    const taps = clicks.map((c) => c + 0.042)
    const estimate = estimateLatency(clicks, taps)
    expect(estimate.offsetSec).toBeCloseTo(0.042, 6)
    expect(estimate.samples).toBe(8)
    expect(estimate.spreadSec).toBeCloseTo(0, 6)
  })

  it('survives one fumbled tap', () => {
    const taps = clicks.map((c, i) => c + (i === 3 ? 0.2 : 0.04))
    expect(estimateLatency(clicks, taps).offsetSec).toBeCloseTo(0.04, 6)
  })

  it('reports the spread so an unreliable calibration can be rejected', () => {
    const sloppy = clicks.map((c, i) => c + 0.04 + (i % 2 === 0 ? 0.05 : -0.05))
    const steady = clicks.map((c) => c + 0.04)
    expect(estimateLatency(clicks, sloppy).spreadSec).toBeGreaterThan(
      estimateLatency(clicks, steady).spreadSec,
    )
  })

  it('skips clicks nobody answered rather than counting them as zero', () => {
    const taps = [0.04, 0.54, 3.04]
    const estimate = estimateLatency(clicks, taps)
    expect(estimate.samples).toBe(3)
    expect(estimate.offsetSec).toBeCloseTo(0.04, 6)
  })

  it('returns a neutral estimate when nothing was tapped', () => {
    expect(estimateLatency(clicks, [])).toEqual({ offsetSec: 0, samples: 0, spreadSec: 0 })
  })
})
