import { toNumber } from './fraction'
import type { Hand } from './pattern'
import { type Phrase, placedStrokes } from './phrase'

/**
 * A single sounding note, placed in time.
 *
 * Note the split: `strokeIndex` says which stroke this note belongs to, and
 * `kind` says whether it is the note the player aims at or one of its
 * ornaments. Scoring only ever looks at `kind === 'main'`; the audio engine
 * plays both.
 *
 * `strokeIndex` counts through the phrase in playing order, across both hands
 * when there are two — the same order the notation layer numbers its notes in,
 * so the playhead and the scorer agree without either knowing about lines.
 */
export type TimedNote = {
  timeSec: number
  hand: Hand
  kind: 'main' | 'grace'
  accent: boolean
  buzz: boolean
  strokeIndex: number
}

/**
 * How long before its main note a grace note sounds.
 *
 * This is deliberately an absolute time, not a subdivision. A drummer's flam
 * has a roughly constant width — the grace note stays about a 30th of a second
 * ahead whether the piece is at 60bpm or 180bpm — because the width is set by
 * the height difference between the two sticks, not by the tempo. Scaling it
 * with the beat would make fast flams collapse into a single thud and slow
 * flams sound like two separate notes.
 */
export const DEFAULT_GRACE_SPACING_SEC = 0.03

export type TimelineOptions = {
  startSec?: number
  graceSpacingSec?: number
}

export function toTimeline(
  phrase: Phrase,
  bpm: number,
  options: TimelineOptions = {},
): TimedNote[] {
  if (bpm <= 0) throw new Error(`toTimeline: bpm must be positive, got ${bpm}`)

  const { startSec = 0, graceSpacingSec = DEFAULT_GRACE_SPACING_SEC } = options
  const secondsPerBeat = 60 / bpm
  const notes: TimedNote[] = []

  // Each stroke already carries its position as an exact fraction of a beat,
  // converted to seconds once, here. Nothing accumulates in floating point, so
  // a long pattern of triplets cannot drift out of line with the metronome.
  placedStrokes(phrase).forEach(({ stroke, atBeat }, strokeIndex) => {
    const timeSec = startSec + toNumber(atBeat) * secondsPerBeat
    const accent = stroke.accent ?? false
    const buzz = stroke.buzz ?? false

    const grace = stroke.grace ?? []
    grace.forEach((hand, i) => {
      // Ornaments are laid out backwards from the main note, so the last
      // grace note always sits one spacing ahead of the beat regardless of
      // whether this is a flam (one) or a drag (two).
      const lead = (grace.length - i) * graceSpacingSec
      notes.push({
        timeSec: timeSec - lead,
        hand,
        kind: 'grace',
        accent: false,
        buzz: false,
        strokeIndex,
      })
    })

    notes.push({ timeSec, hand: stroke.hand, kind: 'main', accent, buzz, strokeIndex })
  })

  // Two hands are merged by beat, but a grace note is pushed *earlier* than
  // its main note, so emission order is not time order once ornaments exist.
  return notes.sort((a, b) => a.timeSec - b.timeSec)
}

/** A note the player is expected to hit, and with which hand. */
export type ExpectedHit = {
  strokeIndex: number
  timeSec: number
  hand: Hand
  accent: boolean
}

/**
 * What the player is judged against: one entry per Stroke, ornaments excluded.
 * Grace notes are decorations of a stroke, not separate targets — nobody is
 * marked down for the placement of a flam's grace note.
 */
export const expectedHits = (
  phrase: Phrase,
  bpm: number,
  options: TimelineOptions = {},
): ExpectedHit[] =>
  toTimeline(phrase, bpm, options)
    .filter((note) => note.kind === 'main')
    .map((note) => ({
      strokeIndex: note.strokeIndex,
      timeSec: note.timeSec,
      hand: note.hand,
      accent: note.accent,
    }))

/**
 * Just the times, for callers that do not care which hand.
 */
export const expectedHitTimes = (
  phrase: Phrase,
  bpm: number,
  options: TimelineOptions = {},
): number[] =>
  toTimeline(phrase, bpm, options)
    .filter((note) => note.kind === 'main')
    .map((note) => note.timeSec)
