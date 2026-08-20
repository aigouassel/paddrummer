import { toNumber } from './fraction'
import { fullCycle, totalBeats, type Rudiment } from './pattern'
import { RUDIMENTS_BY_ID } from './rudiments'

/**
 * Structured practice routines.
 *
 * A rudiment on its own is a pattern; an exercise is a plan for working on it.
 * Each step pins a rudiment, a tempo and a number of repetitions, which is how
 * rudiments are actually practised — the same four notes at rising tempos, or
 * a family of related patterns back to back so the differences stand out.
 */

export type ExerciseStep = {
  rudimentId: string
  bpm: number
  /** Full cycles of the rudiment before moving on. */
  repeats: number
}

export type Exercise = {
  id: string
  name: string
  /** What the routine is for, in one sentence. */
  goal: string
  steps: readonly ExerciseStep[]
}

const step = (rudimentId: string, bpm: number, repeats = 8): ExerciseStep => ({
  rudimentId,
  bpm,
  repeats,
})

/** The same rudiment at a rising sequence of tempos. */
const ladder = (rudimentId: string, tempos: readonly number[], repeats = 8): ExerciseStep[] =>
  tempos.map((bpm) => step(rudimentId, bpm, repeats))

export const EXERCISES: readonly Exercise[] = [
  {
    id: 'first-four',
    name: 'The First Four',
    goal: 'The four strokes every other rudiment is assembled from: singles, doubles, a paradiddle and a flam.',
    steps: [
      step('single-stroke-roll', 80),
      step('double-stroke-open-roll', 80),
      step('single-paradiddle', 80),
      step('flam', 80, 6),
    ],
  },
  {
    id: 'paradiddle-ladder',
    name: 'Paradiddle Ladder',
    goal: 'One pattern at rising tempos. The point is to find the speed where your accents stop being accents.',
    steps: ladder('single-paradiddle', [60, 80, 100, 120, 140]),
  },
  {
    id: 'open-close-open',
    name: 'Open–Close–Open',
    goal: 'The traditional way to work a roll: slow and open, up to speed, then back down without losing the doubles.',
    steps: ladder('double-stroke-open-roll', [60, 90, 120, 150, 120, 90, 60], 6),
  },
  {
    id: 'diddle-family',
    name: 'The Diddle Family',
    goal: 'All four paradiddles in order, so the growing run of singles before the diddle becomes obvious.',
    steps: [
      step('single-paradiddle', 90),
      step('double-paradiddle', 90),
      step('triple-paradiddle', 90),
      step('single-paradiddle-diddle', 90),
    ],
  },
  {
    id: 'flam-foundations',
    name: 'Flam Foundations',
    goal: 'Four flam rudiments at a slow tempo, where the width of the flam is easy to hear and easy to fix.',
    steps: [
      step('flam', 70, 6),
      step('flam-tap', 70),
      step('flam-accent', 70),
      step('flam-paradiddle', 70),
    ],
  },
  {
    id: 'numbered-rolls',
    name: 'Numbered Rolls',
    goal: 'Five, seven and nine stroke rolls back to back: the same shape with one more double each time.',
    steps: [
      step('five-stroke-roll', 70, 6),
      step('seven-stroke-roll', 70, 6),
      step('nine-stroke-roll', 70, 6),
    ],
  },
]

export const EXERCISES_BY_ID: ReadonlyMap<string, Exercise> = new Map(
  EXERCISES.map((exercise) => [exercise.id, exercise]),
)

export const rudimentForStep = (exerciseStep: ExerciseStep): Rudiment => {
  const rudiment = RUDIMENTS_BY_ID.get(exerciseStep.rudimentId)
  if (!rudiment) throw new Error(`Unknown rudiment: ${exerciseStep.rudimentId}`)
  return rudiment
}

/** Seconds one step takes at its own tempo. */
export function stepDurationSec(exerciseStep: ExerciseStep): number {
  const beats = toNumber(totalBeats(fullCycle(rudimentForStep(exerciseStep))))
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
