import { type Fraction, ZERO, add, compare, equals, sum, toNumber } from './fraction'
import { type Duration, QUARTER, isFraction, toBeats } from './duration'
import { type Hand, type Stroke, otherHand } from './pattern'

/**
 * A phrase is what actually gets played, drawn and scored.
 *
 * A rudiment is a single stream of alternating strokes, which `Stroke[]`
 * models perfectly. Hand independence is a different shape: the two hands stop
 * taking turns and become two streams running at once, each with its own
 * rhythm — three in one hand against two in the other, or a steady pulse under
 * a moving pattern. That cannot be written as one list, because two strokes
 * can now fall on the same beat.
 *
 * So a phrase holds one *or two* lines. One line is a rudiment and draws the
 * usual way. Two lines draw as two voices on one stave, right hand above with
 * stems up, left below with stems down.
 */

/** A time signature: beats per bar over the note value that gets the beat. */
export type Meter = readonly [beats: number, beatValue: 1 | 2 | 4 | 8 | 16]

/** A bar's length in quarter-note beats. 7/8 is three and a half. */
export const barBeats = (meter: Meter): Fraction => [meter[0] * 4, meter[1]]

export const meterText = (meter: Meter): string => `${meter[0]}/${meter[1]}`

/**
 * A silence occupying a line for some duration.
 *
 * Rests are part of the model rather than being inferred from gaps because
 * notation needs them: two voices on one stave are aligned by their tick
 * positions, so a line whose rests were missing would draw its notes packed
 * together at the start of the bar instead of where they are played.
 */
export type Rest = { rest: true; duration: Duration }

export type LineEvent = Stroke | Rest

export const isRest = (event: LineEvent): event is Rest => 'rest' in event

/** One hand's part: a sequence of strokes and rests, read left to right. */
export type PhraseLine = {
  hand: Hand
  events: readonly LineEvent[]
}

/**
 * A named place in a phrase, printed above the bar it falls on.
 *
 * Only a phrase long enough to lose your place in needs these — a transcribed
 * clip where the player says “or…. 16ths” and the music changes under it. They
 * are rehearsal marks, so they carry no musical meaning: playback, scoring and
 * the model itself ignore them entirely, and only notation reads them.
 */
export type PhraseSection = {
  /** Beats from the start of the phrase. Must fall on a barline. */
  at: Fraction
  label: string
}

export type Phrase = {
  /** null for a rudiment, which is a repeating cell rather than a bar of music. */
  meter: Meter | null
  /** One line for a rudiment, two for hand independence. */
  lines: readonly PhraseLine[]
  /** Length of one cycle, in quarter-note beats. */
  beats: Fraction
  /** Empty or absent on anything short enough to read at a glance. */
  sections?: readonly PhraseSection[]
}

/** A stroke with its position resolved, which is what playback and scoring want. */
export type PlacedStroke = {
  stroke: Stroke
  atBeat: Fraction
  /** Which line it came from: 0 is the upper (right) line, 1 the lower. */
  lineIndex: number
  /** Where in that line's events it sits, rests included. Lets the notation
   * layer map a drawn note back to its position in playing order. */
  eventIndex: number
}

export const lineBeats = (line: PhraseLine): Fraction =>
  sum(line.events.map((event) => toBeats(event.duration)))

const NOTE = /^([rl]*)(>?)x$/

/**
 * Writes one hand's part as a rhythm.
 *
 *   line('R', 'x - x - x - x', 'q')     seven quarters, right hand on 1 3 5 7
 *   line('L', '- x - x - x -', 'q')     the left hand filling the gaps
 *   line('R', 'x x | x x x', '8')       a bar line, ignored, purely for reading
 *
 * `x` is a stroke and `-` a rest, so the two hands of an independence pattern
 * line up column for column in the source. Seeing the desynchronisation in the
 * text is most of what makes these patterns checkable by eye. Accents (`>x`)
 * and grace notes (`lx`) use the same marks as `sticking`.
 */
export function line(
  hand: Hand,
  spec: string,
  duration: Duration | readonly Duration[] = QUARTER,
): PhraseLine {
  const perEvent: readonly Duration[] | null =
    Array.isArray(duration) && !isFraction(duration) ? (duration as readonly Duration[]) : null
  const uniform = perEvent ? null : (duration as Duration)

  const tokens = spec.trim().split(/\s+/).filter((token) => token !== '|')

  const events = tokens.map((token, index): LineEvent => {
    const eventDuration = perEvent ? perEvent[index] : uniform
    if (eventDuration == null) {
      throw new Error(`line: no duration supplied for event ${index} of "${spec}"`)
    }

    if (token === '-') return { rest: true, duration: eventDuration }

    const match = NOTE.exec(token)
    if (!match) throw new Error(`line: cannot parse "${token}" in "${spec}"`)

    const [, graceLetters = '', accentMark = ''] = match
    const stroke: Stroke = { hand, duration: eventDuration }
    // Grace notes conventionally fall on the opposite hand, and in a
    // single-hand line there is no other hand to name, so `l`/`r` here mean
    // "one grace note" and "two", not which hand plays them.
    if (graceLetters) stroke.grace = graceLetters.split('').map(() => otherHand(hand))
    if (accentMark) stroke.accent = true
    return stroke
  })

  return { hand, events }
}

const STICK = /^([rl]*)(>?)(~?)([RL])$/

/**
 * Reads a written-out sticking, rests included, as a single-line phrase.
 *
 * `sticking` in `pattern.ts` covers rudiments, where every slot is struck.
 * Exercise books are not so tidy: a bar can end in a rest, and a roll can be
 * written as one sustained buzz. So this parser adds `-` for a rest and `~`
 * for a buzzed stroke, and takes a duration per slot.
 *
 *   phraseOfSticking('R L R L -', ['8','8','8','8','8'])
 *   phraseOfSticking('R L R L ~R', ['8','8','8','8','h'])
 */
export function phraseOfSticking(
  spec: string,
  duration: Duration | readonly Duration[],
  meter: Meter | null = null,
): Phrase {
  const perSlot: readonly Duration[] | null =
    Array.isArray(duration) && !isFraction(duration) ? (duration as readonly Duration[]) : null
  const uniform = perSlot ? null : (duration as Duration)

  const tokens = spec.trim().split(/\s+/).filter((token) => token !== '|')

  const events = tokens.map((token, index): LineEvent => {
    const slot = perSlot ? perSlot[index] : uniform
    if (slot == null) {
      throw new Error(`phraseOfSticking: no duration for slot ${index} of "${spec}"`)
    }
    if (token === '-') return { rest: true, duration: slot }

    const match = STICK.exec(token)
    if (!match) throw new Error(`phraseOfSticking: cannot parse "${token}" in "${spec}"`)
    const [, graceLetters = '', accent = '', buzz = '', handLetter = 'R'] = match
    const hand = handLetter as Hand

    const stroke: Stroke = { hand, duration: slot }
    if (graceLetters) stroke.grace = graceLetters.split('').map(() => otherHand(hand))
    if (accent) stroke.accent = true
    if (buzz) stroke.buzz = true
    return stroke
  })

  const first = events.find((event) => !isRest(event))
  if (!first) throw new Error(`phraseOfSticking: "${spec}" has no strokes`)

  return {
    meter,
    lines: [{ hand: (first as Stroke).hand, events }],
    beats: sum(events.map((event) => toBeats(event.duration))),
  }
}

/** A rudiment as a phrase: one line, no bar, no rests. */
export const phraseOfStrokes = (strokes: readonly Stroke[]): Phrase => ({
  meter: null,
  lines: strokes.length === 0 ? [] : [{ hand: strokes[0]!.hand, events: strokes }],
  beats: sum(strokes.map((stroke) => toBeats(stroke.duration))),
})

/**
 * Two hands over a bar. Both lines must last exactly as long — an independence
 * pattern where one hand runs out early is a mistake in the pattern, not
 * something to paper over at playback time, so it throws here rather than
 * drifting apart on the tenth repeat.
 */
export function phraseOfLines(meter: Meter, lines: readonly PhraseLine[]): Phrase {
  if (lines.length === 0) throw new Error('phraseOfLines: needs at least one line')

  const beats = lineBeats(lines[0]!)
  lines.forEach((part, index) => {
    const partBeats = lineBeats(part)
    if (!equals(partBeats, beats)) {
      throw new Error(
        `phraseOfLines: line ${index} (${part.hand}) lasts ${toNumber(partBeats)} beats, ` +
          `but line 0 lasts ${toNumber(beats)}`,
      )
    }
  })

  const bar = barBeats(meter)
  const bars = toNumber(beats) / toNumber(bar)
  if (!Number.isInteger(Math.round(bars * 1e6) / 1e6)) {
    throw new Error(
      `phraseOfLines: ${toNumber(beats)} beats is not a whole number of ${meterText(meter)} bars`,
    )
  }

  return { meter, lines, beats }
}

/** One stretch of a longer phrase: what is played, what it is called, how often. */
export type PhrasePart = {
  phrase: Phrase
  /** Printed above the bar this part begins on. */
  label?: string
  /** Times through. The bars are written out, not marked as a repeat. */
  repeat?: number
}

/**
 * Joins stretches of music end to end into one piece.
 *
 * A transcription of a clip is not five exercises, it is one performance that
 * changes character five times, and reading it that way means reading it as a
 * chart: one phrase, played once, from the top. That is what this builds.
 *
 * Every part must agree on the metre and on its lines — same count, same hands
 * in the same order — because concatenating line 0 of one part with line 0 of
 * the next is only meaningful if they are the same voice throughout. And every
 * part must be a whole number of bars, or the part after it would begin in the
 * middle of one and its label would name a bar that does not exist.
 *
 * Repeats are written out rather than marked. A repeat sign says “play this
 * again”; these bars are a record of bars that were actually played, and the
 * count comes from the measured grid, so writing them out is the honest form.
 */
export function phraseOfParts(parts: readonly PhrasePart[]): Phrase {
  if (parts.length === 0) throw new Error('phraseOfParts: needs at least one part')

  const first = parts[0]!.phrase
  const { meter } = first
  if (!meter) throw new Error('phraseOfParts: needs a metre, so the parts can start on barlines')
  const bar = barBeats(meter)

  const hands = first.lines.map((part) => part.hand)
  const events: LineEvent[][] = hands.map(() => [])
  const sections: PhraseSection[] = []
  let at: Fraction = ZERO

  parts.forEach(({ phrase, label, repeat = 1 }, index) => {
    if (!phrase.meter || meterText(phrase.meter) !== meterText(meter)) {
      throw new Error(
        `phraseOfParts: part ${index} is in ` +
          `${phrase.meter ? meterText(phrase.meter) : 'no metre'}, not ${meterText(meter)}`,
      )
    }
    if (phrase.lines.length !== hands.length ||
        phrase.lines.some((part, i) => part.hand !== hands[i])) {
      throw new Error(
        `phraseOfParts: part ${index} has lines ` +
          `${phrase.lines.map((part) => part.hand).join('/')}, not ${hands.join('/')}`,
      )
    }
    const bars = toNumber(phrase.beats) / toNumber(bar)
    if (!Number.isInteger(Math.round(bars * 1e6) / 1e6)) {
      throw new Error(
        `phraseOfParts: part ${index} is ${toNumber(phrase.beats)} beats, ` +
          `not a whole number of ${meterText(meter)} bars`,
      )
    }
    if (repeat < 1 || !Number.isInteger(repeat)) {
      throw new Error(`phraseOfParts: part ${index} cannot be played ${repeat} times`)
    }

    if (label !== undefined) sections.push({ at, label })
    for (let pass = 0; pass < repeat; pass += 1) {
      phrase.lines.forEach((part, i) => events[i]!.push(...part.events))
      at = add(at, phrase.beats)
    }
  })

  return {
    meter,
    lines: hands.map((hand, i) => ({ hand, events: events[i]! })),
    beats: at,
    ...(sections.length > 0 ? { sections } : {}),
  }
}

/**
 * Every stroke in the phrase, in the order it is played.
 *
 * This is the flattening that lets the rest of the app stay ignorant of how
 * many lines a phrase has: the scheduler, the scorer and the playhead all work
 * from this one list. Ties are broken upper line first, so two hands landing
 * together get a stable order rather than one that depends on sort stability.
 */
export function placedStrokes(phrase: Phrase): PlacedStroke[] {
  const placed: PlacedStroke[] = []

  phrase.lines.forEach((part, lineIndex) => {
    let atBeat: Fraction = ZERO
    part.events.forEach((event, eventIndex) => {
      if (!isRest(event)) placed.push({ stroke: event, atBeat, lineIndex, eventIndex })
      atBeat = add(atBeat, toBeats(event.duration))
    })
  })

  return placed.sort((a, b) => compare(a.atBeat, b.atBeat) || a.lineIndex - b.lineIndex)
}

/** Strokes struck, counting grace notes. Not the same as hits aimed at. */
export const phraseNoteCount = (phrase: Phrase): number =>
  placedStrokes(phrase).reduce((n, { stroke }) => n + 1 + (stroke.grace?.length ?? 0), 0)
