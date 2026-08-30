import { type Phrase } from '@paddrummer/core/phrase'

/**
 * Exercises transcribed from a practice book, kept page by page.
 *
 * This is transcription, not authorship: the patterns are Stone's, read off
 * photographs of the printed pages, and the page and exercise numbers are
 * carried through so any one of them can be checked against the book it came
 * from. Nothing here is inferred from a rule that was not first verified
 * against the page.
 */

/**
 * Where on the photographed page an exercise was read from.
 *
 * A transcription is only worth as much as its traceability: without this,
 * a wrong sticking is a mystery, and with it you can put the app and the page
 * side by side and see which of the two is wrong.
 */
export type SourceRef = {
  /** The image this came from, named for the page number printed on it. */
  file: string
  /** 0 is the left-hand column of exercises on the page, 1 the right. */
  column: number
  /** 0-based staff line down that column. */
  row: number
  /** Staff lines the exercise occupies; more than one when a mirror follows. */
  rows: number
  /**
   * Columns the line runs across, when a page that is otherwise in two columns
   * gives some of its lines the full width — page 34 does, for the four-bar
   * combinations under its rule. Absent means one, which is nearly always.
   */
  columns?: number
}

export type BookExercise = {
  /** The number printed beside it on the page. */
  n: number
  phrase: Phrase
  /** Anything printed under the exercise, such as a roll's name. */
  note?: string
  at: SourceRef
}

export type BookPage = {
  page: number
  title: string
  /** How one bar is built, in words, since the notation alone can be terse. */
  shape: string
  /** Columns of exercises across the page, and line slots down each. */
  columns: number
  lines: number
  /**
   * Slots down a column that hold no staff. Page 16 rules a line across the
   * page between its two blocks, so its columns are thirteen slots holding
   * twelve exercises each, and a crop of anything below the rule only lands on
   * the right staff if the empty slot is counted.
   */
  blankRows?: readonly number[]
  exercises: readonly BookExercise[]
}

/**
 * Where the photographed pages live, relative to this package. They are
 * committed alongside the transcription, so `my.show-source.py` can crop an
 * exercise's own line out of the page from a clone alone.
 */
export const ASSET_DIR = 'sources/stick-control-for-the-snare-drummer'

export const sourceFile = (page: number): string => `${ASSET_DIR}/page-${page}.HEIC`

/**
 * Position on a page laid out as a plain grid, filled column by column.
 *
 * Every page here but page 9 numbers straight down the left column and then
 * straight down the right, so the position follows from the index.
 */
export const grid =
  (page: number, rowsPerColumn: number) =>
  (index: number): SourceRef => ({
    file: sourceFile(page),
    column: Math.floor(index / rowsPerColumn),
    row: index % rowsPerColumn,
    rows: 1,
  })
