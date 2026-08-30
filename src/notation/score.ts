import {
  Annotation,
  Articulation,
  Beam,
  Dot,
  Formatter,
  GraceNote,
  GraceNoteGroup,
  Modifier,
  Renderer,
  Stave,
  StaveNote,
  Stem,
  Tremolo,
  Tuplet,
  Voice,
} from 'vexflow'
import { ZERO, add } from '../domain/fraction'
import { toBeats } from '../domain/duration'
import type { Stroke } from '../domain/pattern'
import {
  type Phrase,
  type PhraseLine,
  isRest,
  meterText,
  placedStrokes,
} from '../domain/phrase'
import { type TupletRatio, toVexDuration } from './vexDuration'

/**
 * Draws a phrase as snare notation.
 *
 * Snare drum has no pitch, so a rudiment sits on one line of a percussion
 * stave and all its stems point the same way. What carries the information is
 * the ornamentation: grace notes for flams and drags, accents above, sticking
 * letters below. All of it comes straight off the domain `Stroke` — this
 * adapter has no rudiment-specific cases in it at all.
 *
 * A two-line phrase is drawn the way drummers write hand independence: two
 * voices on one stave, the right hand on an upper line with stems up and the
 * left on a lower line with stems down, so the eye can follow one hand without
 * losing the other.
 */

/** Where a single-voice rudiment sits: the middle of the stave. */
const PITCH = 'c/5'
/** Two voices need two lines far enough apart to read as separate parts. */
const UPPER_PITCH = 'd/5'
const LOWER_PITCH = 'g/4'

/**
 * Headroom above the top stave line, in stave-line units.
 *
 * VexFlow reserves this itself — `new Stave(x, y, w)` does not put the top
 * line at `y`, it puts it at `y + spaceAboveStaffLn * 10`. The default of 4
 * is more than a snare part needs: nothing goes above the stave here but a
 * stem, an accent and the odd grace note.
 */
const SPACE_ABOVE_LINES = 3
/**
 * Two voices need more. The upper line's notes sit higher, their stems go up
 * from there, and the hand label goes above the stems — with the single-line
 * allowance that label lands at -32 and is clipped away by the root SVG.
 */
const SPACE_ABOVE_LINES_TWO = 5

const STAVE_TOP = 4
/**
 * Tall enough for accents and grace-note stems above the stave and sticking
 * letters below it, and no taller — surplus canvas is invisible whitespace
 * that pushes everything under the stave further down the page. Measured
 * rather than guessed: 4 above + 30 headroom + 40 of stave + room for the
 * sticking letters underneath.
 */
const HEIGHT = 112
/** Two voices hang stems below the stave, which needs room the single line does not. */
const HEIGHT_TWO_LINES = 178
const PADDING = 12

/** Room one note needs before the engraving starts to look cramped. */
const WIDTH_PER_NOTE = 34
/** Extra room per grace note: an ornament is drawn left of its main note. */
const WIDTH_PER_GRACE = 16
/** Clef and the formatter's own left margin. */
const FIXED_WIDTH = 60
/** A time signature takes room the clef alone does not. */
const WIDTH_PER_METER = 28
/**
 * Past this the stave stops looking like music and starts looking like a logo.
 * Callers stacking several staves pass a lower cap, so more of the sheet is
 * legible at once.
 */
const MAX_ZOOM = 1.5

export type RenderedScore = {
  /**
   * One SVG group per stroke, in playing order — the same order
   * `placedStrokes` produces, so index N here is the note the playhead calls N.
   */
  noteElements: (SVGElement | undefined)[]
}

function buildGraceGroup(grace: readonly string[], stemDirection: number): GraceNoteGroup {
  // One grace note is a flam and takes a slash; two are a drag and are beamed
  // together instead, which is how drum notation distinguishes them.
  const isFlam = grace.length === 1
  const notes = grace.map(
    () =>
      new GraceNote({
        keys: [PITCH],
        duration: isFlam ? '8' : '16',
        slash: isFlam,
        stemDirection,
      }),
  )
  const group = new GraceNoteGroup(notes, false)
  if (!isFlam) group.beamNotes()
  return group
}

function buildNote(stroke: Stroke, pitch: string, stemDirection: number): StaveNote {
  const { duration, dots } = toVexDuration(stroke.duration)

  const note = new StaveNote({ keys: [pitch], duration, stemDirection })
  if (dots > 0) Dot.buildAndAttach([note], { all: true })

  if (stroke.grace?.length) note.addModifier(buildGraceGroup(stroke.grace, stemDirection), 0)
  if (stroke.accent) {
    note.addModifier(new Articulation('a>').setPosition(Modifier.Position.ABOVE), 0)
  }
  // A buzz is a pressed stroke: three slashes on the stem, as for a roll.
  if (stroke.buzz) note.addModifier(new Tremolo(3), 0)

  return note
}

function buildRest(durationValue: Stroke['duration'], pitch: string): StaveNote {
  const { duration, dots } = toVexDuration(durationValue)
  const rest = new StaveNote({ keys: [pitch], duration: `${duration}r` })
  if (dots > 0) Dot.buildAndAttach([rest], { all: true })
  return rest
}

/**
 * Collects runs of consecutive bracketed events into tuplets.
 *
 * A run has to be broken when the ratio changes as well as when it ends, or a
 * bar that puts a triplet next to a quintuplet would close the first bracket
 * around notes belonging to the second.
 */
function buildTuplets(line: PhraseLine, tickables: StaveNote[]): Tuplet[] {
  const tuplets: Tuplet[] = []
  let run: StaveNote[] = []
  let ratio: TupletRatio | null = null

  const sameRatio = (a: TupletRatio | null, b: TupletRatio | null): boolean =>
    a !== null && b !== null && a.numNotes === b.numNotes && a.notesOccupied === b.notesOccupied

  line.events.forEach((event, index) => {
    const { tuplet } = toVexDuration(event.duration)
    if (tuplet === null) {
      run = []
      ratio = null
      return
    }
    if (!sameRatio(ratio, tuplet)) {
      run = []
      ratio = tuplet
    }
    run.push(tickables[index]!)
    if (run.length === tuplet.numNotes) {
      tuplets.push(new Tuplet(run, tuplet))
      run = []
      ratio = null
    }
  })

  return tuplets
}

type BuiltLine = {
  voice: Voice
  tickables: StaveNote[]
  tuplets: Tuplet[]
  beams: Beam[]
}

function buildLine(line: PhraseLine, pitch: string, stemDirection: number, label: string | null): BuiltLine {
  const tickables = line.events.map((event) =>
    isRest(event) ? buildRest(event.duration, pitch) : buildNote(event, pitch, stemDirection),
  )

  // On a two-line phrase the hand is carried by which line a note is on, so
  // labelling every note would only repeat what the stave already says. One
  // label at the head of each line names the convention and then gets out of
  // the way.
  if (label !== null) {
    const first = tickables.find((_, i) => !isRest(line.events[i]!))
    first?.addModifier(
      new Annotation(label).setVerticalJustification(
        stemDirection === Stem.UP
          ? Annotation.VerticalJustify.TOP
          : Annotation.VerticalJustify.BOTTOM,
      ),
      0,
    )
  }

  // Order matters, and not obviously. Constructing a Tuplet rewrites its
  // notes' tick values in place (three eighths become 2/3 of an eighth each),
  // but a Voice caches its total the moment tickables are added. Building the
  // voice first leaves it believing a triplet group lasts a beat and a half,
  // and the formatter then spreads that voice over too much of the bar — which
  // is invisible on its own and pulls badly out of line against a second voice.
  const tuplets = buildTuplets(line, tickables)

  // SOFT mode: a rudiment's repeating unit is rarely a whole bar — a single
  // stroke roll is two 16ths — and strict mode would reject it as incomplete.
  const voice = new Voice().setMode(Voice.Mode.SOFT).addTickables(tickables)

  return {
    voice,
    tickables,
    tuplets,
    beams: Beam.generateBeams(tickables, { stemDirection }),
  }
}

/** Every distinct beat at which either line has an event: what sets the width. */
function columnCount(phrase: Phrase): number {
  const starts = new Set<string>()
  for (const line of phrase.lines) {
    let at = ZERO
    for (const event of line.events) {
      starts.add(`${at[0]}/${at[1]}`)
      at = add(at, toBeats(event.duration))
    }
  }
  // Distinct positions, not events: two hands landing together share a column.
  return [...starts].length || 1
}

export function renderScore(
  host: HTMLDivElement,
  phrase: Phrase,
  width: number,
  maxZoom: number = MAX_ZOOM,
): RenderedScore {
  host.replaceChildren()
  const placed = placedStrokes(phrase)
  if (phrase.lines.length === 0 || placed.length === 0) return { noteElements: [] }

  const twoLines = phrase.lines.length > 1
  const height = twoLines ? HEIGHT_TWO_LINES : HEIGHT

  // Scaling the whole context rather than laying out at the full pixel width
  // keeps every proportion VexFlow was designed around — note spacing, beam
  // thickness, the gap between a grace note and its main note — and simply
  // makes them bigger. Formatting to a very wide stave instead would stretch
  // the spacing while leaving the glyphs small.
  //
  // How far it can scale is set by the music, not the container: eight notes
  // can be drawn large in a given column, thirty-four cannot. Below 1x the
  // stave keeps its size and overflows into a horizontal scroll rather than
  // shrinking the notes past readability.
  const graceNotes = placed.reduce((total, { stroke }) => total + (stroke.grace?.length ?? 0), 0)
  const neededWidth =
    PADDING * 2 +
    FIXED_WIDTH +
    (phrase.meter ? WIDTH_PER_METER : 0) +
    columnCount(phrase) * WIDTH_PER_NOTE +
    graceNotes * WIDTH_PER_GRACE
  const zoom = Math.min(maxZoom, Math.max(1, width / neededWidth))
  const logicalWidth = Math.max(neededWidth, width / zoom)

  const renderer = new Renderer(host, Renderer.Backends.SVG)
  renderer.resize(logicalWidth * zoom, height * zoom)
  const context = renderer.getContext()
  context.scale(zoom, zoom)

  const stave = new Stave(PADDING, STAVE_TOP, logicalWidth - PADDING * 2, {
    spaceAboveStaffLn: twoLines ? SPACE_ABOVE_LINES_TWO : SPACE_ABOVE_LINES,
  })
  stave.addClef('percussion')
  if (phrase.meter) stave.addTimeSignature(meterText(phrase.meter))
  stave.setContext(context).draw()

  const built = phrase.lines.map((line, index) => {
    if (!twoLines) return buildLine(line, PITCH, Stem.UP, null)
    const upper = index === 0
    return buildLine(
      line,
      upper ? UPPER_PITCH : LOWER_PITCH,
      upper ? Stem.UP : Stem.DOWN,
      line.hand,
    )
  })

  // On a single line every note is labelled with its hand, because there the
  // sticking is the whole point and nothing else says which hand plays.
  if (!twoLines) {
    const line = phrase.lines[0]!
    built[0]!.tickables.forEach((tickable, index) => {
      const event = line.events[index]!
      if (isRest(event)) return
      tickable.addModifier(
        new Annotation(event.hand).setVerticalJustification(Annotation.VerticalJustify.BOTTOM),
        0,
      )
    })
  }

  const voices = built.map((line) => line.voice)
  new Formatter()
    .joinVoices(voices)
    .format(voices, logicalWidth - PADDING * 2 - 60 - (phrase.meter ? WIDTH_PER_METER : 0))

  for (const line of built) {
    line.voice.draw(context, stave)
    for (const beam of line.beams) beam.setContext(context).draw()
    for (const tuplet of line.tuplets) tuplet.setContext(context).draw()
  }

  // Hand the playhead its notes in playing order. `placedStrokes` already
  // merged and sorted the lines; each entry says which line and which event it
  // came from, which is exactly the coordinate the built tickables are held by.
  const noteElements = placed.map(
    ({ lineIndex, eventIndex }) => built[lineIndex]?.tickables[eventIndex]?.getSVGElement(),
  )

  return { noteElements }
}