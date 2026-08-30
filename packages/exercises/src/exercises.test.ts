import { describe, expect, it } from 'vitest'
import {
  CATEGORIES,
  EXERCISES,
  EXERCISES_BY_ID,
  LEVELS,
  exerciseDurationSec,
  exercisesAtLevel,
  exercisesByCategory,
  formatDuration,
  pieceForStep,
  stepDurationSec,
} from './exercises'
import { placedStrokes } from '@paddrummer/core/phrase'

describe('exercise catalogue', () => {
  it('has unique ids', () => {
    expect(EXERCISES_BY_ID.size).toBe(EXERCISES.length)
  })

  it('only references pieces that exist', () => {
    for (const exercise of EXERCISES) {
      for (const step of exercise.steps) {
        expect(() => pieceForStep(step), `${exercise.id}: ${step.pieceId}`).not.toThrow()
      }
    }
  })

  it('never schedules an empty piece', () => {
    for (const exercise of EXERCISES) {
      for (const step of exercise.steps) {
        expect(placedStrokes(pieceForStep(step).phrase).length, step.pieceId).toBeGreaterThan(0)
      }
    }
  })

  it('keeps every tempo inside the range the app offers', () => {
    for (const exercise of EXERCISES) {
      for (const step of exercise.steps) {
        expect(step.bpm, exercise.id).toBeGreaterThanOrEqual(30)
        expect(step.bpm, exercise.id).toBeLessThanOrEqual(240)
      }
    }
  })

  it('asks for at least one repeat of every step', () => {
    for (const exercise of EXERCISES) {
      for (const step of exercise.steps) expect(step.repeats).toBeGreaterThan(0)
    }
  })

  it('is short enough to actually finish', () => {
    for (const exercise of EXERCISES) {
      const seconds = exerciseDurationSec(exercise)
      expect(seconds, exercise.id).toBeGreaterThan(20)
      expect(seconds, exercise.id).toBeLessThan(15 * 60)
    }
  })

  it('gives every exercise a goal worth reading', () => {
    for (const exercise of EXERCISES) {
      expect(exercise.goal.length, exercise.id).toBeGreaterThan(30)
    }
  })
})

describe('levels and categories', () => {
  it('fills every level', () => {
    for (const level of LEVELS) {
      expect(exercisesAtLevel(level).length, level).toBeGreaterThanOrEqual(6)
    }
  })

  it('accounts for every exercise exactly once across the levels', () => {
    const counted = LEVELS.flatMap((level) => exercisesAtLevel(level))
    expect(counted).toHaveLength(EXERCISES.length)
  })

  it('offers independence work at every level, not only the hard end', () => {
    for (const level of LEVELS) {
      const independence = exercisesAtLevel(level).filter((e) => e.category === 'independence')
      expect(independence.length, level).toBeGreaterThan(0)
    }
  })

  it('groups a level into categories without losing or duplicating anything', () => {
    for (const level of LEVELS) {
      const grouped = exercisesByCategory(level).flatMap((group) => group.exercises)
      expect(new Set(grouped).size).toBe(grouped.length)
      expect(grouped).toHaveLength(exercisesAtLevel(level).length)
    }
  })

  it('never emits an empty category heading', () => {
    for (const level of LEVELS) {
      for (const group of exercisesByCategory(level)) {
        expect(group.exercises.length, `${level}/${group.category}`).toBeGreaterThan(0)
      }
    }
  })

  it('lists groups in the catalogue s declared order', () => {
    for (const level of LEVELS) {
      const order = exercisesByCategory(level).map((group) => group.category)
      const expected = CATEGORIES.filter((category) => order.includes(category))
      expect(order).toEqual(expected)
    }
  })
})

describe('independence exercises', () => {
  it('only ever schedules two-line pieces', () => {
    const independence = EXERCISES.filter((e) => e.category === 'independence')
    expect(independence.length).toBeGreaterThan(0)
    for (const exercise of independence) {
      for (const step of exercise.steps) {
        const { phrase } = pieceForStep(step)
        expect(phrase.lines.length, `${exercise.id}: ${step.pieceId}`).toBe(2)
        expect(phrase.meter, step.pieceId).not.toBeNull()
      }
    }
  })

  it('keeps every other category on a single line', () => {
    for (const exercise of EXERCISES) {
      if (exercise.category === 'independence') continue
      for (const step of exercise.steps) {
        expect(pieceForStep(step).phrase.lines.length, exercise.id).toBe(1)
      }
    }
  })
})

describe('stepDurationSec', () => {
  it('halves when the tempo doubles', () => {
    const slow = { pieceId: 'single-paradiddle', bpm: 60, repeats: 4 }
    const fast = { ...slow, bpm: 120 }
    expect(stepDurationSec(slow)).toBeCloseTo(stepDurationSec(fast) * 2, 6)
  })

  it('counts a full cycle, both lead hands included', () => {
    // A paradiddle cycle is RLRR LRLL: two beats, so four repeats at 60bpm
    // is eight seconds.
    expect(stepDurationSec({ pieceId: 'single-paradiddle', bpm: 60, repeats: 4 })).toBeCloseTo(8, 6)
  })

  it('measures a two-line piece by its bar, not by its note count', () => {
    // Three Against Two is one 3/4 bar: three beats, so two repeats at 60bpm
    // is six seconds, whichever hand plays more notes.
    expect(stepDurationSec({ pieceId: 'three-against-two', bpm: 60, repeats: 2 })).toBeCloseTo(6, 6)
  })

  it('rejects a step naming a piece that does not exist', () => {
    expect(() => pieceForStep({ pieceId: 'nope', bpm: 90, repeats: 1 })).toThrow(/Unknown piece/)
  })
})

describe('formatDuration', () => {
  it('reads naturally', () => {
    expect(formatDuration(20)).toBe('under a minute')
    expect(formatDuration(200)).toBe('about 3 min')
  })
})
