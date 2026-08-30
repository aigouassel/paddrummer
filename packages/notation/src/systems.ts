import { ZERO, add, compare, equals, toNumber, type Fraction } from '@paddrummer/core/fraction'
import { toBeats } from '@paddrummer/core/duration'
import { type Phrase, barBeats, isRest } from '@paddrummer/core/phrase'

/**
 * Where the bars fall and how they are spread down the page.
 *
 * All of it is arithmetic on the phrase, with no VexFlow and no DOM in sight,
 * which is the point: `renderScore` needs an `HTMLDivElement` and an SVG
 * backend, so nothing inside it can be tested here. Pulling the layout
 * decisions out leaves `score.ts` doing only what genuinely needs a browser —
 * building glyphs and drawing them — and leaves the part that can be wrong in
 * an interesting way testable.
 *
 * A system is a row of staves, one per bar, not a single stave with barlines
 * drawn inside it. Bar per stave is how VexFlow expects to be driven, and it
 * also means beams and tuplets are built per bar, which is where they belong:
 * neither may cross a barline, and building them over a whole phrase only ever
 * happened to work because nothing was longer than two bars.
 */

/** Room one note needs before the engraving starts to look cramped. */
export const WIDTH_PER_NOTE = 34
/** Extra room per grace note: an ornament is drawn left of its main note. */
export const WIDTH_PER_GRACE = 16
/** Clef and the formatter's own left margin, once per system. */
export const FIXED_WIDTH = 60
/** A time signature takes room the clef alone does not. */
export const WIDTH_PER_METER = 28
export const PADDING = 12

/** The slice of one line's `events` that a bar holds. */
export type BarSlice = { start: number; end: number }

export type Bar = {
  /** One slice per phrase line, in the phrase's own line order. */
  slices: readonly BarSlice[]
  /** Width this bar wants for its notes alone, before any stretching. */
  width: number
  /** Set when a section begins here; printed above the bar. */
  label?: string
}

export type ScorePlan = {
  /** Each entry is one row of staves; each bar in it becomes a stave. */
  systems: readonly (readonly Bar[])[]
  zoom: number
  logicalWidth: number
}

/**
 * Splits every line at the barlines.
 *
 * An event that straddles a barline throws rather than being split into a tie.
 * Ties are not in the model — a `Stroke` is one attack — so a phrase that
 * needs one is a phrase written wrong, and saying so here is far cheaper than
 * discovering it as a bar that silently draws a beat short.
 */
export function splitBars(phrase: Phrase): BarSlice[][] {
  if (!phrase.meter) return phrase.lines.map((line) => [{ start: 0, end: line.events.length }])

  const bar = barBeats(phrase.meter)

  return phrase.lines.map((line, lineIndex) => {
    const slices: BarSlice[] = []
    let start = 0
    let at: Fraction = ZERO
    let edge: Fraction = bar

    line.events.forEach((event, index) => {
      const end = add(at, toBeats(event.duration))
      if (compare(end, edge) > 0) {
        throw new Error(
          `splitBars: line ${lineIndex} has an event crossing the barline at ${edge[0]}/${edge[1]} beats`,
        )
      }
      if (equals(end, edge)) {
        slices.push({ start, end: index + 1 })
        start = index + 1
        edge = add(edge, bar)
      }
      at = end
    })

    // A phrase whose last bar is short — a two-16th rudiment in 4/4 — still
    // has to draw, so whatever is left over is a bar of its own.
    if (start < line.events.length) slices.push({ start, end: line.events.length })
    return slices
  })
}

/** Distinct positions at which a slice has an event: what actually sets width. */
function measure(phrase: Phrase, slices: readonly BarSlice[]): number {
  const starts = new Set<string>()
  let graces = 0

  phrase.lines.forEach((line, lineIndex) => {
    const slice = slices[lineIndex]
    if (!slice) return
    // The offset has to be walked from the line's start, not the slice's: a
    // position is only shared between two hands if it is the same position.
    let at: Fraction = ZERO
    line.events.forEach((event, index) => {
      if (index >= slice.start && index < slice.end) {
        starts.add(`${at[0]}/${at[1]}`)
        if (!isRest(event)) graces += event.grace?.length ?? 0
      }
      at = add(at, toBeats(event.duration))
    })
  })

  // Distinct positions, not events: two hands landing together share a column.
  return (starts.size || 1) * WIDTH_PER_NOTE + graces * WIDTH_PER_GRACE
}

/**
 * Decides how many staves go on a row and how big to draw them.
 *
 * Short phrases keep exactly the behaviour they had before there were systems
 * at all: if the whole thing fits on one row, it is one row, scaled up to fill
 * the column. That is what every existing page relies on — a single stroke
 * roll is two notes and would look absurd drawn at 1x in a wide column — so
 * the multi-system path only opens once the music genuinely will not fit.
 *
 * Past that point the zoom is pinned at 1 and the music wraps instead. Scaling
 * *down* is never the answer: notes shrunk to fit a twenty-bar chart into one
 * row are unreadable, which is the whole reason a chart has rows.
 */
export function planScore(phrase: Phrase, width: number, maxZoom: number): ScorePlan {
  const perLine = splitBars(phrase)
  const barCount = Math.max(...perLine.map((slices) => slices.length), 0)
  if (barCount === 0) return { systems: [], zoom: 1, logicalWidth: width }

  // Sections are given in beats; every bar is a full bar of the same metre, so
  // the bar a section opens is simply how many bars fit before it.
  const barLength = toNumber(barBeats(phrase.meter ?? [4, 4]))
  const labels = new Map<number, string>()
  for (const section of phrase.sections ?? []) {
    const index = toNumber(section.at) / barLength
    if (!Number.isInteger(Math.round(index * 1e6) / 1e6)) {
      throw new Error(`planScore: section "${section.label}" does not start on a barline`)
    }
    labels.set(Math.round(index), section.label)
  }

  const bars: Bar[] = Array.from({ length: barCount }, (_, index) => {
    // A line that ran out of bars contributes an empty slice rather than
    // dropping out, so `slices[lineIndex]` stays a valid coordinate throughout.
    const slices = perLine.map((lineSlices) => lineSlices[index] ?? { start: 0, end: 0 })
    const label = labels.get(index)
    return { slices, width: measure(phrase, slices), ...(label ? { label } : {}) }
  })

  const meterWidth = phrase.meter ? WIDTH_PER_METER : 0
  const overhead = PADDING * 2 + FIXED_WIDTH + meterWidth
  const wholeWidth = overhead + bars.reduce((total, bar) => total + bar.width, 0)

  // A section that opens partway along the row has to wrap even when the music
  // would have fitted, because the row it opens is the point of labelling it.
  const breaks = bars.some((bar, index) => index > 0 && bar.label !== undefined)

  if (wholeWidth <= width && !breaks) {
    const zoom = Math.min(maxZoom, Math.max(1, width / wholeWidth))
    return { systems: [bars], zoom, logicalWidth: Math.max(wholeWidth, width / zoom) }
  }

  const systems: Bar[][] = []
  let row: Bar[] = []
  let used = 0

  for (const bar of bars) {
    // The time signature is printed once, so only the first row pays for it;
    // every row pays for its own clef.
    const budget = width - PADDING * 2 - FIXED_WIDTH - (systems.length === 0 ? meterWidth : 0)
    // A section starts its own row. The label names what the music does from
    // here on, and a label sitting over the third bar of a row reads as
    // belonging to the whole row.
    if (row.length > 0 && (bar.label !== undefined || used + bar.width > budget)) {
      systems.push(row)
      row = []
      used = 0
    }
    row.push(bar)
    used += bar.width
  }
  if (row.length > 0) systems.push(row)

  // A single bar too dense for the column keeps its size and overflows into a
  // horizontal scroll, rather than being squeezed past legibility. Only the
  // first row carries the time signature, so only it pays that width.
  const widest = Math.max(
    ...systems.map(
      (row, index) =>
        PADDING * 2 +
        FIXED_WIDTH +
        (index === 0 ? meterWidth : 0) +
        row.reduce((total, bar) => total + bar.width, 0),
    ),
  )
  return { systems, zoom: 1, logicalWidth: Math.max(width, widest) }
}
