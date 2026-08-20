import { type Fraction, ZERO, add, toNumber } from './fraction'
import { toBeats } from './duration'
import type { Hand, Stroke } from './pattern'

/**
 * A single sounding note, placed in time.
 *
 * Note the split: `strokeIndex` says which Stroke this note belongs to, and
 * `kind` says whether it is the note the player aims at or one of its
 * ornaments. Scoring only ever looks at `kind === 'main'`; the audio engine
 * plays both.
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
  strokes: readonly Stroke[],
  bpm: number,
  options: TimelineOptions = {},
): TimedNote[] {
  if (bpm <= 0) throw new Error(`toTimeline: bpm must be positive, got ${bpm}`)

  const { startSec = 0, graceSpacingSec = DEFAULT_GRACE_SPACING_SEC } = options
  const secondsPerBeat = 60 / bpm
  const notes: TimedNote[] = []

  // Position accumulates as an exact fraction and is converted to seconds
  // once per stroke, so a long pattern of triplets cannot drift.
  let position: Fraction = ZERO

  strokes.forEach((stroke, strokeIndex) => {
    const timeSec = startSec + toNumber(position) * secondsPerBeat
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
    position = add(position, toBeats(stroke.duration))
  })

  return notes
}

/**
 * The times the player is judged against: one per Stroke, ornaments excluded.
 * This is a one-line function precisely because grace notes live on the stroke
 * rather than beside it.
 */
export const expectedHitTimes = (
  strokes: readonly Stroke[],
  bpm: number,
  options: TimelineOptions = {},
): number[] =>
  toTimeline(strokes, bpm, options)
    .filter((note) => note.kind === 'main')
    .map((note) => note.timeSec)
