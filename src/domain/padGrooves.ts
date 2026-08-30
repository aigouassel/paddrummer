import { QUARTER } from './duration'
import type { Hand, StickPart, Stroke } from './pattern'
import { type PhraseLine, isRest, line, phraseOfLines } from './phrase'
import type { Piece } from './piece'

/**
 * Kit grooves voiced on a single practice pad, transcribed from video.
 *
 * A pad has one sound, so a groove has to be faked by hitting it two ways: the
 * butt of an inverted stick for the bass drum, the shoulder of the other laid
 * across the head for the snare. That is why these are the first pieces to use
 * `StickPart` — the hand no longer tells you what the note is meant to be.
 *
 * They are two-line phrases for the ordinary reason: each hand keeps its own
 * rhythm and both can fall on the same beat, which is the same shape as the
 * independence studies. The bass line is the lower voice, as it would be on a
 * drum-kit chart, and it happens to be the left hand here.
 *
 * How the reading was done, and what it cost, is in
 * docs/transcribing-video.md. The short version: the rhythm comes from fitting
 * a grid to the audio, the sticking from reading video frames at the times
 * that grid points to. Nothing here is inferred from a rule that was not first
 * checked against the frames — the same doctrine the Stick Control pages use,
 * and the reason this file stops where it does.
 */

/** Where a transcribed piece came from, so it can be checked rather than trusted. */
export type VideoRef = {
  /** The clip, under assets/videos/ (gitignored, like the book photographs). */
  file: string
  title: string
  author: string
  /** Seconds into the clip where the transcribed passage starts. */
  from: number
  to: number
}

export type PadGroove = Piece & {
  at: VideoRef
  /** Beats per minute the clip was played at. */
  bpm: number
}

const SOURCE = {
  file: 'd_sp7QIH3Oo.mp4',
  title: 'How to play drum grooves on a practice pad',
  author: "Grahame O'Shea",
} as const

/** Stamps every stroke on a line with the part of the stick that sounds it. */
function voiced(part: StickPart, phraseLine: PhraseLine): PhraseLine {
  return {
    ...phraseLine,
    events: phraseLine.events.map((event) =>
      isRest(event) ? event : ({ ...event, part } satisfies Stroke)),
  }
}

const voice = (hand: Hand, part: StickPart, spec: string): PhraseLine =>
  voiced(part, line(hand, spec, QUARTER))

/**
 * The opening groove, quarter notes, two bars.
 *
 * Read stroke by stroke off the frames and then confirmed by predicting the
 * repeat: every stroke below was seen twice, eight beats apart, at 2.60-8.20s.
 * The grid also showed a soft reading on the beats written here as rests, but
 * the pad is empty in every frame at those moments, so they are the previous
 * stroke ringing rather than notes.
 */
const OPENING: PadGroove = {
  id: 'pad-groove-quarters',
  name: 'Pad Groove — quarters',
  bpm: 150,
  at: { ...SOURCE, from: 1.86, to: 8.66 },
  phrase: phraseOfLines([4, 4], [
    voice('R', 'shoulder', '-  -  x  - | -  -  x  -'),
    voice('L', 'butt',     'x  -  -  x | -  x  -  -'),
  ]),
  note:
    'Butt of the stick for the bass drum, shoulder of the stick for the snare. ' +
    'The snare falls on beat 3 of both bars; the bass carries the syncopation.',
}

export const PAD_GROOVES: readonly PadGroove[] = [OPENING]

export const PAD_GROOVES_BY_ID: ReadonlyMap<string, PadGroove> = new Map(
  PAD_GROOVES.map((groove) => [groove.id, groove]),
)
