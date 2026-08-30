import { EIGHTH, QUARTER, SIXTEENTH, SIXTEENTH_TRIPLET, type Duration } from './duration'
import type { Hand, StickPart, Stroke } from './pattern'
import { type Meter, type PhraseLine, isRest, line, phraseOfLines } from './phrase'
import type { Piece } from './piece'

/**
 * Kit grooves voiced on a single practice pad, transcribed from video.
 *
 * A pad has one sound, so a groove has to be faked by hitting it two ways: the
 * butt of an inverted stick for the bass drum, the shoulder of the other laid
 * across the head for the snare. That is why these are the first pieces to use
 * `StickPart` — the hand no longer tells you what the note is meant to be.
 *
 * Except, in this video, it does. He holds the inverted stick in his left hand
 * for the whole clip and never swaps, which is visible in every frame that
 * shows both hands. So left is always the bass voice and right always the
 * snare, and `voiced` below derives the part from the hand rather than making
 * each transcription repeat it. That is an observation about this player, not
 * a rule of the notation: another clip could flip a stick mid-phrase, and then
 * the part would have to be written out.
 *
 * Two lines, bass below and snare above, as a drum-kit chart would. Nothing
 * here is ever two strokes at once — a pad cannot be — so the lines are a way
 * of showing the voicing, not independence.
 *
 * How the reading was done, and where it ran out, is in
 * docs/transcribing-video.md.
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

/**
 * How much of a transcription was actually seen.
 *
 * `frames` — every stroke was read off a named video frame.
 * `rhythm` — the rhythm, the voicing and the section are read, but which hand
 *   plays each stroke inside a fill is a conventional sticking rather than an
 *   observation: a sixteenth at this tempo is three frames, and the strokes
 *   are not separable. Pieces marked this way say so in their note.
 */
export type Reading = 'frames' | 'rhythm'

export type PadGroove = Piece & {
  at: VideoRef
  /** Beats per minute the clip was played at. */
  bpm: number
  reading: Reading
}

const SOURCE = {
  file: 'd_sp7QIH3Oo.mp4',
  title: 'How to play drum grooves on a practice pad',
  author: "Grahame O'Shea",
} as const

const PART: Record<Hand, StickPart> = { L: 'butt', R: 'shoulder' }

/** Stamps each stroke with the part of the stick that hand is holding. */
function voiced(phraseLine: PhraseLine): PhraseLine {
  return {
    ...phraseLine,
    events: phraseLine.events.map((event) =>
      isRest(event) ? event : ({ ...event, part: PART[event.hand] } satisfies Stroke)),
  }
}

const voice = (hand: Hand, spec: string, duration: Duration): PhraseLine =>
  voiced(line(hand, spec, duration))

const groove = (
  meter: Meter,
  duration: Duration,
  snare: string,
  bass: string,
): Piece['phrase'] =>
  phraseOfLines(meter, [voice('R', snare, duration), voice('L', bass, duration)])

const FOUR_FOUR: Meter = [4, 4]

/**
 * The opening groove, quarter notes, two bars.
 *
 * Read stroke by stroke off the frames and then confirmed by predicting the
 * repeat: every stroke below was seen twice, eight beats apart, between 2.60
 * and 8.20s. The audio grid also showed a soft reading on the beats written
 * here as rests, but the pad is empty in every frame at those moments, so
 * those are the previous stroke ringing rather than notes.
 */
const QUARTERS: PadGroove = {
  id: 'pad-groove-quarters',
  name: 'Pad Groove — quarters',
  bpm: 150,
  reading: 'frames',
  at: { ...SOURCE, from: 1.86, to: 8.26 },
  phrase: groove(FOUR_FOUR, QUARTER,
    '-  -  x  - | -  -  x  -',
    'x  -  -  x | -  x  -  -'),
  note:
    'Butt of the stick for the bass drum, shoulder of the stick for the snare. ' +
    'The snare falls on beat 3 of both bars; the bass carries the syncopation.',
}

/**
 * “Fill in gaps with 8ths” — the same groove with every empty eighth struck.
 *
 * The rhythm is certain: 1.92 onsets per beat across the section, and 21 of 22
 * gaps measure an eighth. The filling hand is the right, seen striking on the
 * off-eighths at 8.57, 8.77 and 9.17s while the left kept the butt stroke at
 * 9.40s — so the bass keeps the groove and the right hand plays around it.
 */
const EIGHTHS: PadGroove = {
  id: 'pad-groove-eighths',
  name: 'Pad Groove — filled with 8ths',
  bpm: 150,
  reading: 'rhythm',
  at: { ...SOURCE, from: 8.26, to: 14.65 },
  phrase: groove(FOUR_FOUR, EIGHTH,
    '-  x  x  x  x  x  -  x | x  x  -  x  x  x  x  x',
    'x  -  -  -  -  -  x  - | -  -  x  -  -  -  -  -'),
  note:
    'The groove with every remaining eighth filled by the right hand. The bass ' +
    'keeps its three notes; the snare is the filler note that lands on beat 3. ' +
    'The sticking is a rule checked at three strokes rather than read at all ' +
    'sixteen: the right hand was seen filling the off-eighths while the left ' +
    'kept the butt stroke.',
}

/**
 * “or…. 16ths” — the gaps filled again, twice as fast, and one figure kept.
 *
 * Every bar of the section leaves the two sixteenths after the beat-3 snare
 * silent, which is the backbeat being let ring; it is there in all six bars of
 * the grid map, so it is the figure rather than a detector artefact.
 *
 * The hands are a conventional alternation, not a reading. One hand cannot
 * play sixteenths at 150bpm for five bars, so they must alternate; which hand
 * starts, and what happens across the rest, the video does not show.
 */
const SIXTEENTHS: PadGroove = {
  id: 'pad-groove-sixteenths',
  name: 'Pad Groove — filled with 16ths',
  bpm: 150,
  reading: 'rhythm',
  at: { ...SOURCE, from: 14.65, to: 24.24 },
  phrase: groove(FOUR_FOUR, SIXTEENTH,
    'x  -  x  -  x  -  x  -  x  -  -  -  x  -  x  -',
    '-  x  -  x  -  x  -  x  -  -  -  x  -  x  -  x'),
  note:
    'Alternating sixteenths, with the two after the beat-3 backbeat left silent. ' +
    'The sticking is a conventional alternation: at this tempo the strokes are ' +
    'three frames apart and the video cannot show which hand played them.',
}

/**
 * “triple stroke roll” — three strokes a hand, at sextuplet speed.
 *
 * The subdivision is measured rather than assumed: across the section the
 * onset spacing fits a sixteenth-note triplet better than any other division,
 * which is what three strokes a hand at one triple per eighth produces. Only
 * about half the strokes register at all, which is what a roll does — the
 * second and third of each triple are bounces.
 */
const ROLL: PadGroove = {
  id: 'pad-triple-stroke-roll',
  name: 'Pad Groove — triple stroke roll',
  bpm: 150,
  reading: 'rhythm',
  at: { ...SOURCE, from: 24.24, to: 27.44 },
  phrase: groove(FOUR_FOUR, SIXTEENTH_TRIPLET,
    'x x x - - - x x x - - - x x x - - - x x x - - -',
    '- - - x x x - - - x x x - - - x x x - - - x x x'),
  note:
    'Three strokes a hand, one triple to each eighth. The lead hand is the ' +
    'right, which the video does not show; the rudiment fixes everything else.',
}

/**
 * “switch hands” — the sixteenth figure again, led by the other hand.
 *
 * The grid map for these bars has the same shape as the sixteenth section,
 * silence after the beat-3 backbeat included, and the caption says what
 * changed. Mirroring is therefore the whole of the difference.
 */
const SWITCHED: PadGroove = {
  id: 'pad-groove-sixteenths-switched',
  name: 'Pad Groove — 16ths, hands switched',
  bpm: 150,
  reading: 'rhythm',
  at: { ...SOURCE, from: 27.44, to: 33.84 },
  phrase: groove(FOUR_FOUR, SIXTEENTH,
    '-  x  -  x  -  x  -  x  -  -  -  x  -  x  -  x',
    'x  -  x  -  x  -  x  -  x  -  -  -  x  -  x  -'),
  note:
    'The same figure with the lead hand swapped, which puts the bass stick on ' +
    'the beats. Same caveat on the sticking as the section it mirrors.',
}

export const PAD_GROOVES: readonly PadGroove[] = [
  QUARTERS, EIGHTHS, SIXTEENTHS, ROLL, SWITCHED,
]

export const PAD_GROOVES_BY_ID: ReadonlyMap<string, PadGroove> = new Map(
  PAD_GROOVES.map((g) => [g.id, g]),
)
