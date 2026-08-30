import type { Hand } from './pattern'
import type { ExpectedHit } from './timeline'

/**
 * Judging a performance against a rudiment.
 *
 * Pure functions over two lists of timestamps, so every scoring rule can be
 * tested with a synthetic hit stream — no microphone, no keyboard, no audio
 * context. That is the whole reason input is a port: the hardest logic in the
 * app never has to touch hardware to be verified.
 */

/** One strike detected from any input source. */
export type Hit = {
  /** On the audio clock, so it is directly comparable with expected times. */
  timeSec: number
  /** Absent when the source cannot tell the hands apart, as a microphone cannot. */
  hand?: Hand
  /** 0..1 where known, for judging accents later. */
  velocity?: number
}

export type Grade = 'perfect' | 'close' | 'loose' | 'missed'

export type Judgment = {
  strokeIndex: number
  expectedSec: number
  /** Null when nothing was played for this note. */
  hitSec: number | null
  /** Positive means late. Null when missed. */
  offsetSec: number | null
  grade: Grade
  /**
   * Null when the source does not report hands. False is the classic rudiment
   * error — right notes, wrong sticking — which is why it is tracked apart
   * from timing rather than folded into the grade.
   */
  handCorrect: boolean | null
}

export type ScoreReport = {
  judgments: Judgment[]
  /** Strikes that matched no expected note: flams played as two, or nerves. */
  extraHits: Hit[]
  summary: {
    total: number
    perfect: number
    close: number
    loose: number
    missed: number
    extra: number
    handErrors: number
    /** Fraction of expected notes hit within the close window, 0..1. */
    accuracy: number
    /** Positive means consistently behind the beat. Null when nothing landed. */
    medianOffsetSec: number | null
  }
}

export type ScoringWindows = {
  /** Dead on. Human perception of "together" is roughly 20ms. */
  perfectSec: number
  /** Musically acceptable. */
  closeSec: number
  /** Beyond this a strike is not this note at all, but an extra one. */
  matchSec: number
}

export const DEFAULT_WINDOWS: ScoringWindows = {
  perfectSec: 0.02,
  closeSec: 0.045,
  matchSec: 0.12,
}

const gradeFor = (offsetSec: number, windows: ScoringWindows): Grade => {
  const distance = Math.abs(offsetSec)
  if (distance <= windows.perfectSec) return 'perfect'
  if (distance <= windows.closeSec) return 'close'
  return 'loose'
}

/** Median rather than mean: one fumbled tap should not move the estimate. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/**
 * Pairs strikes with the notes they were aiming at.
 *
 * Matching is driven from the expected notes rather than from the hits, and
 * each expected note claims its nearest unclaimed strike. Driving it from the
 * hits instead would let one wild early strike claim the note that the next,
 * accurate strike belonged to, cascading the error through the rest of the bar.
 */
export function judge(
  expected: readonly ExpectedHit[],
  hits: readonly Hit[],
  windows: ScoringWindows = DEFAULT_WINDOWS,
): ScoreReport {
  const claimed = new Set<number>()
  const judgments: Judgment[] = []

  for (const target of expected) {
    let bestIndex = -1
    let bestDistance = Infinity

    hits.forEach((hit, index) => {
      if (claimed.has(index)) return
      const distance = Math.abs(hit.timeSec - target.timeSec)
      if (distance <= windows.matchSec && distance < bestDistance) {
        bestDistance = distance
        bestIndex = index
      }
    })

    if (bestIndex === -1) {
      judgments.push({
        strokeIndex: target.strokeIndex,
        expectedSec: target.timeSec,
        hitSec: null,
        offsetSec: null,
        grade: 'missed',
        handCorrect: null,
      })
      continue
    }

    claimed.add(bestIndex)
    const hit = hits[bestIndex]!
    const offsetSec = hit.timeSec - target.timeSec

    judgments.push({
      strokeIndex: target.strokeIndex,
      expectedSec: target.timeSec,
      hitSec: hit.timeSec,
      offsetSec,
      grade: gradeFor(offsetSec, windows),
      handCorrect: hit.hand === undefined ? null : hit.hand === target.hand,
    })
  }

  const extraHits = hits.filter((_, index) => !claimed.has(index))
  const landed = judgments.filter((j) => j.offsetSec !== null)
  const count = (grade: Grade) => judgments.filter((j) => j.grade === grade).length

  return {
    judgments,
    extraHits,
    summary: {
      total: judgments.length,
      perfect: count('perfect'),
      close: count('close'),
      loose: count('loose'),
      missed: count('missed'),
      extra: extraHits.length,
      handErrors: judgments.filter((j) => j.handCorrect === false).length,
      accuracy:
        judgments.length === 0 ? 0 : (count('perfect') + count('close')) / judgments.length,
      medianOffsetSec: median(landed.map((j) => j.offsetSec!)),
    },
  }
}

export type LatencyEstimate = {
  offsetSec: number
  /** How many taps were usable. Below about six, do not trust the result. */
  samples: number
  /** Spread of the middle of the distribution: how consistent the taps were. */
  spreadSec: number
}

/**
 * Measures the constant delay between a note sounding and the app seeing the
 * strike that answered it.
 *
 * Every input path has one: sound leaves the speakers late by
 * `AudioContext.outputLatency`, travels through air, and the answering strike
 * comes back through an input buffer or an event queue. The total is tens of
 * milliseconds and it is *constant*, which means it is entirely removable —
 * but only if it is measured. Left in place it makes every player look like
 * they are dragging, which is worse than useless feedback.
 *
 * A player's own bias is baked into this number too, and that is intentional:
 * what matters is that a hit that *sounded* together is *scored* together.
 */
export function estimateLatency(
  clickTimesSec: readonly number[],
  tapTimesSec: readonly number[],
  matchSec = 0.25,
): LatencyEstimate {
  const offsets: number[] = []
  const claimed = new Set<number>()

  for (const click of clickTimesSec) {
    let bestIndex = -1
    let bestDistance = Infinity
    tapTimesSec.forEach((tap, index) => {
      if (claimed.has(index)) return
      const distance = Math.abs(tap - click)
      if (distance <= matchSec && distance < bestDistance) {
        bestDistance = distance
        bestIndex = index
      }
    })
    if (bestIndex === -1) continue
    claimed.add(bestIndex)
    offsets.push(tapTimesSec[bestIndex]! - click)
  }

  const centre = median(offsets) ?? 0
  const deviations = offsets.map((offset) => Math.abs(offset - centre))

  return {
    offsetSec: centre,
    samples: offsets.length,
    spreadSec: median(deviations) ?? 0,
  }
}
