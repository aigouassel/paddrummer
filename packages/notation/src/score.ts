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
import type { Stroke } from '@paddrummer/core/pattern'
import {
  type LineEvent,
  type Phrase,
  isRest,
  meterText,
  placedStrokes,
} from '@paddrummer/core/phrase'
import { type TupletRatio, toVexDuration } from './vexDuration'
import { FIXED_WIDTH, PADDING, WIDTH_PER_METER, planScore } from './systems'

/**
 * The narrowest a phrase can be engraved without cramping the notes.
 *
 * Asking the planner for a zero-width column is what makes this exact rather
 * than estimated: every bar wraps to a row of its own, so what comes back is
 * the width of the single most demanding bar — which is the true floor, since
 * no amount of wrapping makes a bar narrower than its own contents.
 *
 * Callers use it to avoid taking room the music cannot give up.
 */
export function minimumScoreWidth(phrase: Phrase, maxZoom: number = MAX_ZOOM): number {
  return planScore(phrase, 0, maxZoom).logicalWidth
}

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
 *
 * Anything long enough to need it is drawn as a chart: `systems.ts` decides
 * where the barlines fall and how many bars go on a row, and each bar becomes
 * its own `Stave`. A rudiment has no metre, so it has no barlines and is still
 * a single stave stretched across the column, exactly as before.
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
/**
 * Room left after a bar's last note, before its barline.
 *
 * The formatter justifies notes across exactly the width it is given, so
 * handing it the whole bar puts the last notehead on the barline and half of
 * it outside the stave. A single stave hid this — it was given the note area
 * and inherited the clef's width as slack — but a row of bars has no such
 * accident to rely on, so the gap is now asked for rather than hoped for.
 */
const BAR_TAIL = 14
/**
 * Extra room above every stave once the phrase carries section labels.
 *
 * Only the row that opens a section prints one, but the allowance is made on
 * all of them: rows of differing height would put the staves at uneven
 * intervals down the page, which is more distracting than the whitespace.
 */
const SECTION_HEADROOM = 32
/**
 * How far above the stave the label sits.
 *
 * Clear of accents and grace stems, and clear of the hand label a two-voice
 * phrase puts over its first note — which is the one thing at this height that
 * is not part of the music.
 */
const SECTION_SHIFT = -24
/**
 * Section labels are set in the page's own font, not VexFlow's.
 *
 * `Stave.setSection` draws through the music font, whose space glyph is
 * narrow enough that "fill in gaps with 8ths" arrives as one long word. These
 * labels are prose — the words a player said — so they are drawn directly with
 * `fillText` and a text font instead.
 */
const SECTION_FONT = 'system-ui, -apple-system, Segoe UI, sans-serif'
const SECTION_FONT_SIZE = 12

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
function buildTuplets(events: readonly LineEvent[], tickables: StaveNote[]): Tuplet[] {
  const tuplets: Tuplet[] = []
  let run: StaveNote[] = []
  let ratio: TupletRatio | null = null

  const sameRatio = (a: TupletRatio | null, b: TupletRatio | null): boolean =>
    a !== null && b !== null && a.numNotes === b.numNotes && a.notesOccupied === b.notesOccupied

  events.forEach((event, index) => {
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

function buildLine(
  events: readonly LineEvent[],
  pitch: string,
  stemDirection: number,
  /** Names the part once, at its head; null on every bar but the first. */
  label: string | null,
  /** Whether each note is stamped with the hand that plays it. */
  perNoteHand: boolean,
): BuiltLine {
  const tickables = events.map((event) =>
    isRest(event) ? buildRest(event.duration, pitch) : buildNote(event, pitch, stemDirection),
  )

  // On a two-line phrase the hand is carried by which line a note is on, so
  // labelling every note would only repeat what the stave already says. One
  // label at the head of each line names the convention and then gets out of
  // the way.
  if (label !== null) {
    const first = tickables.find((_, i) => !isRest(events[i]!))
    first?.addModifier(
      new Annotation(label).setVerticalJustification(
        stemDirection === Stem.UP
          ? Annotation.VerticalJustify.TOP
          : Annotation.VerticalJustify.BOTTOM,
      ),
      0,
    )
  }

  // On a single line every note is labelled, because there the sticking is the
  // whole point and nothing else says which hand plays.
  if (perNoteHand) {
    events.forEach((event, index) => {
      if (isRest(event)) return
      tickables[index]!.addModifier(
        new Annotation(event.hand).setVerticalJustification(Annotation.VerticalJustify.BOTTOM),
        0,
      )
    })
  }

  // Order matters, and not obviously. Constructing a Tuplet rewrites its
  // notes' tick values in place (three eighths become 2/3 of an eighth each),
  // but a Voice caches its total the moment tickables are added. Building the
  // voice first leaves it believing a triplet group lasts a beat and a half,
  // and the formatter then spreads that voice over too much of the bar — which
  // is invisible on its own and pulls badly out of line against a second voice.
  const tuplets = buildTuplets(events, tickables)

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
  const headroom = phrase.sections?.length ? SECTION_HEADROOM : 0
  const systemHeight = (twoLines ? HEIGHT_TWO_LINES : HEIGHT) + headroom

  // Scaling the whole context rather than laying out at the full pixel width
  // keeps every proportion VexFlow was designed around — note spacing, beam
  // thickness, the gap between a grace note and its main note — and simply
  // makes them bigger. Formatting to a very wide stave instead would stretch
  // the spacing while leaving the glyphs small. How far it can scale is set by
  // the music, not the container, and never goes below 1x; `planScore` has the
  // reasoning and the arithmetic.
  const { systems, zoom, logicalWidth } = planScore(phrase, width, maxZoom)

  const renderer = new Renderer(host, Renderer.Backends.SVG)
  renderer.resize(logicalWidth * zoom, systemHeight * systems.length * zoom)
  const context = renderer.getContext()
  context.scale(zoom, zoom)

  // One array per line, indexed by that line's own event index. Bars fill it
  // in as they are built, which leaves the playhead mapping at the end
  // indifferent to how the music was distributed across the page.
  const tickablesByLine: StaveNote[][] = phrase.lines.map(() => [])

  systems.forEach((bars, systemIndex) => {
    const firstSystem = systemIndex === 0
    // The time signature is printed once, at the head of the piece; the clef
    // is repeated at the head of every row, as it is on paper.
    const meterWidth = firstSystem && phrase.meter ? WIDTH_PER_METER : 0
    const notesWidth = logicalWidth - PADDING * 2 - FIXED_WIDTH - meterWidth
    const demand = bars.reduce((total, bar) => total + bar.width, 0) || 1

    let x = PADDING
    const y = STAVE_TOP + headroom + systemIndex * systemHeight

    bars.forEach((bar, barIndex) => {
      const head = barIndex === 0
      const furniture = head ? FIXED_WIDTH + meterWidth : 0
      // Bars share the row in proportion to what they hold, so a bar of
      // sixteenths is not squeezed into the same span as a bar of quarters.
      const staveWidth = furniture + (bar.width / demand) * notesWidth

      const stave = new Stave(x, y, staveWidth, {
        spaceAboveStaffLn: twoLines ? SPACE_ABOVE_LINES_TWO : SPACE_ABOVE_LINES,
      })
      if (head) stave.addClef('percussion')
      if (head && firstSystem && phrase.meter) stave.addTimeSignature(meterText(phrase.meter))
      stave.setContext(context).draw()

      // No box around it: these are the words a player said over the music, not
      // rehearsal letters an ensemble is counting from.
      if (bar.label) {
        context.save()
        context.setFont(SECTION_FONT, SECTION_FONT_SIZE, 'normal')
        context.fillText(bar.label, x + furniture, stave.getYForTopText(1.5) + SECTION_SHIFT)
        context.restore()
      }

      const built = phrase.lines.map((phraseLine, lineIndex) => {
        const slice = bar.slices[lineIndex]!
        const events = phraseLine.events.slice(slice.start, slice.end)
        const line = twoLines
          ? buildLine(
              events,
              lineIndex === 0 ? UPPER_PITCH : LOWER_PITCH,
              lineIndex === 0 ? Stem.UP : Stem.DOWN,
              // The label names a convention, so it belongs at the head of the
              // part and nowhere else.
              firstSystem && head ? phraseLine.hand : null,
              false,
            )
          : buildLine(events, PITCH, Stem.UP, null, true)

        line.tickables.forEach((tickable, i) => {
          tickablesByLine[lineIndex]![slice.start + i] = tickable
        })
        return line
      })

      // A line can run out of bars before another does, and a voice with no
      // tickables in it is one the formatter cannot place.
      const voices = built.filter((line) => line.tickables.length > 0).map((line) => line.voice)
      if (voices.length > 0) {
        new Formatter().joinVoices(voices).format(voices, staveWidth - furniture - BAR_TAIL)
      }

      for (const line of built) {
        if (line.tickables.length === 0) continue
        line.voice.draw(context, stave)
        for (const beam of line.beams) beam.setContext(context).draw()
        for (const tuplet of line.tuplets) tuplet.setContext(context).draw()
      }

      x += staveWidth
    })
  })

  // Hand the playhead its notes in playing order. `placedStrokes` already
  // merged and sorted the lines; each entry says which line and which event it
  // came from, which is exactly the coordinate the built tickables are held by.
  const noteElements = placed.map(
    ({ lineIndex, eventIndex }) => tickablesByLine[lineIndex]?.[eventIndex]?.getSVGElement(),
  )

  return { noteElements }
}
