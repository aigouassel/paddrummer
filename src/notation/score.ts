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
import type { Stroke } from '../domain/pattern'
import { toVexDuration } from './vexDuration'

/**
 * Draws a rudiment as snare notation.
 *
 * Snare drum has no pitch, so every note sits on the same line of a percussion
 * stave and all stems point the same way. What carries the information is the
 * ornamentation: grace notes for flams and drags, accents above, sticking
 * letters below. All three come straight off the domain `Stroke` — this
 * adapter has no rudiment-specific cases in it at all.
 */

/** The line every snare note sits on. */
const PITCH = 'c/5'

const STAVE_TOP = 30
const HEIGHT = 170
const PADDING = 12

/** Room one note needs before the engraving starts to look cramped. */
const WIDTH_PER_NOTE = 34
/** Extra room per grace note: an ornament is drawn left of its main note. */
const WIDTH_PER_GRACE = 16
/** Clef and the formatter's own left margin. */
const FIXED_WIDTH = 60
/** Past this the stave stops looking like music and starts looking like a logo. */
const MAX_ZOOM = 2.4

export type RenderedScore = {
  /** One SVG group per stroke, indexed to match the input. Drives the playhead. */
  noteElements: (SVGElement | undefined)[]
}

function buildGraceGroup(grace: readonly string[]): GraceNoteGroup {
  // One grace note is a flam and takes a slash; two are a drag and are beamed
  // together instead, which is how drum notation distinguishes them.
  const isFlam = grace.length === 1
  const notes = grace.map(
    () =>
      new GraceNote({
        keys: [PITCH],
        duration: isFlam ? '8' : '16',
        slash: isFlam,
        stemDirection: Stem.UP,
      }),
  )
  const group = new GraceNoteGroup(notes, false)
  if (!isFlam) group.beamNotes()
  return group
}

function buildNote(stroke: Stroke): StaveNote {
  const { duration, dots } = toVexDuration(stroke.duration)

  const note = new StaveNote({ keys: [PITCH], duration, stemDirection: Stem.UP })
  if (dots > 0) Dot.buildAndAttach([note], { all: true })

  if (stroke.grace?.length) note.addModifier(buildGraceGroup(stroke.grace), 0)
  if (stroke.accent) {
    note.addModifier(new Articulation('a>').setPosition(Modifier.Position.ABOVE), 0)
  }
  // A buzz is a pressed stroke: three slashes on the stem, as for a roll.
  if (stroke.buzz) note.addModifier(new Tremolo(3), 0)

  note.addModifier(
    new Annotation(stroke.hand).setVerticalJustification(Annotation.VerticalJustify.BOTTOM),
    0,
  )
  return note
}

/** Collects runs of consecutive triplet notes into tuplet brackets. */
function buildTuplets(strokes: readonly Stroke[], notes: StaveNote[]): Tuplet[] {
  const tuplets: Tuplet[] = []
  let run: StaveNote[] = []

  strokes.forEach((stroke, index) => {
    const { tupletOf } = toVexDuration(stroke.duration)
    if (tupletOf === null) {
      run = []
      return
    }
    run.push(notes[index]!)
    if (run.length === tupletOf) {
      tuplets.push(new Tuplet(run, { numNotes: tupletOf, notesOccupied: 2 }))
      run = []
    }
  })

  return tuplets
}

export function renderScore(
  host: HTMLDivElement,
  strokes: readonly Stroke[],
  width: number,
): RenderedScore {
  host.replaceChildren()
  if (strokes.length === 0) return { noteElements: [] }

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
  const neededWidth =
    PADDING * 2 +
    FIXED_WIDTH +
    strokes.reduce(
      (total, stroke) => total + WIDTH_PER_NOTE + (stroke.grace?.length ?? 0) * WIDTH_PER_GRACE,
      0,
    )
  const zoom = Math.min(MAX_ZOOM, Math.max(1, width / neededWidth))
  const logicalWidth = Math.max(neededWidth, width / zoom)

  const renderer = new Renderer(host, Renderer.Backends.SVG)
  renderer.resize(logicalWidth * zoom, HEIGHT * zoom)
  const context = renderer.getContext()
  context.scale(zoom, zoom)

  const stave = new Stave(PADDING, STAVE_TOP, logicalWidth - PADDING * 2)
  stave.addClef('percussion')
  stave.setContext(context).draw()

  const notes = strokes.map(buildNote)
  const tuplets = buildTuplets(strokes, notes)
  const beams = Beam.generateBeams(notes)

  // SOFT mode: a rudiment's repeating unit is rarely a whole bar — a single
  // stroke roll is two 16ths — and strict mode would reject it as incomplete.
  const voice = new Voice().setMode(Voice.Mode.SOFT).addTickables(notes)
  new Formatter().joinVoices([voice]).format([voice], logicalWidth - PADDING * 2 - 60)

  voice.draw(context, stave)
  for (const beam of beams) beam.setContext(context).draw()
  for (const tuplet of tuplets) tuplet.setContext(context).draw()

  return { noteElements: notes.map((note) => note.getSVGElement()) }
}
