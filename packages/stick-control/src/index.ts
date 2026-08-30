export { type SourceRef, type BookExercise, type BookPage, ASSET_DIR, sourceFile } from './book'

import type { BookPage } from './book'
import { page9, page10, page11, page12, page13 } from './pages/triplets-9-13'
import { page14, page15 } from './pages/short-rolls-and-triplets-14-15'
import { page16, page17, page18, page19 } from './pages/flam-beats-16-19'
import { page24, page25, page26 } from './pages/six-eight-24-26'
import { page30, page31, page32, page33 } from './pages/combinations-30-33'
import { page34, page35 } from './pages/dotted-notes-34-35'
import { page42 } from './pages/progressions-42'

/**
 * Every transcribed page, in the book's own order rather than the order the
 * files happen to sit in. The gaps are pages that were never photographed.
 */
export const BOOK_PAGES: readonly BookPage[] = [
  page9, page10, page11, page12, page13, page14, page15, page16, page17, page18, page19,
  page24, page25, page26, page30, page31, page32, page33, page34, page35, page42,
]

export const BOOK_PAGES_BY_NUMBER: ReadonlyMap<number, BookPage> = new Map(
  BOOK_PAGES.map((page) => [page.page, page]),
)

export const bookExerciseCount = BOOK_PAGES.reduce((n, p) => n + p.exercises.length, 0)
