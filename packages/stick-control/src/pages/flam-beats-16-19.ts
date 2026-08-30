import { type Duration } from '@paddrummer/core/duration'
import { type Phrase, phraseOfSticking } from '@paddrummer/core/phrase'
import { type BookPage, type SourceRef, grid, sourceFile } from '../book'
import { TWO_FOUR, flamStroke, repeat } from '../sticking'

// ── pages 16 to 19 — Flam Beats ─────────────────────────────────────
//
// Twenty-four to a page, numbered straight through the section, so page 16
// holds 1–24 and page 19 finishes mid-run at 96.
//
// Page 16's own footnote spells the notation out: `F` is a right hand flam,
// written (L R), and an `F` in a circle is a left hand flam, written (R L).
// They are typed here as `F` and `f`, which lets a bar be written the way the
// page prints it and read back the same way.
//
// The rhythm follows from the letters. Every beat of these pages holds either
// three notes — an eighth and two sixteenths — or four sixteenths, so how many
// letters a beat holds says which, and no rhythm has to be guessed.


/** A beat of three letters is an eighth and two sixteenths; four are equal. */
const flamBeatSlots = (letters: readonly string[]): Duration[] =>
  letters.length === 3 ? ['8', '16', '16'] : repeat('16', letters.length)


/** One line of a flam page, written as its beats, separated by `/`. */
function flamLine(spec: string): Phrase {
  const beats = spec.split('/').map((beat) => beat.trim().split(/\s+/))
  return phraseOfSticking(
    beats.flat().map(flamStroke).join(' '),
    beats.flatMap(flamBeatSlots),
    TWO_FOUR,
  )
}

/**
 * The eighteen bars page 16 prints above the rule, in the order it prints
 * them. Each is one bar of 2/4 — two beats — and each of 1–18 is that bar
 * played twice.
 */
const FLAM_BARS = [
  'F L L / F L L',
  'f R R / f R R',
  'F R R / f L L',
  'F L R / f R L',
  'F R L / F R L',
  'f L R / f L R',
  'F R L / f L R',
  'F L R L / F L R L',
  'f R L R / f R L R',
  'F L R R / f R L L',
  'F R f L / F R f L',
  'F L R L / f R L R',
  'F R L L / F R L L',
  'f L R R / f L R R',
  'F R L R / f L R L',
  'F R L L / f L R R',
  'F L L R / f R R L',
  'F R R R / f L L L',
]

/**
 * From no. 19 the section stops inventing bars and starts combining them:
 * every exercise is one of the eighteen answered by a later one. Only the
 * fourteen that lead with the right hand are combined, taken in the order they
 * are printed, so those fourteen are the alphabet the rest is spelled with.
 */
const FLAM_RIGHT_LINES = [1, 3, 4, 5, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18]
const FLAM_RIGHT = FLAM_RIGHT_LINES.map((n) => FLAM_BARS[n - 1]!)

const MIRROR: Record<string, string> = { F: 'f', f: 'F', R: 'L', L: 'R' }
const mirrorBar = (bar: string): string => bar.replace(/[FfRL]/g, (c) => MIRROR[c]!)

/**
 * At no. 74 the whole run starts again on the other hand. Four of these
 * mirrors are printed as exercises in their own right — 2, 6, 9 and 14 are the
 * mirrors of 1, 5, 8 and 13 — and the other ten appear only here.
 */
const FLAM_LEFT = FLAM_RIGHT.map(mirrorBar)
const FLAM_MIRROR_OF: Record<number, number> = { 1: 2, 5: 6, 8: 9, 13: 14 }

type FlamCombination = { spec: string; note: string }

/** Every ordered pair of the given bars, first bar first, as the pages run. */
function flamCombinations(bars: readonly string[], mirrored: boolean): FlamCombination[] {
  const name = (index: number): string => {
    const line = FLAM_RIGHT_LINES[index]!
    if (!mirrored) return `no. ${line}`
    const printed = FLAM_MIRROR_OF[line]
    return printed ? `no. ${printed}` : `the mirror of no. ${line}`
  }
  const out: FlamCombination[] = []
  for (let i = 0; i < bars.length; i += 1) {
    for (let j = i + 1; j < bars.length; j += 1) {
      out.push({
        spec: `${bars[i]} / ${bars[j]}`,
        note: `${name(i)}'s bar answered by ${name(j)}'s.`,
      })
    }
  }
  return out
}

/**
 * The section as the four photographed pages have it: the eighteen bars, then
 * the right-led combinations as far as no. 73, then the mirrored ones. Both
 * runs are cut where the pages cut them — the book carries on past page 19.
 */
const FLAM_SECTION: readonly FlamCombination[] = [
  ...FLAM_BARS.map((bar) => ({ spec: `${bar} / ${bar}`, note: '' })),
  ...flamCombinations(FLAM_RIGHT, false).slice(0, 55),
  ...flamCombinations(FLAM_LEFT, true).slice(0, 23),
]

/**
 * Page 16 alone breaks its columns: nine lines, a rule across the page, then
 * three more. Counting the rule as a thirteenth slot is what puts a crop of
 * anything below it on the right staff.
 */
const flamAt16 = (index: number): SourceRef => ({
  file: sourceFile(16),
  column: index < 18 ? Math.floor(index / 9) : Math.floor((index - 18) / 3),
  row: index < 18 ? index % 9 : 10 + ((index - 18) % 3),
  rows: 1,
})

function flamPage(page: number, first: number): BookPage {
  const at = page === 16 ? flamAt16 : grid(page, 12)
  return {
    page,
    title: 'Flam Beats',
    shape: 'Two bars of 2/4, a beat at a time, with the flams the page marks.',
    columns: 2,
    lines: page === 16 ? 13 : 12,
    ...(page === 16 ? { blankRows: [9] } : {}),
    exercises: FLAM_SECTION.slice(first - 1, first + 23).map((line, i) => ({
      n: first + i,
      phrase: flamLine(line.spec),
      ...(line.note ? { note: line.note } : {}),
      at: at(i),
    })),
  }
}

export const page16 = flamPage(16, 1)
export const page17 = flamPage(17, 25)
export const page18 = flamPage(18, 49)
export const page19 = flamPage(19, 73)
