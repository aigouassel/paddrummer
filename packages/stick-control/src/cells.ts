import { type Duration } from '@paddrummer/core/duration'
import { type Hand } from '@paddrummer/core/pattern'
import { type Meter, type Phrase, phraseOfSticking } from '@paddrummer/core/phrase'
import { type BookPage, type SourceRef } from './book'
import { lastHand, mirrorSticking, other, repeat, singlesAfter } from './sticking'

// ── the shape pages 24 to 26, 32 and 33 share ───────────────────────
//
// Each of these exercises is one cell played over and over, and a cell is an
// opening pattern followed by a single figure: a run of strokes, or a closed
// roll held out. What varies between the pages is the note values, and whether
// a cell is a whole bar or half of one.
//
// A cell's repeat leads with the hand that follows its last stroke, so the
// repeat is the same sticking when the cell holds an even number of strokes
// and the mirror of it when the count is odd. That is why a block's six lines
// are not the same six on every page: where a cell mirrors itself one line
// already covers both hands, and the page spends the spare line on another
// shape.
//
// The one thing that does not follow is what a rest at the end of a cell does
// to that count, and the pages disagree. Pages 24 to 26 and 32 carry straight
// on from the last stroke as though the rest were not there; page 33 lets the
// rest take the hand it would have struck, and so leads the next cell with the
// other one. Both were read off the page, so a block says which it does.


/** What fills a cell after its opening pattern. */
export type Figure =
  | {
      kind: 'run'
      slot: Duration
      /** Strokes struck; a rest, where there is one, takes the slot after them. */
      strokes: number
      rest: boolean
      tail: (from: string, count: number) => string
    }
  | {
      kind: 'roll'
      slot: Duration
      /** Strokes the page prints under the tremolo, which fixes the parity. */
      strokes: number
      tied: boolean
    }

/** A run of lines sharing one figure — a column, or half of one. */
export type Block = {
  /** The opening patterns, in the order the block prints them. */
  patterns: readonly string[]
  /** The note value the opening pattern is written in. */
  lead: Duration
  figure: Figure
  /** Page 33 only: a closing rest takes the hand it would have struck. */
  restTakesAHand?: boolean
  note?: string
}

/** One cell, and the hand the next one leads with. */
export function cell(pattern: string, block: Block): [spec: string, slots: Duration[], next: Hand] {
  const lead = repeat(block.lead, pattern.split(/\s+/).length)
  const { figure } = block
  if (figure.kind === 'roll') {
    // The roll alternates from its own first stroke, so an odd count of them
    // ends where it began and an even one ends on the other hand.
    const from = singlesAfter(pattern, 1) as Hand
    const ends = figure.strokes % 2 === 1 ? from : other(from)
    return [`${pattern} ~${from}`, [...lead, figure.slot], other(ends)]
  }
  const body = figure.tail(pattern, figure.strokes)
  const counted = block.restTakesAHand && figure.rest ? figure.strokes + 1 : figure.strokes
  return [
    figure.rest ? `${pattern} ${body} -` : `${pattern} ${body}`,
    [...lead, ...repeat(figure.slot, figure.strokes + (figure.rest ? 1 : 0))],
    other(lastHand(figure.tail(pattern, counted))),
  ]
}

/** `count` cells, each the pattern restarted on the hand the last one left. */
export function cellPhrase(pattern: string, block: Block, count: number, meter: Meter): Phrase {
  const specs: string[] = []
  const slots: Duration[] = []
  let current = pattern
  for (let i = 0; i < count; i += 1) {
    const [spec, cellSlots, next] = cell(current, block)
    specs.push(spec)
    slots.push(...cellSlots)
    if (next !== current[0]) current = mirrorSticking(current)
  }
  return phraseOfSticking(specs.join(' '), slots, meter)
}

export type CellPage = {
  page: number
  title: string
  shape: string
  meter: Meter
  /** Cells to a line: two on a page whose cell is a bar, four on page 33. */
  cells: number
  /** The number printed beside the first exercise; a section can run on. */
  first?: number
  columns: number
  lines: number
  blankRows?: readonly number[]
  at: (index: number) => SourceRef
  blocks: readonly Block[]
}

export function cellPage(spec: CellPage): BookPage {
  const first = spec.first ?? 1
  let n = 0
  return {
    page: spec.page,
    title: spec.title,
    shape: spec.shape,
    columns: spec.columns,
    lines: spec.lines,
    ...(spec.blankRows ? { blankRows: spec.blankRows } : {}),
    exercises: spec.blocks.flatMap((block) =>
      block.patterns.map((pattern) => {
        const index = n
        n += 1
        return {
          n: first + index,
          phrase: cellPhrase(pattern, block, spec.cells, spec.meter),
          ...(block.note ? { note: block.note } : {}),
          at: spec.at(index),
        }
      }),
    ),
  }
}
