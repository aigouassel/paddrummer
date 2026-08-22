import { toNumber } from './fraction'
import { RUDIMENTS_BY_ID } from './rudiments'
import { type Piece, pieceOfRudiment } from './piece'
import { STUDIES_BY_ID } from './studies'

/**
 * Structured practice routines.
 *
 * A piece on its own is a pattern; an exercise is a plan for working on it.
 * Each step pins a piece, a tempo and a number of repetitions, which is how
 * this material is actually practised — the same four notes at rising tempos,
 * or a family of related patterns back to back so the differences stand out.
 *
 * Levels are advisory, not gates. They exist so the list can be narrowed to
 * something you can actually work through today, rather than presenting forty
 * routines and letting you guess.
 */

export type Level = 'beginner' | 'intermediate' | 'advanced'

export const LEVELS: readonly Level[] = ['beginner', 'intermediate', 'advanced']

export const LEVEL_NAMES: Record<Level, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export type ExerciseCategory =
  | 'foundation'
  | 'rolls'
  | 'flams'
  | 'drags'
  | 'accents'
  | 'independence'

/** Display order of the category headings within a level. */
export const CATEGORIES: readonly ExerciseCategory[] = [
  'foundation',
  'rolls',
  'flams',
  'drags',
  'accents',
  'independence',
]

export const CATEGORY_NAMES: Record<ExerciseCategory, string> = {
  foundation: 'Foundations',
  rolls: 'Rolls',
  flams: 'Flams',
  drags: 'Drags',
  accents: 'Accents & Control',
  independence: 'Hand Independence',
}

export type ExerciseStep = {
  /** A rudiment id or a study id — see `pieceForStep`. */
  pieceId: string
  bpm: number
  /** Full cycles of the piece before moving on. */
  repeats: number
}

export type Exercise = {
  id: string
  name: string
  level: Level
  category: ExerciseCategory
  /** What the routine is for, in one sentence. */
  goal: string
  steps: readonly ExerciseStep[]
}

const step = (pieceId: string, bpm: number, repeats = 8): ExerciseStep => ({
  pieceId,
  bpm,
  repeats,
})

/** The same piece at a rising sequence of tempos. */
const ladder = (pieceId: string, tempos: readonly number[], repeats = 8): ExerciseStep[] =>
  tempos.map((bpm) => step(pieceId, bpm, repeats))

/** Several pieces at one tempo, in the order given. */
const suite = (pieceIds: readonly string[], bpm: number, repeats = 8): ExerciseStep[] =>
  pieceIds.map((id) => step(id, bpm, repeats))

export const EXERCISES: readonly Exercise[] = [
  // ── Beginner ──────────────────────────────────────────────────────
  {
    id: 'first-four',
    name: 'The First Four',
    level: 'beginner',
    category: 'foundation',
    goal: 'The four strokes every other rudiment is assembled from: singles, doubles, a paradiddle and a flam.',
    steps: [
      step('single-stroke-roll', 70),
      step('double-stroke-open-roll', 70),
      step('single-paradiddle', 70),
      step('flam', 70, 6),
    ],
  },
  {
    id: 'stick-control',
    name: 'Stick Control',
    level: 'beginner',
    category: 'foundation',
    goal: 'Eights, fours, twos, ones. The notes are trivial; the hand-off between them is the whole exercise.',
    steps: ladder('eights-fours-twos-ones', [60, 72, 84], 4),
  },
  {
    id: 'even-hands',
    name: 'Even Hands',
    level: 'beginner',
    category: 'foundation',
    goal: 'Plain sixteenths, then triplets, so the lead hand has to swap. Any imbalance between your hands shows up here first.',
    steps: [
      step('sixteenth-singles', 70, 6),
      step('triplet-singles', 70, 6),
      step('sixteenth-singles', 85, 6),
      step('triplet-singles', 85, 6),
    ],
  },
  {
    id: 'paradiddle-ladder',
    name: 'Paradiddle Ladder',
    level: 'beginner',
    category: 'foundation',
    goal: 'One pattern at rising tempos. The point is to find the speed where your accents stop being accents.',
    steps: ladder('single-paradiddle', [60, 80, 100, 120, 140]),
  },
  {
    id: 'first-roll',
    name: 'Your First Roll',
    level: 'beginner',
    category: 'rolls',
    goal: 'Doubles slowly enough to hear both notes, then the five stroke roll built from them.',
    steps: [
      step('double-stroke-open-roll', 60, 6),
      step('double-stroke-open-roll', 75, 6),
      step('five-stroke-roll', 60, 6),
      step('five-stroke-roll', 75, 6),
    ],
  },
  {
    id: 'meet-the-flam',
    name: 'Meet the Flam',
    level: 'beginner',
    category: 'flams',
    goal: 'Just the flam, slowly, until the grace note stops sounding like a separate note and starts sounding like a thicker one.',
    steps: ladder('flam', [55, 65, 75, 85], 6),
  },
  {
    id: 'accent-basics',
    name: 'Where Is the Accent?',
    level: 'beginner',
    category: 'accents',
    goal: 'One accent in a run of sixteenths, on beat one. Everything unaccented should be genuinely quiet — that is the hard half.',
    steps: ladder('accent-on-1', [60, 72, 84], 4),
  },
  {
    id: 'hands-apart',
    name: 'Hands Apart',
    level: 'beginner',
    category: 'independence',
    goal: 'Your first two-line reading: the right hand keeps the bar while the left plays only the downbeat.',
    steps: [
      step('hands-apart-3-4', 60, 6),
      step('three-four-lean', 60, 6),
      step('hands-apart-3-4', 75, 6),
      step('three-four-lean', 75, 6),
    ],
  },

  // ── Intermediate ──────────────────────────────────────────────────
  {
    id: 'diddle-family',
    name: 'The Diddle Family',
    level: 'intermediate',
    category: 'foundation',
    goal: 'All four paradiddles in order, so the growing run of singles before the diddle becomes obvious.',
    steps: suite(
      ['single-paradiddle', 'double-paradiddle', 'triple-paradiddle', 'single-paradiddle-diddle'],
      90,
    ),
  },
  {
    id: 'open-close-open',
    name: 'Open–Close–Open',
    level: 'intermediate',
    category: 'rolls',
    goal: 'The traditional way to work a roll: slow and open, up to speed, then back down without losing the doubles.',
    steps: ladder('double-stroke-open-roll', [60, 90, 120, 150, 120, 90, 60], 6),
  },
  {
    id: 'numbered-rolls',
    name: 'Numbered Rolls',
    level: 'intermediate',
    category: 'rolls',
    goal: 'Five, seven and nine stroke rolls back to back: the same shape with one more double each time.',
    steps: suite(['five-stroke-roll', 'seven-stroke-roll', 'nine-stroke-roll'], 75, 6),
  },
  {
    id: 'flam-foundations',
    name: 'Flam Foundations',
    level: 'intermediate',
    category: 'flams',
    goal: 'Four flam rudiments at a slow tempo, where the width of the flam is easy to hear and easy to fix.',
    steps: [
      step('flam', 70, 6),
      step('flam-tap', 70),
      step('flam-accent', 70),
      step('flam-paradiddle', 70),
    ],
  },
  {
    id: 'drag-workshop',
    name: 'Drag Workshop',
    level: 'intermediate',
    category: 'drags',
    goal: 'The drag on its own, then inside a tap. Two grace notes are much easier to rush than one.',
    steps: [
      step('drag', 60, 6),
      step('drag', 75, 6),
      step('single-drag-tap', 60, 6),
      step('single-drag-tap', 75, 6),
    ],
  },
  {
    id: 'accent-round',
    name: 'Accent Round the Bar',
    level: 'intermediate',
    category: 'accents',
    goal: 'The same sixteenths four times, with the accent one note later each pass. The second and fourth are the ones that fight back.',
    steps: suite(['accent-on-1', 'accent-on-2', 'accent-on-3', 'accent-on-4'], 72, 4),
  },
  {
    id: 'offbeat-independence',
    name: 'Never Together',
    level: 'intermediate',
    category: 'independence',
    goal: 'A left hand that lands only between the right hand’s beats, for a whole bar of four.',
    steps: ladder('offbeat-left', [60, 72, 84], 4),
  },
  {
    id: 'three-against-two',
    name: 'Three Against Two',
    level: 'intermediate',
    category: 'independence',
    goal: 'The first real polyrhythm, then the same idea stretched over a bar of four. The hands meet on the downbeat and nowhere else.',
    steps: [
      step('three-against-two', 54, 6),
      step('three-against-two', 66, 6),
      step('triplet-over-straight', 60, 4),
      step('triplet-over-straight', 72, 4),
    ],
  },

  // ── Advanced ──────────────────────────────────────────────────────
  {
    id: 'tempo-pyramid',
    name: 'Tempo Pyramid',
    level: 'advanced',
    category: 'foundation',
    goal: 'A paradiddle from comfortable to uncomfortable and back. Coming down cleanly is harder than going up.',
    steps: ladder('single-paradiddle', [90, 110, 130, 150, 170, 150, 130, 110, 90], 6),
  },
  {
    id: 'roll-pyramid',
    name: 'Roll Pyramid',
    level: 'advanced',
    category: 'rolls',
    goal: 'Five, seven, nine, then back down. Each roll is one double longer, and the turnaround is where they blur.',
    steps: suite(
      [
        'five-stroke-roll', 'seven-stroke-roll', 'nine-stroke-roll',
        'seven-stroke-roll', 'five-stroke-roll',
      ],
      95,
      6,
    ),
  },
  {
    id: 'flam-circuit',
    name: 'Flam Circuit',
    level: 'advanced',
    category: 'flams',
    goal: 'Four flam rudiments at a tempo where there is no time to set the grace note up deliberately.',
    steps: suite(['flam-tap', 'flam-accent', 'flamacue', 'flam-paradiddle'], 105, 6),
  },
  {
    id: 'ratamacue-set',
    name: 'The Ratamacue Set',
    level: 'advanced',
    category: 'drags',
    goal: 'Single, double and triple ratamacue in order. The drag has to stay the same width while the run in front of it grows.',
    steps: suite(['single-ratamacue', 'double-ratamacue', 'triple-ratamacue'], 80, 4),
  },
  {
    id: 'accent-at-speed',
    name: 'Accents at Speed',
    level: 'advanced',
    category: 'accents',
    goal: 'The displaced accents again, fast. At this tempo the unaccented notes are what give you away.',
    steps: suite(['accent-on-2', 'accent-on-4', 'accent-on-3', 'accent-on-1'], 108, 4),
  },
  {
    id: 'four-against-three',
    name: 'Four Against Three',
    level: 'advanced',
    category: 'independence',
    goal: 'Neither hand can be treated as the odd one out. Learn the shape of the bar rather than counting it.',
    steps: ladder('four-against-three', [50, 60, 70], 6),
  },
  {
    id: 'odd-metres',
    name: 'Odd Metres',
    level: 'advanced',
    category: 'independence',
    goal: 'Seven four, then five four, then seven eight. Three bars that all refuse to divide into two.',
    steps: [
      step('seven-four-walk', 66, 4),
      step('five-four-ostinato', 66, 4),
      step('seven-eight-groups', 80, 4),
    ],
  },
  {
    id: 'displacement',
    name: 'Displacement',
    level: 'advanced',
    category: 'independence',
    goal: 'Two-bar left-hand figures over an unchanging pulse: one shifted by an eighth, one a clave. The right hand is your only reference.',
    steps: [
      step('displaced-left', 66, 3),
      step('clave-over-pulse', 66, 3),
      step('displaced-left', 80, 3),
      step('clave-over-pulse', 80, 3),
    ],
  },
]

export const EXERCISES_BY_ID: ReadonlyMap<string, Exercise> = new Map(
  EXERCISES.map((exercise) => [exercise.id, exercise]),
)

export const exercisesAtLevel = (level: Level): Exercise[] =>
  EXERCISES.filter((exercise) => exercise.level === level)

/** Exercises of one level, grouped under their category headings, in order. */
export function exercisesByCategory(
  level: Level,
): { category: ExerciseCategory; exercises: Exercise[] }[] {
  return CATEGORIES.map((category) => ({
    category,
    exercises: exercisesAtLevel(level).filter((exercise) => exercise.category === category),
  })).filter((group) => group.exercises.length > 0)
}

/**
 * Resolves a step to what it asks you to play.
 *
 * Rudiments and studies share one namespace deliberately: an exercise should
 * not have to say which kind of thing it is referring to, and no id belongs to
 * both.
 */
export function pieceForStep(exerciseStep: ExerciseStep): Piece {
  const study = STUDIES_BY_ID.get(exerciseStep.pieceId)
  if (study) return study

  const rudiment = RUDIMENTS_BY_ID.get(exerciseStep.pieceId)
  if (rudiment) return pieceOfRudiment(rudiment)

  throw new Error(`Unknown piece: ${exerciseStep.pieceId}`)
}

/** Seconds one step takes at its own tempo. */
export function stepDurationSec(exerciseStep: ExerciseStep): number {
  const beats = toNumber(pieceForStep(exerciseStep).phrase.beats)
  return (beats * exerciseStep.repeats * 60) / exerciseStep.bpm
}

export const exerciseDurationSec = (exercise: Exercise): number =>
  exercise.steps.reduce((total, s) => total + stepDurationSec(s), 0)

/** Rounded for display: "about 4 min". */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return 'under a minute'
  return `about ${minutes} min`
}
